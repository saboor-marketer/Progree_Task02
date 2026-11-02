import { WeatherError, errorCopy, fetchWeather, resolveProvider, searchPlaces } from "./lib/api";
import type { Place } from "./lib/types";

const london: Place = { id: "london", name: "London", lat: 51.5072, lon: -0.1276 };

// 1. provider resolution
console.log("resolveProvider('')            →", resolveProvider(""));
console.log("resolveProvider('short')       →", resolveProvider("short"));
console.log("resolveProvider('a'.repeat(32))→", resolveProvider("a".repeat(32)));

// 2. OpenWeatherMap with a bogus key must surface a typed, friendly error
try {
  await fetchWeather(london, "openweathermap", "this-key-is-definitely-invalid");
  console.log("FAIL: expected an error");
} catch (err) {
  const e = err as WeatherError;
  console.log("\nbad-key error  →", e instanceof WeatherError, "| code:", e.code, "| status:", e.status);
  console.log("  message:", e.message);
  console.log("  title  :", errorCopy(e.code).title);
  console.log("  hint   :", errorCopy(e.code).hint);
}

// 3. missing key guard
try {
  await fetchWeather(london, "openweathermap", "");
  console.log("FAIL: expected a missing-key error");
} catch (err) {
  console.log("\nmissing-key    →", (err as WeatherError).code, "|", (err as WeatherError).message);
}

// 4. unknown city through the keyless geocoder
const nowhere = await searchPlaces("zzzqqqxxx-not-a-place", "open-meteo", "");
console.log("\nunknown city hits →", nowhere.length);

// 5. cancellation via AbortController
const controller = new AbortController();
controller.abort();
try {
  await fetchWeather(london, "open-meteo", "", controller.signal);
  console.log("FAIL: expected a cancellation");
} catch (err) {
  console.log("aborted request  →", (err as WeatherError).code);
}

console.log("\nERROR_PATHS_OK");
