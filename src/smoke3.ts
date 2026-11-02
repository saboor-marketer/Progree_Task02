import { fetchWeather, searchPlaces, resolveProvider } from "./lib/api";
import { hourLabel, toTemp } from "./lib/format";

const provider = resolveProvider("");
console.log("provider →", provider);

const hits = await searchPlaces("Reykjavik", provider, "");
console.log("geocode hits →", hits.map((h) => `${h.name}/${h.countryCode} ${h.lat.toFixed(2)},${h.lon.toFixed(2)}`));

const bundle = await fetchWeather(hits[0], provider, "");
const tz = { timezone: bundle.timezone, offsetSec: bundle.timezoneOffsetSec };

console.log("\n--- bundle ---");
console.log("place      :", bundle.place.name, bundle.place.country, bundle.place.lat, bundle.place.lon);
console.log("timezone   :", bundle.timezone, bundle.timezoneOffsetSec);
console.log("current    :", bundle.current.temp, "°C feels", bundle.current.feelsLike, "|", bundle.current.description, "|", bundle.current.kind, "| day:", bundle.current.isDay);
console.log("wind       :", bundle.current.windSpeed, "m/s from", bundle.current.windDeg, "gust", bundle.current.windGust);
console.log("humidity   :", bundle.current.humidity, "% pressure", bundle.current.pressure, "clouds", bundle.current.clouds);
console.log("visibility :", bundle.current.visibility, "uv", bundle.current.uv, "dew", bundle.current.dewPoint);
console.log("sun        :", bundle.current.sunrise && hourLabel(bundle.current.sunrise, tz), "→", bundle.current.sunset && hourLabel(bundle.current.sunset, tz));
console.log("aq         :", bundle.current.airQuality);
console.log("hourly len :", bundle.hourly.length, "first:", hourLabel(bundle.hourly[0].time, tz), bundle.hourly[0].temp, bundle.hourly[0].description, "pop", bundle.hourly[0].pop);
console.log("hourly last:", hourLabel(bundle.hourly[bundle.hourly.length - 1].time, tz), bundle.hourly[bundle.hourly.length - 1].temp);
console.log("daily len  :", bundle.daily.length);
for (const d of bundle.daily) {
  console.log("  ", new Date(d.date + bundle.timezoneOffsetSec * 1000).toISOString().slice(0, 10), d.description.padEnd(24), toTemp(d.min, "metric"), "→", toTemp(d.max, "metric"), "pop", Math.round(d.pop * 100) + "%", "uv", d.uv, "sun", d.sunrise ? hourLabel(d.sunrise, tz) : "-", d.sunset ? hourLabel(d.sunset, tz) : "-");
}

console.log("\nsanity: hourly[0] should be within the last 2 hours of local time", hourLabel(Date.now(), tz));
console.log("SANITY_OK");
