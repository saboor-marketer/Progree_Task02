import type { ConditionKind } from "./types";

/** WMO weather interpretation codes (Open-Meteo) → condition kind + label. */
const WMO: Record<number, { kind: ConditionKind; label: string }> = {
  0: { kind: "clear", label: "Clear sky" },
  1: { kind: "clear", label: "Mainly clear" },
  2: { kind: "clouds", label: "Partly cloudy" },
  3: { kind: "clouds", label: "Overcast" },
  45: { kind: "mist", label: "Fog" },
  48: { kind: "mist", label: "Depositing rime fog" },
  51: { kind: "drizzle", label: "Light drizzle" },
  53: { kind: "drizzle", label: "Moderate drizzle" },
  55: { kind: "drizzle", label: "Dense drizzle" },
  56: { kind: "drizzle", label: "Light freezing drizzle" },
  57: { kind: "drizzle", label: "Dense freezing drizzle" },
  61: { kind: "rain", label: "Slight rain" },
  63: { kind: "rain", label: "Moderate rain" },
  65: { kind: "rain", label: "Heavy rain" },
  66: { kind: "rain", label: "Light freezing rain" },
  67: { kind: "rain", label: "Heavy freezing rain" },
  71: { kind: "snow", label: "Slight snow" },
  73: { kind: "snow", label: "Moderate snow" },
  75: { kind: "snow", label: "Heavy snow" },
  77: { kind: "snow", label: "Snow grains" },
  80: { kind: "rain", label: "Slight rain showers" },
  81: { kind: "rain", label: "Moderate rain showers" },
  82: { kind: "rain", label: "Violent rain showers" },
  85: { kind: "snow", label: "Slight snow showers" },
  86: { kind: "snow", label: "Heavy snow showers" },
  95: { kind: "thunder", label: "Thunderstorm" },
  96: { kind: "thunder", label: "Thunderstorm with slight hail" },
  99: { kind: "thunder", label: "Thunderstorm with heavy hail" },
};

export function fromWmo(code: number): { kind: ConditionKind; label: string } {
  return WMO[code] ?? { kind: "unknown", label: "Unreported conditions" };
}

/** OpenWeatherMap icon code (01d, 04n, 13d …) → condition kind. */
export function fromOwmIcon(icon: string): ConditionKind {
  const group = icon.slice(0, 2);
  switch (group) {
    case "01":
    case "02":
      return "clear";
    case "03":
    case "04":
      return "clouds";
    case "09":
    case "10":
      return "rain";
    case "11":
      return "thunder";
    case "13":
      return "snow";
    case "50":
      return "mist";
    default:
      return "unknown";
  }
}

export const KIND_LABEL: Record<ConditionKind, string> = {
  clear: "Clear",
  clouds: "Cloudy",
  drizzle: "Drizzle",
  rain: "Rain",
  thunder: "Storm",
  snow: "Snow",
  mist: "Fog",
  unknown: "Unknown",
};

export interface SkyTheme {
  top: string;
  mid: string;
  low: string;
  horizon: string;
  accent: string;
  glow: string;
}

const DAY: Record<ConditionKind, SkyTheme> = {
  clear: {
    top: "#0d3f6b",
    mid: "#1f76a8",
    low: "#4fb0d8",
    horizon: "#ffc274",
    accent: "#ffb020",
    glow: "rgba(255, 196, 92, 0.55)",
  },
  clouds: {
    top: "#2b4257",
    mid: "#4d6a80",
    low: "#8aa4b4",
    horizon: "#d6c3a4",
    accent: "#ffd08a",
    glow: "rgba(190, 214, 228, 0.4)",
  },
  drizzle: {
    top: "#22384a",
    mid: "#3f5d70",
    low: "#7794a3",
    horizon: "#a9bcc4",
    accent: "#7fd4e8",
    glow: "rgba(127, 212, 232, 0.34)",
  },
  rain: {
    top: "#16293a",
    mid: "#2c4759",
    low: "#5b7688",
    horizon: "#8ba3ae",
    accent: "#5fd3f3",
    glow: "rgba(95, 211, 243, 0.3)",
  },
  thunder: {
    top: "#121a26",
    mid: "#26333f",
    low: "#4b5a68",
    horizon: "#7d6a78",
    accent: "#ffd166",
    glow: "rgba(255, 209, 102, 0.34)",
  },
  snow: {
    top: "#3c5d78",
    mid: "#6b8ba3",
    low: "#a9c2d2",
    horizon: "#e7f0f5",
    accent: "#dff1fb",
    glow: "rgba(233, 246, 255, 0.5)",
  },
  mist: {
    top: "#33454f",
    mid: "#5a6e77",
    low: "#8d9ea5",
    horizon: "#c3ced2",
    accent: "#cfe6ee",
    glow: "rgba(207, 230, 238, 0.36)",
  },
  unknown: {
    top: "#22384a",
    mid: "#3f5d70",
    low: "#7794a3",
    horizon: "#d6c3a4",
    accent: "#ffb020",
    glow: "rgba(255, 176, 32, 0.32)",
  },
};

const NIGHT: Record<ConditionKind, SkyTheme> = {
  clear: {
    top: "#03080f",
    mid: "#0a1a2e",
    low: "#153652",
    horizon: "#3f5a72",
    accent: "#8fb6ff",
    glow: "rgba(143, 182, 255, 0.34)",
  },
  clouds: {
    top: "#080f18",
    mid: "#152232",
    low: "#2a3b4c",
    horizon: "#4a5a68",
    accent: "#a9c3d6",
    glow: "rgba(169, 195, 214, 0.26)",
  },
  drizzle: {
    top: "#060d15",
    mid: "#101d29",
    low: "#22353f",
    horizon: "#3d545e",
    accent: "#5fb8cf",
    glow: "rgba(95, 184, 207, 0.26)",
  },
  rain: {
    top: "#04090f",
    mid: "#0c1922",
    low: "#1b2f3a",
    horizon: "#33495a",
    accent: "#4aa8d8",
    glow: "rgba(74, 168, 216, 0.24)",
  },
  thunder: {
    top: "#05070c",
    mid: "#0f141d",
    low: "#232c38",
    horizon: "#453b4c",
    accent: "#f5d76e",
    glow: "rgba(245, 215, 110, 0.3)",
  },
  snow: {
    top: "#0b1420",
    mid: "#1d2c3d",
    low: "#3b4f63",
    horizon: "#6f8496",
    accent: "#dceaf5",
    glow: "rgba(220, 234, 245, 0.32)",
  },
  mist: {
    top: "#0a1119",
    mid: "#1a2731",
    low: "#33434c",
    horizon: "#59696f",
    accent: "#b9cdd6",
    glow: "rgba(185, 205, 214, 0.24)",
  },
  unknown: {
    top: "#050c14",
    mid: "#0e1e2c",
    low: "#1d3a4f",
    horizon: "#3f5a72",
    accent: "#8fb6ff",
    glow: "rgba(143, 182, 255, 0.3)",
  },
};

export function skyTheme(kind: ConditionKind, isDay: boolean): SkyTheme {
  return (isDay ? DAY : NIGHT)[kind] ?? DAY.unknown;
}

/** Fallback theme used before any data has arrived. */
export const IDLE_THEME: SkyTheme = {
  top: "#0a1a2a",
  mid: "#123a55",
  low: "#1f6285",
  horizon: "#f0a860",
  accent: "#ffb020",
  glow: "rgba(255, 176, 32, 0.34)",
};

const AQI_BANDS: { max: number; category: string }[] = [
  { max: 50, category: "Good" },
  { max: 100, category: "Moderate" },
  { max: 150, category: "Unhealthy (sensitive)" },
  { max: 200, category: "Unhealthy" },
  { max: 300, category: "Very unhealthy" },
  { max: Number.POSITIVE_INFINITY, category: "Hazardous" },
];

export function aqiCategory(index: number): string {
  return (AQI_BANDS.find((b) => index <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1]).category;
}

export function uvCategory(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

export function compass(deg: number): string {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}
