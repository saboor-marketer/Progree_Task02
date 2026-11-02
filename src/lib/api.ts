import { aqiCategory, fromOwmIcon, fromWmo } from "./conditions";
import type {
  AirQuality,
  ConditionKind,
  CurrentWeather,
  DayPoint,
  GeocodeHit,
  HourPoint,
  Place,
  ProviderId,
  WeatherBundle,
} from "./types";

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export type WeatherErrorCode =
  | "missing-key"
  | "unauthorized"
  | "not-found"
  | "rate-limit"
  | "network"
  | "timeout"
  | "server"
  | "parse"
  | "cancelled"
  | "unknown";

export class WeatherError extends Error {
  code: WeatherErrorCode;
  hint?: string;
  status?: number;

  constructor(code: WeatherErrorCode, message: string, hint?: string, status?: number) {
    super(message);
    this.name = "WeatherError";
    this.code = code;
    this.hint = hint;
    this.status = status;
  }
}

const ERROR_COPY: Record<WeatherErrorCode, { title: string; hint: string }> = {
  "missing-key": {
    title: "No OpenWeatherMap API key supplied",
    hint: "Add a key in the API panel, or keep using the keyless Open-Meteo fallback.",
  },
  unauthorized: {
    title: "The API rejected that key",
    hint: "OpenWeatherMap replied 401. Double-check the key and that the account is verified — new keys can take up to 2 hours to activate.",
  },
  "not-found": {
    title: "We couldn't find that place",
    hint: "Try a different spelling, add a country, or pick one of the suggestions.",
  },
  "rate-limit": {
    title: "Too many requests",
    hint: "The upstream API is throttling this key. Wait a minute and retry.",
  },
  network: {
    title: "Network unreachable",
    hint: "The browser couldn't reach the weather service. Check your connection and retry.",
  },
  timeout: {
    title: "The request timed out",
    hint: "No response after 12 seconds. The service may be slow — retry when ready.",
  },
  server: {
    title: "Upstream service error",
    hint: "The weather provider returned a 5xx response. Nothing to fix on your side — retry shortly.",
  },
  parse: {
    title: "Unexpected response shape",
    hint: "The payload didn't match the documented schema. The provider may have changed its API.",
  },
  cancelled: { title: "Request cancelled", hint: "" },
  unknown: { title: "Something went wrong", hint: "Retry the request." },
};

export function errorCopy(code: WeatherErrorCode) {
  return ERROR_COPY[code] ?? ERROR_COPY.unknown;
}

/* ------------------------------------------------------------------ *
 * Low level fetch helper
 * ------------------------------------------------------------------ */

const TIMEOUT_MS = 12_000;

/* ------------------------- request tracing ------------------------- */

export interface RequestTrace {
  id: number;
  method: "GET";
  host: string;
  path: string;
  startedAt: number;
  durationMs: number | null;
  status: number | null;
  state: "pending" | "ok" | "error";
  detail?: string;
}

type TraceListener = (traces: RequestTrace[]) => void;
const traces: RequestTrace[] = [];
const traceListeners = new Set<TraceListener>();
let traceSeq = 0;

export function subscribeTraces(listener: TraceListener): () => void {
  traceListeners.add(listener);
  listener([...traces]);
  return () => {
    traceListeners.delete(listener);
  };
}

export function clearTraces(): void {
  traces.length = 0;
  broadcast();
}

function broadcast() {
  const snapshot = [...traces];
  traceListeners.forEach((l) => l(snapshot));
}

function beginTrace(url: string): RequestTrace {
  const parsed = new URL(url);
  const trace: RequestTrace = {
    id: ++traceSeq,
    method: "GET",
    host: parsed.host,
    path: parsed.pathname,
    startedAt: Date.now(),
    durationMs: null,
    status: null,
    state: "pending",
  };
  traces.unshift(trace);
  if (traces.length > 14) traces.pop();
  broadcast();
  return trace;
}

function endTrace(
  trace: RequestTrace,
  started: number,
  patch: Partial<Pick<RequestTrace, "status" | "state" | "detail">>,
) {
  trace.durationMs = Math.round(performance.now() - started);
  Object.assign(trace, patch);
  broadcast();
}

async function getJson<T>(url: string, externalSignal?: AbortSignal): Promise<T> {
  // An already-aborted signal never fires its event, so bail out synchronously.
  if (externalSignal?.aborted) throw new WeatherError("cancelled", "Cancelled");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), TIMEOUT_MS);

  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });

  const trace = beginTrace(url);
  const started = performance.now();

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    if (externalSignal?.aborted) {
      endTrace(trace, started, { state: "error", detail: "cancelled" });
      throw new WeatherError("cancelled", "Cancelled");
    }
    const reason = (err as { cause?: Error })?.cause;
    if (reason?.message === "timeout") {
      endTrace(trace, started, { state: "error", detail: "timeout" });
      throw new WeatherError("timeout", "Request timed out");
    }
    endTrace(trace, started, { state: "error", detail: "network" });
    throw new WeatherError("network", "Network request failed");
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }

  endTrace(trace, started, {
    status: response.status,
    state: response.ok ? "ok" : "error",
    detail: response.ok ? undefined : `HTTP ${response.status}`,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string; reason?: string };
      detail = body.message ?? body.reason ?? "";
    } catch {
      /* ignore body parse failures */
    }
    if (response.status === 401 || response.status === 403) {
      throw new WeatherError("unauthorized", detail || "Unauthorized", undefined, response.status);
    }
    if (response.status === 404) {
      throw new WeatherError("not-found", detail || "City not found", undefined, response.status);
    }
    if (response.status === 429) {
      throw new WeatherError("rate-limit", detail || "Rate limited", undefined, response.status);
    }
    if (response.status >= 500) {
      throw new WeatherError("server", detail || "Server error", undefined, response.status);
    }
    throw new WeatherError("unknown", detail || `HTTP ${response.status}`, undefined, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new WeatherError("parse", "Could not parse JSON response");
  }
}

/* ------------------------------------------------------------------ *
 * US EPA Air Quality Index (used to normalise OpenWeatherMap data)
 * ------------------------------------------------------------------ */

type Breakpoint = [number, number, number, number];

const PM25: Breakpoint[] = [
  [0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
];

const PM10: Breakpoint[] = [
  [0, 54, 0, 50],
  [55, 154, 51, 100],
  [155, 254, 101, 150],
  [255, 354, 151, 200],
  [355, 424, 201, 300],
  [425, 604, 301, 500],
];

const NO2: Breakpoint[] = [
  [0, 53, 0, 50],
  [54, 100, 51, 100],
  [101, 360, 101, 150],
  [361, 649, 151, 200],
  [650, 1249, 201, 300],
  [1250, 2049, 301, 500],
];

const O3: Breakpoint[] = [
  [0, 54, 0, 50],
  [55, 70, 51, 100],
  [71, 85, 101, 150],
  [86, 105, 151, 200],
  [106, 200, 201, 300],
];

function subIndex(value: number, table: Breakpoint[]): number | null {
  const band = table.find(([lo, hi]) => value >= lo && value <= hi);
  if (!band) return null;
  const [c_lo, c_hi, i_lo, i_hi] = band;
  return Math.round(((i_hi - i_lo) / (c_hi - c_lo)) * (value - c_lo) + i_lo);
}

/** OpenWeatherMap ships raw pollutant concentrations — turn them into a US AQI. */
export function computeUsAqi(c: {
  pm2_5?: number;
  pm10?: number;
  no2?: number;
  o3?: number;
}): AirQuality | null {
  const scores: number[] = [];
  if (typeof c.pm2_5 === "number") scores.push(subIndex(Math.round(c.pm2_5 * 10) / 10, PM25) ?? 0);
  if (typeof c.pm10 === "number") scores.push(subIndex(Math.round(c.pm10), PM10) ?? 0);
  // µg/m³ → ppb
  if (typeof c.no2 === "number") scores.push(subIndex(Math.round(c.no2 * 0.5314), NO2) ?? 0);
  // µg/m³ → ppb (8-hour ozone scale)
  if (typeof c.o3 === "number") scores.push(subIndex(Math.round(c.o3 * 0.5094), O3) ?? 0);
  if (!scores.length) return null;
  const index = Math.max(...scores);
  return {
    index,
    category: aqiCategory(index),
    pm25: c.pm2_5,
    pm10: c.pm10,
    ozone: c.o3,
    no2: c.no2,
  };
}

/* ------------------------------------------------------------------ *
 * OpenWeatherMap adapter
 * ------------------------------------------------------------------ */

interface OwmCurrent {
  coord: { lat: number; lon: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility?: number;
  wind: { speed: number; deg: number; gust?: number };
  clouds: { all: number };
  dt: number;
  sys: { country?: string; sunrise?: number; sunset?: number };
  timezone: number;
  name: string;
}

interface OwmForecastItem {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: { description: string; icon: string }[];
  clouds: { all: number };
  wind: { speed: number; deg: number; gust?: number };
  visibility?: number;
  pop: number;
  rain?: { "3h"?: number };
  snow?: { "3h"?: number };
  dt_txt: string;
}

interface OwmForecast {
  list: OwmForecastItem[];
  city: { name: string; country?: string; timezone: number; sunrise: number; sunset: number };
}

interface OwmPollution {
  list?: { main: { aqi: number }; components: Record<string, number> }[];
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function fetchOpenWeatherMap(
  place: Place,
  key: string,
  signal?: AbortSignal,
): Promise<WeatherBundle> {
  if (!key) {
    throw new WeatherError("missing-key", "OpenWeatherMap requires an API key");
  }

  const base = "https://api.openweathermap.org/data/2.5";
  const coords = `lat=${place.lat.toFixed(4)}&lon=${place.lon.toFixed(4)}`;

  const [currentRes, forecastRes, pollutionRes] = await Promise.allSettled([
    getJson<OwmCurrent>(`${base}/weather?${coords}&appid=${key}&units=metric`, signal),
    getJson<OwmForecast>(`${base}/forecast?${coords}&appid=${key}&units=metric&cnt=40`, signal),
    getJson<OwmPollution>(`${base}/air_pollution?${coords}&appid=${key}`, signal),
  ]);

  if (currentRes.status === "rejected") throw currentRes.reason;
  if (forecastRes.status === "rejected") throw forecastRes.reason;

  const now = currentRes.value;
  const forecast = forecastRes.value;
  const offsetSec = now.timezone ?? forecast.city.timezone ?? 0;

  const pollution =
    pollutionRes.status === "fulfilled" && pollutionRes.value.list?.[0]
      ? computeUsAqi(pollutionRes.value.list[0].components)
      : null;

  const weather = now.weather?.[0];
  const kind: ConditionKind = fromOwmIcon(weather?.icon ?? "01d");
  const isDay = weather?.icon?.endsWith("d") ?? true;

  const current: CurrentWeather = {
    temp: now.main.temp,
    feelsLike: now.main.feels_like,
    tempMin: now.main.temp_min,
    tempMax: now.main.temp_max,
    humidity: now.main.humidity,
    pressure: now.main.pressure,
    windSpeed: now.wind.speed,
    windDeg: now.wind.deg,
    windGust: now.wind.gust,
    clouds: now.clouds?.all ?? 0,
    visibility: now.visibility,
    description: titleCase(weather?.description ?? "Unknown"),
    kind,
    isDay,
    sunrise: now.sys?.sunrise ? now.sys.sunrise * 1000 : undefined,
    sunset: now.sys?.sunset ? now.sys.sunset * 1000 : undefined,
    airQuality: pollution ?? undefined,
  };

  const hourly: HourPoint[] = (forecast.list ?? []).slice(0, 16).map((item) => ({
    time: item.dt * 1000,
    temp: item.main.temp,
    feelsLike: item.main.feels_like,
    kind: fromOwmIcon(item.weather[0].icon),
    description: titleCase(item.weather[0].description),
    pop: item.pop ?? 0,
    windSpeed: item.wind.speed,
    humidity: item.main.humidity,
  }));

  // Roll the 3-hourly series up into local calendar days.
  const buckets = new Map<string, OwmForecastItem[]>();
  for (const item of forecast.list ?? []) {
    const local = new Date((item.dt + offsetSec) * 1000);
    const keyName = local.toISOString().slice(0, 10);
    const bucket = buckets.get(keyName);
    if (bucket) bucket.push(item);
    else buckets.set(keyName, [item]);
  }

  const daily: DayPoint[] = [...buckets.entries()].slice(0, 6).map(([day, items]) => {
    const noon =
      items.reduce((best, item) => {
        const hour = new Date((item.dt + offsetSec) * 1000).getUTCHours();
        const bestHour = new Date((best.dt + offsetSec) * 1000).getUTCHours();
        return Math.abs(hour - 12) < Math.abs(bestHour - 12) ? item : best;
      }, items[0]) ?? items[0];

    const max = Math.max(...items.map((i) => i.main.temp_max));
    const min = Math.min(...items.map((i) => i.main.temp_min));
    const pop = Math.max(...items.map((i) => i.pop ?? 0));
    const wind = Math.max(...items.map((i) => i.wind.speed ?? 0));
    const precip = items.reduce((sum, i) => sum + (i.rain?.["3h"] ?? 0) + (i.snow?.["3h"] ?? 0), 0);

    return {
      date: Date.parse(`${day}T12:00:00Z`) - offsetSec * 1000,
      kind: fromOwmIcon(noon.weather[0].icon),
      description: titleCase(noon.weather[0].description),
      max,
      min,
      pop,
      windSpeed: wind,
      precip,
      sunrise: items.some((i) => i.dt === forecast.city.sunrise) ? forecast.city.sunrise * 1000 : undefined,
      sunset: items.some((i) => i.dt === forecast.city.sunset) ? forecast.city.sunset * 1000 : undefined,
    };
  });

  // Today's sunrise / sunset always come from the current-conditions call.
  if (daily[0]) {
    daily[0].sunrise = current.sunrise;
    daily[0].sunset = current.sunset;
  }

  return {
    place: {
      ...place,
      name: now.name || place.name,
      country: now.sys?.country ?? place.country,
      countryCode: now.sys?.country ?? place.countryCode,
      lat: now.coord?.lat ?? place.lat,
      lon: now.coord?.lon ?? place.lon,
    },
    current,
    hourly,
    daily,
    provider: "openweathermap",
    timezone: "UTC",
    timezoneOffsetSec: offsetSec,
    fetchedAt: (now.dt ?? Date.now() / 1000) * 1000,
  };
}

/* ------------------------------------------------------------------ *
 * Open-Meteo adapter (keyless fallback + verification harness)
 * ------------------------------------------------------------------ */

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    visibility: (number | null)[];
    uv_index: (number | null)[];
    dew_point_2m: (number | null)[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: (number | null)[];
    precipitation_probability_max: (number | null)[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
}

interface OpenMeteoAir {
  current?: {
    us_aqi: number | null;
    pm2_5: number | null;
    pm10: number | null;
    ozone: number | null;
    nitrogen_dioxide: number | null;
  };
}

/** Open-Meteo returns wall-clock ISO strings in the location's timezone. */
function parseWallClock(iso: string, offsetSec: number): number {
  const withSeconds = iso.length === 16 ? `${iso}:00` : iso;
  return Date.parse(`${withSeconds}Z`) - offsetSec * 1000;
}

async function fetchOpenMeteo(place: Place, signal?: AbortSignal): Promise<WeatherBundle> {
  const coords = `latitude=${place.lat.toFixed(4)}&longitude=${place.lon.toFixed(4)}`;
  const currentVars = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "is_day",
    "precipitation",
    "weather_code",
    "cloud_cover",
    "pressure_msl",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
  ].join(",");
  const hourlyVars = [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "precipitation_probability",
    "weather_code",
    "wind_speed_10m",
    "visibility",
    "uv_index",
    "dew_point_2m",
  ].join(",");
  const dailyVars = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "sunrise",
    "sunset",
    "uv_index_max",
    "precipitation_probability_max",
    "precipitation_sum",
    "wind_speed_10m_max",
  ].join(",");

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?${coords}` +
    `&current=${currentVars}&hourly=${hourlyVars}&daily=${dailyVars}` +
    `&wind_speed_unit=ms&timezone=auto&forecast_days=8`;

  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${coords}&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide&timezone=auto`;

  const [forecastRes, airRes] = await Promise.allSettled([
    getJson<OpenMeteoResponse>(forecastUrl, signal),
    getJson<OpenMeteoAir>(airUrl, signal),
  ]);

  if (forecastRes.status === "rejected") throw forecastRes.reason;
  const data = forecastRes.value;
  if (!data.current || !data.hourly || !data.daily) {
    throw new WeatherError("parse", "Open-Meteo response was missing expected blocks");
  }

  const offsetSec = data.utc_offset_seconds ?? 0;
  const hourly = data.hourly;

  // `current.time` is a 15-minute stamp while `hourly.time` is on the hour, so
  // walk the series and take the last slot that is not in the future.
  const nowMs = parseWallClock(data.current.time, offsetSec);
  let nowIndex = 0;
  for (let i = 0; i < hourly.time.length; i += 1) {
    if (parseWallClock(hourly.time[i], offsetSec) <= nowMs) nowIndex = i;
    else break;
  }

  let airQuality: AirQuality | undefined;
  if (airRes.status === "fulfilled") {
    const c = airRes.value.current;
    if (c && typeof c.us_aqi === "number") {
      airQuality = {
        index: c.us_aqi,
        category: aqiCategory(c.us_aqi),
        pm25: c.pm2_5 ?? undefined,
        pm10: c.pm10 ?? undefined,
        ozone: c.ozone ?? undefined,
        no2: c.nitrogen_dioxide ?? undefined,
      };
    } else if (c) {
      const computed = computeUsAqi({
        pm2_5: c.pm2_5 ?? undefined,
        pm10: c.pm10 ?? undefined,
        o3: c.ozone ?? undefined,
        no2: c.nitrogen_dioxide ?? undefined,
      });
      if (computed) airQuality = computed;
    }
  }

  const code = fromWmo(data.current.weather_code);
  const sunriseToday = data.daily.sunrise?.[0];
  const sunsetToday = data.daily.sunset?.[0];

  const current: CurrentWeather = {
    temp: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    tempMin: data.daily.temperature_2m_min?.[0],
    tempMax: data.daily.temperature_2m_max?.[0],
    humidity: data.current.relative_humidity_2m,
    pressure: data.current.pressure_msl,
    windSpeed: data.current.wind_speed_10m,
    windDeg: data.current.wind_direction_10m,
    windGust: data.current.wind_gusts_10m,
    clouds: data.current.cloud_cover,
    visibility: hourly.visibility?.[nowIndex] ?? undefined,
    uv: hourly.uv_index?.[nowIndex] ?? data.daily.uv_index_max?.[0] ?? undefined,
    dewPoint: hourly.dew_point_2m?.[nowIndex] ?? undefined,
    precip: data.current.precipitation,
    description: code.label,
    kind: code.kind,
    isDay: data.current.is_day === 1,
    sunrise: sunriseToday ? parseWallClock(sunriseToday, offsetSec) : undefined,
    sunset: sunsetToday ? parseWallClock(sunsetToday, offsetSec) : undefined,
    airQuality,
  };

  const hourlyPoints: HourPoint[] = hourly.time
    .slice(nowIndex, nowIndex + 24)
    .map((iso, i) => {
      const idx = nowIndex + i;
      const meta = fromWmo(hourly.weather_code[idx]);
      return {
        time: parseWallClock(iso, offsetSec),
        temp: hourly.temperature_2m[idx],
        feelsLike: hourly.apparent_temperature[idx],
        kind: meta.kind,
        description: meta.label,
        pop: (hourly.precipitation_probability?.[idx] ?? 0) / 100,
        windSpeed: hourly.wind_speed_10m[idx],
        humidity: hourly.relative_humidity_2m[idx],
      };
    });

  const daily: DayPoint[] = data.daily.time.slice(0, 7).map((iso, i) => {
    const meta = fromWmo(data.daily!.weather_code[i]);
    return {
      date: Date.parse(`${iso}T12:00:00Z`) - offsetSec * 1000,
      kind: meta.kind,
      description: meta.label,
      max: data.daily!.temperature_2m_max[i],
      min: data.daily!.temperature_2m_min[i],
      pop: (data.daily!.precipitation_probability_max?.[i] ?? 0) / 100,
      windSpeed: data.daily!.wind_speed_10m_max?.[i],
      precip: data.daily!.precipitation_sum?.[i],
      uv: data.daily!.uv_index_max?.[i] ?? undefined,
      sunrise: data.daily!.sunrise?.[i]
        ? parseWallClock(data.daily!.sunrise[i], offsetSec)
        : undefined,
      sunset: data.daily!.sunset?.[i]
        ? parseWallClock(data.daily!.sunset[i], offsetSec)
        : undefined,
    };
  });

  return {
    place: {
      ...place,
      lat: data.latitude ?? place.lat,
      lon: data.longitude ?? place.lon,
    },
    current,
    hourly: hourlyPoints,
    daily,
    provider: "open-meteo",
    timezone: data.timezone,
    timezoneOffsetSec: offsetSec,
    fetchedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

export function resolveProvider(key: string | null | undefined): ProviderId {
  return key && key.trim().length > 8 ? "openweathermap" : "open-meteo";
}

export async function fetchWeather(
  place: Place,
  provider: ProviderId,
  key: string,
  signal?: AbortSignal,
): Promise<WeatherBundle> {
  return provider === "openweathermap"
    ? fetchOpenWeatherMap(place, key.trim(), signal)
    : fetchOpenMeteo(place, signal);
}

interface OwmGeoHit {
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country?: string;
  state?: string;
}

interface OpenMeteoGeoResponse {
  results?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
    timezone?: string;
    population?: number;
  }[];
}

function decorate(hit: Omit<GeocodeHit, "label">): GeocodeHit {
  const parts = [hit.name, hit.admin, hit.country].filter(Boolean);
  return { ...hit, label: parts.join(" · ") };
}

export async function searchPlaces(
  query: string,
  provider: ProviderId,
  key: string,
  signal?: AbortSignal,
): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (provider === "openweathermap") {
    if (!key) throw new WeatherError("missing-key", "OpenWeatherMap geocoding requires an API key");
    const data = await getJson<OwmGeoHit[]>(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=6&appid=${key.trim()}`,
      signal,
    );
    return (data ?? []).map((hit, i) =>
      decorate({
        id: `owm-${hit.lat.toFixed(2)}-${hit.lon.toFixed(2)}-${i}`,
        name: hit.name,
        admin: hit.state,
        country: hit.country,
        countryCode: hit.country,
        lat: hit.lat,
        lon: hit.lon,
      }),
    );
  }

  const data = await getJson<OpenMeteoGeoResponse>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
    signal,
  );
  return (data.results ?? []).map((hit) =>
    decorate({
      id: `om-${hit.id}`,
      name: hit.name,
      admin: hit.admin1,
      country: hit.country,
      countryCode: hit.country_code,
      lat: hit.latitude,
      lon: hit.longitude,
    }),
  );
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  provider: ProviderId,
  key: string,
  signal?: AbortSignal,
): Promise<Place> {
  const fallback: Place = {
    id: `geo-${lat.toFixed(3)}-${lon.toFixed(3)}`,
    name: "Current position",
    lat,
    lon,
  };

  if (provider === "openweathermap") {
    if (!key) return fallback;
    try {
      const data = await getJson<OwmGeoHit[]>(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${key.trim()}`,
        signal,
      );
      const hit = data?.[0];
      if (!hit) return fallback;
      return {
        ...fallback,
        name: hit.local_names?.en ?? hit.name,
        country: hit.country,
        countryCode: hit.country,
      };
    } catch {
      return fallback;
    }
  }

  try {
    // Keyless reverse geocoder — Open-Meteo only offers forward search.
    const data = await getJson<{
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
      countryCode?: string;
    }>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      signal,
    );
    const name = data.city || data.locality || data.principalSubdivision;
    if (!name) return fallback;
    return {
      ...fallback,
      name,
      admin: data.principalSubdivision,
      country: data.countryName,
      countryCode: data.countryCode,
    };
  } catch {
    return fallback;
  }
}

export const CURATED_PLACES: Place[] = [
  { id: "london", name: "London", admin: "England", country: "United Kingdom", countryCode: "GB", lat: 51.5072, lon: -0.1276 },
  { id: "tokyo", name: "Tokyo", admin: "Kantō", country: "Japan", countryCode: "JP", lat: 35.6895, lon: 139.6917 },
  { id: "new-york", name: "New York", admin: "New York", country: "United States", countryCode: "US", lat: 40.7128, lon: -74.006 },
  { id: "reykjavik", name: "Reykjavík", admin: "Capital Region", country: "Iceland", countryCode: "IS", lat: 64.1466, lon: -21.9426 },
  { id: "nairobi", name: "Nairobi", country: "Kenya", countryCode: "KE", lat: -1.2921, lon: 36.8219 },
  { id: "sydney", name: "Sydney", admin: "New South Wales", country: "Australia", countryCode: "AU", lat: -33.8688, lon: 151.2093 },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", countryCode: "AE", lat: 25.2048, lon: 55.2708 },
  { id: "oslo", name: "Oslo", country: "Norway", countryCode: "NO", lat: 59.9139, lon: 10.7522 },
];
