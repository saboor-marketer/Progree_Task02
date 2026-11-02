import { useMemo, useState } from "react";
import {
  dateLabel,
  dayLabel,
  hourLabel,
  speedUnit,
  tempUnit,
  toSpeed,
  toTemp,
} from "@/lib/format";
import { uvCategory } from "@/lib/conditions";
import type { Units, WeatherBundle } from "@/lib/types";
import { cn } from "@/utils/cn";
import { IconArrowRight, IconDroplet, IconWind, WeatherGlyph } from "./icons";
import { Panel } from "./Primitives";

interface ForecastWeekProps {
  bundle: WeatherBundle;
  units: Units;
}

export function ForecastWeek({ bundle, units }: ForecastWeekProps) {
  const tz = { timezone: bundle.timezone, offsetSec: bundle.timezoneOffsetSec };
  const days = bundle.daily;
  const [hovered, setHovered] = useState<number | null>(null);

  const range = useMemo(() => {
    const mins = days.map((d) => toTemp(d.min, units));
    const maxs = days.map((d) => toTemp(d.max, units));
    const low = Math.min(...mins);
    const high = Math.max(...maxs);
    return { low, high, span: Math.max(1, high - low) };
  }, [days, units]);

  if (!days.length) return null;

  return (
    <Panel
      title={`${days.length}-day outlook`}
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3.2" y="5" width="17.6" height="15.4" rx="2" />
          <path d="M3.2 9.8h17.6M8 3.2v3.4M16 3.2v3.4" strokeLinecap="round" />
        </svg>
      }
      meta={`scale ${Math.round(range.low)}° – ${Math.round(range.high)}° ${tempUnit(units)}`}
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-white/8">
        {days.map((day, index) => {
          const min = toTemp(day.min, units);
          const max = toTemp(day.max, units);
          const left = ((min - range.low) / range.span) * 100;
          const width = ((max - min) / range.span) * 100;
          const isToday = index === 0;
          const active = hovered === index;

          return (
            <li
              key={day.date}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "group/day relative grid grid-cols-[auto_auto_1fr] items-center gap-3 px-4 py-3 transition-colors duration-300 sm:px-5",
                "sm:grid-cols-[7.5rem_2.5rem_minmax(0,1fr)_minmax(9rem,1.4fr)_7.5rem]",
                active && "bg-white/[0.06]",
              )}
            >
              <span
                className="absolute left-0 top-0 h-full w-[2px] origin-top scale-y-0 bg-[var(--accent)] transition-transform duration-300 group-hover/day:scale-y-100"
                aria-hidden="true"
              />

              <div className="min-w-0">
                <span
                  className={cn(
                    "block font-display text-[15px] font-semibold leading-tight",
                    isToday ? "text-[var(--accent)]" : "text-white",
                  )}
                >
                  {isToday ? "Today" : dayLabel(day.date, tz)}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">
                  {dateLabel(day.date, tz)}
                </span>
              </div>

              <WeatherGlyph
                kind={day.kind}
                isDay
                size={30}
                className={cn(
                  "shrink-0 text-white/80 transition-transform duration-500",
                  active && "scale-110 text-white",
                )}
              />

              <div className="min-w-0">
                <p className="truncate text-[13.5px] text-white/80">{day.description}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10.5px] text-white/45">
                  <span className="flex items-center gap-1">
                    <IconDroplet size={11} className="text-glacier" />
                    {Math.round(day.pop * 100)}%
                  </span>
                  {day.windSpeed !== undefined && (
                    <span className="flex items-center gap-1">
                      <IconWind size={11} />
                      {toSpeed(day.windSpeed, units)} {speedUnit(units)}
                    </span>
                  )}
                  {day.uv !== undefined && <span>UV {Math.round(day.uv)} · {uvCategory(day.uv)}</span>}
                  {day.sunrise && day.sunset && (
                    <span className="hidden xl:inline">
                      {hourLabel(day.sunrise, tz)} → {hourLabel(day.sunset, tz)}
                    </span>
                  )}
                </p>
              </div>

              <div className="relative hidden h-6 items-center sm:flex">
                <span className="absolute inset-x-0 h-1 rounded-full bg-white/10" />
                <span
                  className="absolute h-1 rounded-full transition-all duration-700 ease-out"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(width, 3)}%`,
                    background: "linear-gradient(90deg, #6fd8f5, var(--accent), #ff7a45)",
                    boxShadow: active ? "0 0 14px var(--sky-glow, rgba(255,176,32,0.6))" : undefined,
                  }}
                />
              </div>

              <div className="col-span-3 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
                <span className="font-mono text-[12px] text-white/45">{Math.round(min)}°</span>
                <span className="font-display text-[19px] font-bold leading-none text-white tabular-nums">
                  {Math.round(max)}°
                </span>
                <span
                  className={cn(
                    "hidden text-white/35 transition-all duration-300 sm:block",
                    active ? "translate-x-0 text-[var(--accent)] opacity-100" : "-translate-x-1 opacity-0",
                  )}
                >
                  <IconArrowRight size={14} />
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="flex items-center justify-between border-t border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35 sm:px-5">
        <span>
          {bundle.provider === "openweathermap"
            ? "source · /data/2.5/forecast (5 day / 3 hour)"
            : "source · open-meteo daily model blend"}
        </span>
        <span>temps in {tempUnit(units)} · local time</span>
      </footer>
    </Panel>
  );
}
