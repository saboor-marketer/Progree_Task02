import { useMemo } from "react";
import { hourLabel, isSameLocalDay, tempUnit, toTemp } from "@/lib/format";
import type { Units, WeatherBundle } from "@/lib/types";
import { cn } from "@/utils/cn";
import { WeatherGlyph } from "./icons";
import { Panel } from "./Primitives";

const COL = 78;
const CURVE_H = 96;
const PAD_Y = 20;

function isDaylightHour(shiftedMs: number): boolean {
  const hour = new Date(shiftedMs).getUTCHours();
  return hour >= 6 && hour < 19;
}

interface HourlyStripProps {
  bundle: WeatherBundle;
  units: Units;
}

export function HourlyStrip({ bundle, units }: HourlyStripProps) {
  const points = bundle.hourly.slice(0, 24);
  const tz = { timezone: bundle.timezone, offsetSec: bundle.timezoneOffsetSec };

  const geometry = useMemo(() => {
    const temps = points.map((p) => toTemp(p.temp, units));
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const span = Math.max(1, max - min);
    const width = points.length * COL;

    const coords = temps.map((t, i) => ({
      x: i * COL + COL / 2,
      y: PAD_Y + (1 - (t - min) / span) * (CURVE_H - PAD_Y * 2),
      temp: t,
    }));

    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
    const area = `${line} L${coords[coords.length - 1]?.x ?? 0} ${CURVE_H} L${coords[0]?.x ?? 0} ${CURVE_H} Z`;

    return { coords, line, area, width, min, max, span };
  }, [points, units]);

  if (!points.length) return null;

  const resolution = bundle.provider === "openweathermap" ? "3-hourly" : "hourly";

  return (
    <Panel
      title={`Next ${points.length} hours · ${resolution}`}
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M3 16.5 8 10l4 4.5L21 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      meta={
        <span>
          {Math.round(geometry.min)}° – {Math.round(geometry.max)}° {tempUnit(units)}
        </span>
      }
      bodyClassName="px-0 py-0"
      className="overflow-visible"
    >
      <div className="relative overflow-x-auto">
        <div className="relative" style={{ width: geometry.width }}>
          <svg
            width={geometry.width}
            height={CURVE_H}
            viewBox={`0 0 ${geometry.width} ${CURVE_H}`}
            className="block"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="hourArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((g) => (
              <line
                key={g}
                x1="0"
                x2={geometry.width}
                y1={CURVE_H * g}
                y2={CURVE_H * g}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            ))}

            <path d={geometry.area} fill="url(#hourArea)" opacity="0.85" />
            <path
              d={geometry.line}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="draw-line"
              style={{ ["--dash" as string]: geometry.width * 1.4 }}
            />

            {geometry.coords.map((c, i) => (
              <g key={i}>
                <circle cx={c.x} cy={c.y} r="3" fill="#0b1622" stroke="var(--accent)" strokeWidth="1.6" />
                <text
                  x={c.x}
                  y={c.y - 11}
                  textAnchor="middle"
                  className="fill-white font-mono"
                  style={{ fontSize: 11.5, fontWeight: 500 }}
                >
                  {Math.round(c.temp)}°
                </text>
              </g>
            ))}
          </svg>

          <div
            className="grid border-t border-white/10"
            style={{ gridTemplateColumns: `repeat(${points.length}, ${COL}px)` }}
          >
            {points.map((point, i) => {
              const isNow = i === 0;
              const nextDay = i > 0 && !isSameLocalDay(points[i - 1].time, point.time, tz);
              return (
                <div
                  key={point.time}
                  className={cn(
                    "group/hour relative flex flex-col items-center gap-1.5 px-1 py-3 transition-colors duration-300 hover:bg-white/[0.07]",
                    nextDay && "border-l border-dashed border-white/20",
                  )}
                  title={`${point.description} · feels ${toTemp(point.feelsLike ?? point.temp, units)}${tempUnit(units)} · wind ${Math.round(point.windSpeed ?? 0)} m/s`}
                >
                  {isNow && (
                    <span className="absolute inset-x-1 top-0 h-px bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
                  )}
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-[0.12em]",
                      isNow ? "text-[var(--accent)]" : "text-white/45 group-hover/hour:text-white/75",
                    )}
                  >
                    {isNow ? "now" : hourLabel(point.time, tz)}
                  </span>
                  <WeatherGlyph
                    kind={point.kind}
                    isDay={isDaylightHour(point.time + bundle.timezoneOffsetSec * 1000)}
                    size={26}
                    className="text-white/85 transition-transform duration-300 group-hover/hour:scale-110"
                  />
                  <span className="flex items-end gap-1.5">
                    <span className="flex h-6 w-[3px] items-end overflow-hidden rounded-full bg-white/12">
                      <span
                        className="block w-full rounded-full bg-glacier transition-[height] duration-700"
                        style={{ height: `${Math.max(3, Math.round(point.pop * 100))}%` }}
                      />
                    </span>
                    <span className="pb-0.5 font-mono text-[10px] text-white/55">
                      {point.pop > 0.03 ? `${Math.round(point.pop * 100)}%` : "—"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
        <span>scroll →</span>
        <span>bar = precipitation probability</span>
      </div>
    </Panel>
  );
}
