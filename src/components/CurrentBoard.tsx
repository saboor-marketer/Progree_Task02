import { KIND_LABEL } from "@/lib/conditions";
import {
  dateLabel,
  dayLabel,
  hourLabel,
  speedUnit,
  tempUnit,
  toSpeed,
  toTemp,
} from "@/lib/format";
import { useCountUp, useNow } from "@/hooks/useUi";
import type { Units, WeatherBundle } from "@/lib/types";
import { cn } from "@/utils/cn";
import { Compass, SunArc } from "./Dials";
import { IconDroplet, IconThermometer, IconWind } from "./icons";
import { WeatherGlyph } from "./icons";

interface CurrentBoardProps {
  bundle: WeatherBundle;
  units: Units;
}

function timezoneLabel(bundle: WeatherBundle): string {
  if (bundle.timezone && bundle.timezone !== "UTC") return bundle.timezone.replace(/_/g, " ");
  const minutes = Math.round(bundle.timezoneOffsetSec / 60);
  const sign = minutes >= 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

function LocalClock({ bundle }: { bundle: WeatherBundle }) {
  const now = useNow(1000);
  const tz = { timezone: bundle.timezone, offsetSec: bundle.timezoneOffsetSec };

  return (
    <div className="text-right">
      <span className="block font-mono text-[2rem] font-medium leading-none tracking-tight text-white tabular-nums sm:text-[2.4rem]">
        {hourLabel(now, tz)}
      </span>
      <span className="mt-1.5 block font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/50">
        {dateLabel(now, tz)} · {timezoneLabel(bundle)}
      </span>
    </div>
  );
}

function Chip({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group/chip flex items-center gap-2.5 rounded border border-white/12 bg-white/[0.045] px-3 py-2",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/60 hover:bg-white/[0.09]",
        className,
      )}
    >
      <span className="text-white/45 transition-colors duration-300 group-hover/chip:text-[var(--accent)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">
          {label}
        </span>
        <span className="block truncate text-[14px] font-semibold text-white">{value}</span>
      </span>
    </div>
  );
}

export function CurrentBoard({ bundle, units }: CurrentBoardProps) {
  const { current, place } = bundle;
  const tz = { timezone: bundle.timezone, offsetSec: bundle.timezoneOffsetSec };
  const now = useNow(30_000);

  const animatedTemp = useCountUp(toTemp(current.temp, units), 1100);
  const animatedFeels = useCountUp(toTemp(current.feelsLike, units), 1100);

  const regionLine = [place.admin, place.country].filter(Boolean).join(" · ");

  return (
    <div className="grid gap-3.5 lg:grid-cols-12">
      {/* ------------------------------ main readout ------------------------------ */}
      <div className="panel corner-ticks relative overflow-hidden rounded-lg lg:col-span-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(90% 120% at 88% 0%, var(--sky-glow, rgba(255,176,32,0.22)) 0%, transparent 58%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 p-5 sm:p-7">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="label-mono mb-1.5 flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
                Live observation
              </p>
              <h1 className="font-display text-[clamp(2.1rem,5.4vw,3.6rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-white text-shadow-sky">
                {place.name}
              </h1>
              <p className="mt-1.5 truncate text-[13px] text-white/60">
                {regionLine || "Coordinates only"} ·{" "}
                <span className="font-mono text-[11.5px]">
                  {Math.abs(place.lat).toFixed(3)}°{place.lat >= 0 ? "N" : "S"}{" "}
                  {Math.abs(place.lon).toFixed(3)}°{place.lon >= 0 ? "E" : "W"}
                </span>
              </p>
            </div>
            <LocalClock bundle={bundle} />
          </header>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-end gap-4 sm:gap-6">
              <div className="relative shrink-0">
                <div
                  className="absolute inset-0 -z-10 rounded-full blur-2xl"
                  style={{ background: "var(--sky-glow, rgba(255,176,32,0.4))" }}
                />
                <WeatherGlyph
                  kind={current.kind}
                  isDay={current.isDay}
                  size={104}
                  className="text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
                />
              </div>
              <div>
                <div className="flex items-start">
                  <span className="font-display text-[clamp(4.6rem,13vw,8.4rem)] font-extrabold leading-[0.78] tracking-[-0.05em] text-white text-shadow-sky tabular-nums">
                    {Math.round(animatedTemp)}
                  </span>
                  <span className="mt-2 font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold leading-none text-white/55">
                    {tempUnit(units)}
                  </span>
                </div>
                <p className="mt-2 font-display text-[1.15rem] font-semibold text-white sm:text-[1.35rem]">
                  {current.description}
                </p>
                <p className="mt-0.5 text-[12.5px] text-white/55">
                  Feels like <span className="font-semibold text-white/85">{Math.round(animatedFeels)}°</span> ·
                  group {KIND_LABEL[current.kind]} ·{" "}
                  {dayLabel(now, tz)} {hourLabel(bundle.fetchedAt, tz)} sync
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
              <Chip
                icon={<IconThermometer size={16} />}
                label="High / Low"
                value={
                  current.tempMax !== undefined && current.tempMin !== undefined
                    ? `${toTemp(current.tempMax, units)}° / ${toTemp(current.tempMin, units)}°`
                    : "—"
                }
              />
              <Chip
                icon={<IconWind size={16} />}
                label="Wind"
                value={`${toSpeed(current.windSpeed, units)} ${speedUnit(units)}`}
              />
              <Chip
                icon={<IconDroplet size={16} />}
                label="Humidity"
                value={`${Math.round(current.humidity)}%`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------ sun + wind ------------------------------ */}
      <div className="grid gap-3.5 lg:col-span-4">
        <div className="panel relative overflow-hidden rounded-lg p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="label-mono">Solar track</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
              {current.isDay ? "daylight" : "night"}
            </p>
          </div>
          <SunArc sunrise={current.sunrise} sunset={current.sunset} now={Date.now()} />
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 font-mono text-[11px]">
            <div>
              <span className="block text-[9.5px] uppercase tracking-[0.16em] text-white/40">Sunrise</span>
              <span className="text-white/90">
                {current.sunrise ? hourLabel(current.sunrise, tz) : "—"}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[9.5px] uppercase tracking-[0.16em] text-white/40">Sunset</span>
              <span className="text-white/90">
                {current.sunset ? hourLabel(current.sunset, tz) : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="panel relative flex-1 overflow-hidden rounded-lg p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="label-mono">Wind</p>
            {current.windGust !== undefined && (
              <p className="font-mono text-[10px] text-white/45">
                gust {toSpeed(current.windGust, units)} {speedUnit(units)}
              </p>
            )}
          </div>
          <Compass
            deg={current.windDeg}
            speedLabel={String(toSpeed(current.windSpeed, units))}
            unit={speedUnit(units)}
          />
        </div>
      </div>
    </div>
  );
}
