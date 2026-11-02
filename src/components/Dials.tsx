import { useMemo } from "react";
import { compass } from "@/lib/conditions";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ *
 * Sun arc — position of the sun between sunrise and sunset
 * ------------------------------------------------------------------ */

const HOUR = 3_600_000;

export interface SunArcProps {
  sunrise?: number;
  sunset?: number;
  now: number;
  className?: string;
}

function humanDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function SunArc({ sunrise, sunset, now, className }: SunArcProps) {
  const model = useMemo(() => {
    if (!sunrise || !sunset) return null;
    const daylight = Math.max(HOUR, sunset - sunrise);
    const nightLength = 24 * HOUR - daylight;
    const isDay = now >= sunrise && now <= sunset;
    let t: number;
    let start: number;
    let end: number;
    if (isDay) {
      start = sunrise;
      end = sunset;
      t = (now - sunrise) / daylight;
    } else if (now < sunrise) {
      start = sunrise - nightLength;
      end = sunrise;
      t = (now - start) / nightLength;
    } else {
      start = sunset;
      end = sunset + nightLength;
      t = (now - start) / nightLength;
    }
    const angle = Math.PI * (1 - Math.min(1, Math.max(0, t)));
    return {
      isDay,
      t: Math.min(1, Math.max(0, t)),
      x: 100 + 90 * Math.cos(angle),
      y: 92 - 86 * Math.sin(angle),
      daylight,
      remaining: end - now,
      label: isDay ? "daylight left" : "until sunrise",
    };
  }, [sunrise, sunset, now]);

  if (!model) {
    return (
      <div className={cn("flex h-full min-h-[9rem] items-center justify-center text-white/40", className)}>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em]">Sun data unavailable</p>
      </div>
    );
  }

  const stroke = model.isDay ? "var(--accent)" : "#a9c3e6";

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 200 104" className="w-full overflow-visible">
        <defs>
          <linearGradient id="arcFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.26" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d="M10 92 A 90 86 0 0 1 190 92 Z" fill="url(#arcFill)" />
        <path
          d="M10 92 A 90 86 0 0 1 190 92"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.4"
          strokeDasharray="3 5"
        />
        <path
          d="M10 92 A 90 86 0 0 1 190 92"
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - model.t}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${stroke})` }}
        />
        <line x1="0" y1="92" x2="200" y2="92" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />

        <g transform={`translate(${model.x} ${model.y})`}>
          <circle r="9" fill={stroke} opacity="0.22" className="animate-breathe" />
          <circle r="4.6" fill={stroke} />
          <circle r="4.6" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
        </g>

        {[0.25, 0.5, 0.75].map((tick) => {
          const a = Math.PI * (1 - tick);
          return (
            <line
              key={tick}
              x1={100 + 84 * Math.cos(a)}
              y1={92 - 80 * Math.sin(a)}
              x2={100 + 94 * Math.cos(a)}
              y2={92 - 90 * Math.sin(a)}
              stroke="rgba(255,255,255,0.24)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      <div className="mt-1 flex items-end justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/50">
        <span>Rise</span>
        <span className="text-center text-white/75">
          <span className="block text-[13px] tracking-normal text-white">
            {humanDuration(model.remaining)}
          </span>
          {model.label}
        </span>
        <span className="text-right">Set</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Wind compass
 * ------------------------------------------------------------------ */

export interface CompassProps {
  deg?: number;
  speedLabel: string;
  unit: string;
  className?: string;
}

export function Compass({ deg, speedLabel, unit, className }: CompassProps) {
  const rotation = typeof deg === "number" ? (deg + 180) % 360 : 0;

  return (
    <div className={cn("relative flex items-center gap-4", className)}>
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle cx="50" cy="50" r="45" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.16)" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 6" />
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i * Math.PI * 2) / 16;
            const major = i % 4 === 0;
            return (
              <line
                key={i}
                x1={50 + (major ? 36 : 40) * Math.sin(a)}
                y1={50 - (major ? 36 : 40) * Math.cos(a)}
                x2={50 + 44 * Math.sin(a)}
                y2={50 - 44 * Math.cos(a)}
                stroke={major ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.22)"}
                strokeWidth={major ? 1.6 : 1}
              />
            );
          })}
          {["N", "E", "S", "W"].map((dir, i) => {
            const a = (i * Math.PI) / 2;
            return (
              <text
                key={dir}
                x={50 + 26 * Math.sin(a)}
                y={50 - 26 * Math.cos(a) + 3.4}
                textAnchor="middle"
                className="fill-white/55 font-mono"
                style={{ fontSize: 8.5 }}
              >
                {dir}
              </text>
            );
          })}
          <g
            className="transition-transform duration-1000 ease-out"
            style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "50px 50px" }}
          >
            <path d="M50 12 L57 52 L50 46 L43 52 Z" fill="var(--accent)" />
            <path d="M50 88 L44 54 L50 58 L56 54 Z" fill="rgba(255,255,255,0.4)" />
          </g>
          <circle cx="50" cy="50" r="3" fill="#fff" opacity="0.9" />
        </svg>
      </div>

      <div className="min-w-0">
        <p className="font-display text-3xl font-semibold leading-none text-white">{speedLabel}</p>
        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/50">{unit}</p>
        {typeof deg === "number" && (
          <p className="mt-2 text-[12.5px] text-white/70">
            from <span className="font-semibold text-white">{compass(deg)}</span> · {Math.round(deg)}°
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Arc gauge (UV index / air quality)
 * ------------------------------------------------------------------ */

export interface ArcGaugeProps {
  value: number;
  max: number;
  stops: string[];
  className?: string;
}

export function ArcGauge({ value, max, stops, className }: ArcGaugeProps) {
  const pct = Math.max(0, Math.min(1, value / max));
  const gradient = `linear-gradient(90deg, ${stops.join(", ")})`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="absolute inset-0 opacity-35" style={{ background: gradient }} />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/85 transition-[width] duration-1000 ease-out"
          style={{ width: `${pct * 100}%` }}
        />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#07111c] bg-white transition-[left] duration-1000 ease-out"
          style={{ left: `${pct * 100}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/35">
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
