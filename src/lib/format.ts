import type { Units } from "./types";

export interface TzRef {
  timezone?: string;
  offsetSec?: number;
}

interface Zoned {
  date: Date;
  timeZone: string;
}

/**
 * Resolve a timestamp into something `Intl` can format in the *location's*
 * wall clock rather than the browser's. Providers that only give a numeric
 * UTC offset get shifted and formatted as UTC.
 */
export function zoned(ms: number, tz: TzRef): Zoned {
  if (typeof tz.offsetSec === "number") {
    return { date: new Date(ms + tz.offsetSec * 1000), timeZone: "UTC" };
  }
  return { date: new Date(ms), timeZone: tz.timezone ?? "UTC" };
}

function intl(z: Zoned, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: z.timeZone, ...options }).format(z.date);
}

export function hourLabel(ms: number, tz: TzRef): string {
  return intl(zoned(ms, tz), { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function shortHour(ms: number, tz: TzRef): string {
  return intl(zoned(ms, tz), { hour: "2-digit", hour12: false });
}

export function dayLabel(ms: number, tz: TzRef): string {
  return intl(zoned(ms, tz), { weekday: "short" });
}

export function longDayLabel(ms: number, tz: TzRef): string {
  return intl(zoned(ms, tz), { weekday: "long" });
}

export function dateLabel(ms: number, tz: TzRef): string {
  return intl(zoned(ms, tz), { day: "2-digit", month: "short" });
}

export function fullClock(ms: number, tz: TzRef): string {
  return intl(zoned(ms, tz), {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function isSameLocalDay(a: number, b: number, tz: TzRef): boolean {
  const fmt = (ms: number) => intl(zoned(ms, tz), { year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt(a) === fmt(b);
}

/* ----------------------------- units ----------------------------- */

export const round = (value: number, digits = 0): number => {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

export const toTemp = (celsius: number, units: Units): number =>
  units === "metric" ? round(celsius) : round(celsius * 1.8 + 32);

export const tempUnit = (units: Units): string => (units === "metric" ? "°C" : "°F");

export const toSpeed = (metresPerSec: number, units: Units): number =>
  units === "metric" ? round(metresPerSec * 3.6) : round(metresPerSec * 2.23694);

export const speedUnit = (units: Units): string => (units === "metric" ? "km/h" : "mph");

export const toDistance = (metres: number, units: Units): number =>
  units === "metric" ? round(metres / 1000, 1) : round(metres / 1609.34, 1);

export const distanceUnit = (units: Units): string => (units === "metric" ? "km" : "mi");

export const toPressure = (hPa: number, units: Units): number =>
  units === "metric" ? round(hPa) : round(hPa * 0.02953, 2);

export const pressureUnit = (units: Units): string => (units === "metric" ? "hPa" : "inHg");

export const toPrecip = (mm: number, units: Units): number =>
  units === "metric" ? round(mm, 1) : round(mm / 25.4, 2);

export const precipUnit = (units: Units): string => (units === "metric" ? "mm" : "in");

export function relativeTime(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const secs = Math.floor(diff / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export function daySpanText(daylightMs: number): string {
  const total = Math.max(0, Math.round(daylightMs / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}
