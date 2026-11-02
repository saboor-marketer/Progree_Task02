import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { ApiConsole } from "./components/ApiPanel";
import { CurrentBoard } from "./components/CurrentBoard";
import { DetailsGrid } from "./components/DetailsGrid";
import { ForecastWeek } from "./components/ForecastWeek";
import { HourlyStrip } from "./components/HourlyStrip";
import type { WeatherBundle } from "./lib/types";

const HOUR = 3_600_000;
const now = Date.now();

function makeBundle(provider: "open-meteo" | "openweathermap", rich: boolean): WeatherBundle {
  const kinds = ["clear", "clouds", "rain", "drizzle", "thunder", "snow", "mist", "unknown"] as const;
  return {
    place: {
      id: "x",
      name: "Test City",
      admin: "Testshire",
      country: "Testland",
      countryCode: "TL",
      lat: 51.5,
      lon: -0.12,
    },
    current: {
      temp: 12.4,
      feelsLike: 10.1,
      tempMin: rich ? 8 : undefined,
      tempMax: rich ? 14 : undefined,
      humidity: 71,
      pressure: 1013,
      windSpeed: 5.4,
      windDeg: rich ? 214 : undefined,
      windGust: rich ? 11.2 : undefined,
      clouds: 62,
      visibility: rich ? 9000 : undefined,
      uv: rich ? 4.2 : undefined,
      dewPoint: rich ? 7.1 : undefined,
      precip: rich ? 0.4 : undefined,
      description: "Broken clouds",
      kind: "clouds",
      isDay: true,
      sunrise: now - 5 * HOUR,
      sunset: now + 4 * HOUR,
      airQuality: rich
        ? { index: 58, category: "Moderate", pm25: 12.4, pm10: 18.2, ozone: 62.1, no2: 21.5 }
        : undefined,
    },
    hourly: Array.from({ length: rich ? 24 : 16 }, (_, i) => ({
      time: now + i * HOUR,
      temp: 10 + Math.sin(i / 3) * 6,
      feelsLike: 9 + Math.sin(i / 3) * 6,
      kind: kinds[i % kinds.length],
      description: "Mixed",
      pop: (i % 7) / 8,
      windSpeed: 3 + (i % 5),
      humidity: 60 + (i % 20),
    })),
    daily: Array.from({ length: rich ? 7 : 5 }, (_, i) => ({
      date: now + i * 24 * HOUR,
      kind: kinds[i % kinds.length],
      description: "Varied",
      max: 16 - i * 0.4,
      min: 7 + i * 0.3,
      pop: (i % 5) / 6,
      windSpeed: 4 + i,
      uv: rich ? 3 + i * 0.5 : undefined,
      precip: rich ? i * 0.3 : undefined,
      sunrise: rich ? now + i * 24 * HOUR - 6 * HOUR : undefined,
      sunset: rich ? now + i * 24 * HOUR + 6 * HOUR : undefined,
    })),
    provider,
    timezone: provider === "open-meteo" ? "Europe/London" : "UTC",
    timezoneOffsetSec: provider === "open-meteo" ? 0 : 7200,
    fetchedAt: now,
  };
}

let failures = 0;

function check(name: string, node: React.ReactElement) {
  const html = renderToString(node);
  const problems: string[] = [];
  if (html.includes("NaN")) problems.push("NaN in output");
  if (html.includes("undefined")) problems.push("literal undefined in output");
  if (html.includes("Invalid Date")) problems.push("Invalid Date");
  if (html.length < 500) problems.push(`suspiciously small (${html.length})`);
  if (problems.length) failures += 1;
  console.log(
    `${problems.length ? "FAIL" : "ok  "} ${name.padEnd(26)} ${String(html.length).padStart(6)} bytes`,
    problems.join(" | "),
  );
}

for (const provider of ["open-meteo", "openweathermap"] as const) {
  for (const rich of [true, false]) {
    const bundle = makeBundle(provider, rich);
    const tag = `${provider}/${rich ? "rich" : "sparse"}`;
    check(`${tag} CurrentBoard`, h(CurrentBoard, { bundle, units: "metric" }));
    check(`${tag} HourlyStrip`, h(HourlyStrip, { bundle, units: "metric" }));
    check(`${tag} DetailsGrid`, h(DetailsGrid, { bundle, units: "imperial" }));
    check(`${tag} ForecastWeek`, h(ForecastWeek, { bundle, units: "imperial" }));
  }
}
check("ApiConsole", h(ApiConsole, { latencyMs: 340, requestCount: 2, provider: "open-meteo" }));

console.log(failures === 0 ? "\nALL_COMPONENT_CHECKS_PASSED" : `\n${failures} CHECK(S) FAILED`);
