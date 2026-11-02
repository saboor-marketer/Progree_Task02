import {
  distanceUnit,
  precipUnit,
  pressureUnit,
  tempUnit,
  toDistance,
  toPrecip,
  toPressure,
  toTemp,
} from "@/lib/format";
import { uvCategory } from "@/lib/conditions";
import type { Units, WeatherBundle } from "@/lib/types";
import { ArcGauge } from "./Dials";
import {
  IconCloud,
  IconDroplet,
  IconEye,
  IconGauge,
  IconLeaf,
  IconThermometer,
} from "./icons";
import { Reveal, StatTile } from "./Primitives";

interface DetailsGridProps {
  bundle: WeatherBundle;
  units: Units;
}

const AQI_STOPS = ["#7ee08a", "#f2e26a", "#ff9f45", "#ff6b6b", "#c86bd8", "#a8736b"];
const UV_STOPS = ["#7ee08a", "#f2e26a", "#ff9f45", "#ff6b6b", "#c05bd8"];

export function DetailsGrid({ bundle, units }: DetailsGridProps) {
  const { current } = bundle;
  const aqi = current.airQuality;

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <StatTile
        delay={0}
        label="Humidity"
        icon={<IconDroplet size={15} />}
        value={Math.round(current.humidity)}
        unit="%"
        meter={{ value: current.humidity, tone: "linear-gradient(90deg,#6fd8f5,#4aa8d8)" }}
        footer={
          current.dewPoint !== undefined
            ? `Dew point ${toTemp(current.dewPoint, units)}${tempUnit(units)}`
            : "Relative to current temperature"
        }
      />

      <StatTile
        delay={60}
        label="Pressure"
        icon={<IconGauge size={15} />}
        value={toPressure(current.pressure, units)}
        unit={pressureUnit(units)}
        meter={{ value: current.pressure, max: 1080, tone: "linear-gradient(90deg,#ffb020,#ff7a45)" }}
        footer={
          current.pressure < 1000
            ? "Low — unsettled air mass"
            : current.pressure > 1025
              ? "High — settled conditions"
              : "Near mean sea-level pressure"
        }
      />

      <StatTile
        delay={120}
        label="Visibility"
        icon={<IconEye size={15} />}
        value={current.visibility !== undefined ? toDistance(current.visibility, units) : "—"}
        unit={current.visibility !== undefined ? distanceUnit(units) : undefined}
        meter={{
          value: current.visibility !== undefined ? Math.min(current.visibility, 20000) : 0,
          max: 20000,
          tone: "linear-gradient(90deg,#dff1fb,#8fb6ff)",
        }}
        footer={
          current.visibility === undefined
            ? "Not reported by this provider"
            : current.visibility >= 10000
              ? "Unrestricted · clear air"
              : current.visibility >= 4000
                ? "Moderate · haze or precipitation"
                : "Reduced · take care in transit"
        }
      />

      <StatTile
        delay={180}
        label="Cloud cover"
        icon={<IconCloud size={15} />}
        value={Math.round(current.clouds)}
        unit="%"
        meter={{ value: current.clouds, tone: "linear-gradient(90deg,#c9d6dc,#7d93a3)" }}
        footer={
          current.precip !== undefined && current.precip > 0
            ? `${toPrecip(current.precip, units)} ${precipUnit(units)} in the last hour`
            : current.clouds > 70
              ? "Overcast · no precipitation"
              : "Little or no precipitation"
        }
      />

      <Reveal
        delay={220}
        className="panel corner-ticks relative flex flex-col gap-3 rounded-md p-4 transition-colors duration-500 hover:border-white/25 lg:col-span-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label-mono mb-1.5">UV index</p>
            <p className="font-display text-3xl font-semibold leading-none text-white">
              {current.uv !== undefined ? current.uv.toFixed(1) : "—"}
              <span className="ml-2 font-sans text-[12.5px] font-normal text-white/55">
                {current.uv !== undefined ? uvCategory(current.uv) : "not reported"}
              </span>
            </p>
          </div>
          <div
            className="h-11 w-11 shrink-0 rounded-full"
            style={{
              background:
                current.uv === undefined
                  ? "rgba(255,255,255,0.08)"
                  : `conic-gradient(from 180deg, ${
                      UV_STOPS[Math.min(UV_STOPS.length - 1, Math.floor(current.uv / 2.4))]
                    }, rgba(255,255,255,0.06))`,
              boxShadow: "0 0 26px -6px var(--sky-glow, rgba(255,176,32,0.5))",
            }}
          />
        </div>
        <ArcGauge value={current.uv ?? 0} max={12} stops={UV_STOPS} />
        <p className="text-[12px] leading-snug text-white/55">
          {current.uv === undefined
            ? "This endpoint did not return a UV reading for the current hour."
            : current.uv < 3
              ? "Minimal protection needed — enjoy the outside."
              : current.uv < 6
                ? "Seek shade near midday and wear sunglasses."
                : current.uv < 8
                  ? "SPF 30+, hat and shade between 10:00 and 16:00."
                  : "Unprotected skin burns in minutes. Avoid midday sun."}
        </p>
      </Reveal>

      <Reveal
        delay={280}
        className="panel corner-ticks relative flex flex-col gap-3 rounded-md p-4 transition-colors duration-500 hover:border-white/25 lg:col-span-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label-mono mb-1.5 flex items-center gap-1.5">
              <IconLeaf size={12} /> Air quality
            </p>
            <p className="font-display text-3xl font-semibold leading-none text-white">
              {aqi ? Math.round(aqi.index) : "—"}
              <span className="ml-2 font-sans text-[12.5px] font-normal text-white/55">
                {aqi ? aqi.category : "not reported"}
              </span>
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">US EPA</span>
        </div>
        <ArcGauge value={aqi?.index ?? 0} max={300} stops={AQI_STOPS} />
        <dl className="grid grid-cols-4 gap-2 border-t border-white/10 pt-3 font-mono text-[10.5px]">
          {[
            { k: "PM2.5", v: aqi?.pm25 },
            { k: "PM10", v: aqi?.pm10 },
            { k: "O₃", v: aqi?.ozone },
            { k: "NO₂", v: aqi?.no2 },
          ].map((item) => (
            <div key={item.k}>
              <dt className="text-[9.5px] uppercase tracking-[0.14em] text-white/35">{item.k}</dt>
              <dd className="text-white/85">{item.v !== undefined ? item.v.toFixed(1) : "—"}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal
        delay={320}
        className="relative col-span-2 flex items-center gap-3 overflow-hidden rounded-md border border-white/12 bg-white/[0.04] px-4 py-3 lg:col-span-4"
      >
        <span className="text-[var(--accent)]">
          <IconThermometer size={18} />
        </span>
        <p className="text-[13px] leading-snug text-white/70">
          Apparent temperature{" "}
          <span className="font-semibold text-white">
            {toTemp(current.feelsLike, units)}
            {tempUnit(units)}
          </span>{" "}
          against an ambient{" "}
          <span className="font-semibold text-white">
            {toTemp(current.temp, units)}
            {tempUnit(units)}
          </span>{" "}
          —{" "}
          {Math.abs(current.feelsLike - current.temp) < 1
            ? "wind and humidity are not skewing the reading."
            : current.feelsLike > current.temp
              ? "humidity is trapping heat near the surface."
              : "wind chill is stripping heat from exposed skin."}
        </p>
      </Reveal>
    </div>
  );
}
