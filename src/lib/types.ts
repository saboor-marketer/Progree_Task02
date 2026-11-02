/**
 * Shared domain types for the Isobar weather portal.
 *
 * Every provider (OpenWeatherMap REST, Open-Meteo REST) is normalised into
 * this shape so the UI never has to care where the bytes came from.
 * All values are stored in SI units and converted at render time.
 */

export type Units = "metric" | "imperial";

export type ProviderId = "openweathermap" | "open-meteo";

export interface Place {
  id: string;
  name: string;
  admin?: string;
  country?: string;
  countryCode?: string;
  lat: number;
  lon: number;
}

export type ConditionKind =
  | "clear"
  | "clouds"
  | "drizzle"
  | "rain"
  | "thunder"
  | "snow"
  | "mist"
  | "unknown";

export interface AirQuality {
  /** AQI number on the US EPA scale (0 – 500). */
  index: number;
  category: string;
  pm25?: number;
  pm10?: number;
  ozone?: number;
  no2?: number;
}

export interface CurrentWeather {
  temp: number;
  feelsLike: number;
  tempMin?: number;
  tempMax?: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg?: number;
  windGust?: number;
  clouds: number;
  /** metres */
  visibility?: number;
  uv?: number;
  dewPoint?: number;
  /** mm in the last hour */
  precip?: number;
  description: string;
  kind: ConditionKind;
  isDay: boolean;
  /** epoch ms, in the location's own timezone */
  sunrise?: number;
  sunset?: number;
  airQuality?: AirQuality;
}

export interface HourPoint {
  time: number;
  temp: number;
  feelsLike?: number;
  kind: ConditionKind;
  description: string;
  /** probability of precipitation 0..1 */
  pop: number;
  windSpeed?: number;
  humidity?: number;
}

export interface DayPoint {
  date: number;
  kind: ConditionKind;
  description: string;
  max: number;
  min: number;
  pop: number;
  windSpeed?: number;
  sunrise?: number;
  sunset?: number;
  uv?: number;
  precip?: number;
}

export interface WeatherBundle {
  place: Place;
  current: CurrentWeather;
  hourly: HourPoint[];
  daily: DayPoint[];
  provider: ProviderId;
  timezone: string;
  timezoneOffsetSec: number;
  fetchedAt: number;
}

export interface GeocodeHit extends Place {
  label: string;
}

export type LoadPhase = "idle" | "loading" | "ready" | "error";
