import { useEffect, useMemo, useRef, useState } from "react";
import type { SkyTheme } from "@/lib/conditions";
import type { ConditionKind } from "@/lib/types";
import { cn } from "@/utils/cn";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Layer {
  id: number;
  theme: SkyTheme;
  fading: boolean;
}

/** Cross-fades between sky palettes instead of snapping when conditions change. */
function useThemeLayers(theme: SkyTheme, key: string): Layer[] {
  const [layers, setLayers] = useState<Layer[]>([{ id: 0, theme, fading: false }]);
  const counter = useRef(0);

  useEffect(() => {
    const id = ++counter.current;
    setLayers((prev) => [
      ...prev.map((layer) => ({ ...layer, fading: true })),
      { id, theme, fading: false },
    ]);
    const timer = window.setTimeout(() => {
      setLayers((prev) => prev.filter((layer) => layer.id === id || !layer.fading));
    }, 1600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return layers;
}

function SkyLayer({ theme, fading }: { theme: SkyTheme; fading: boolean }) {
  return (
    <div
      className="absolute inset-0 transition-opacity duration-[1500ms] ease-out"
      style={{
        opacity: fading ? 0 : 1,
        background: `linear-gradient(178deg, ${theme.top} 0%, ${theme.mid} 38%, ${theme.low} 68%, ${theme.horizon} 104%)`,
      }}
    />
  );
}

function Starfield({ visible, seed = 7 }: { visible: boolean; seed?: number }) {
  const stars = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: 90 }, () => ({
      left: rand() * 100,
      top: rand() * 62,
      size: rand() * 1.8 + 0.6,
      delay: rand() * 6,
      duration: rand() * 3.5 + 2.5,
      opacity: rand() * 0.6 + 0.25,
    }));
  }, [seed]);

  return (
    <div
      className="absolute inset-0 transition-opacity duration-[1400ms]"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {stars.map((star, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-breathe"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function Celestial({ isDay, kind, glow }: { isDay: boolean; kind: ConditionKind; glow: string }) {
  const obscured = kind === "thunder" || kind === "rain" || kind === "mist" || kind === "snow";
  return (
    <div
      className="absolute transition-all duration-[1600ms] ease-out"
      style={{ right: "9%", top: isDay ? "8%" : "10%", opacity: obscured ? 0.22 : 1 }}
    >
      <div
        className="relative h-40 w-40 rounded-full animate-breathe sm:h-56 sm:w-56"
        style={{
          background: isDay
            ? `radial-gradient(circle at 50% 50%, rgba(255,246,214,0.98) 0%, rgba(255,214,132,0.72) 32%, ${glow} 58%, transparent 72%)`
            : `radial-gradient(circle at 50% 50%, rgba(238,244,255,0.95) 0%, rgba(190,214,255,0.42) 34%, ${glow} 60%, transparent 74%)`,
        }}
      >
        {!isDay && (
          <span
            className="absolute inset-0 m-auto h-16 w-16 rounded-full sm:h-24 sm:w-24"
            style={{
              background: "radial-gradient(circle at 38% 34%, #f4f8ff, #c9d8ef 60%, #9db4d4)",
              boxShadow: "0 0 42px 8px rgba(190,214,255,0.35)",
            }}
          />
        )}
      </div>
    </div>
  );
}

function CloudField({ kind, isDay }: { kind: ConditionKind; isDay: boolean }) {
  const density =
    kind === "clear" ? 2 : kind === "clouds" ? 6 : kind === "thunder" || kind === "rain" ? 7 : 5;

  const clouds = useMemo(() => {
    const rand = mulberry32(density * 31 + 5);
    return Array.from({ length: density }, (_, i) => ({
      id: i,
      top: rand() * 46 + 2,
      scale: rand() * 1.1 + 0.55,
      duration: rand() * 42 + 46,
      delay: -rand() * 60,
      opacity: rand() * 0.34 + (kind === "thunder" ? 0.42 : 0.18),
    }));
  }, [density, kind]);

  const tint = isDay ? "255,255,255" : "198,216,236";

  return (
    <div className="absolute inset-x-0 top-0 h-[70vh] overflow-hidden">
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute animate-drift-slow"
          style={{
            top: `${cloud.top}%`,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
            transform: `scale(${cloud.scale})`,
          }}
        >
          <div className="relative" style={{ opacity: cloud.opacity }}>
            {[
              { w: 260, h: 78, x: 0, y: 18 },
              { w: 170, h: 96, x: 54, y: 0 },
              { w: 210, h: 84, x: 132, y: 12 },
              { w: 150, h: 62, x: 232, y: 28 },
            ].map((puff, i) => (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: puff.w,
                  height: puff.h,
                  left: puff.x,
                  top: puff.y,
                  background: `radial-gradient(circle at 40% 35%, rgba(${tint},0.85), rgba(${tint},0.05) 72%)`,
                  filter: "blur(22px)",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Precipitation({ kind }: { kind: ConditionKind }) {
  const drops = useMemo(() => {
    const rand = mulberry32(11);
    return Array.from({ length: 90 }, () => ({
      left: rand() * 110 - 5,
      delay: -rand() * 3,
      duration: rand() * 0.5 + 0.75,
      length: rand() * 70 + 50,
      opacity: rand() * 0.45 + 0.2,
    }));
  }, []);

  const flakes = useMemo(() => {
    const rand = mulberry32(23);
    return Array.from({ length: 70 }, () => ({
      left: rand() * 100,
      delay: -rand() * 9,
      duration: rand() * 5 + 5,
      size: rand() * 4 + 1.6,
      opacity: rand() * 0.6 + 0.3,
    }));
  }, []);

  if (kind === "rain" || kind === "drizzle" || kind === "thunder") {
    const count = kind === "drizzle" ? 42 : 90;
    return (
      <div className="absolute inset-0 overflow-hidden">
        {drops.slice(0, count).map((drop, i) => (
          <span
            key={i}
            className={cn("absolute top-0 w-px animate-fall", kind === "thunder" && "bg-white/70")}
            style={{
              left: `${drop.left}%`,
              height: drop.length * (kind === "drizzle" ? 0.55 : 1),
              animationDelay: `${drop.delay}s`,
              animationDuration: `${drop.duration * (kind === "thunder" ? 0.72 : 1)}s`,
              opacity: drop.opacity,
              background:
                kind === "thunder"
                  ? "linear-gradient(to bottom, rgba(255,255,255,0), rgba(214,232,255,0.95))"
                  : "linear-gradient(to bottom, rgba(190,224,245,0), rgba(190,224,245,0.85))",
            }}
          />
        ))}
      </div>
    );
  }

  if (kind === "snow") {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {flakes.map((flake, i) => (
          <span
            key={i}
            className="absolute top-0 rounded-full bg-white animate-snowfall"
            style={{
              left: `${flake.left}%`,
              width: flake.size,
              height: flake.size,
              animationDelay: `${flake.delay}s`,
              animationDuration: `${flake.duration}s`,
              opacity: flake.opacity,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}

export interface SkySceneProps {
  kind: ConditionKind;
  isDay: boolean;
  theme: SkyTheme;
  className?: string;
}

export function SkyScene({ kind, isDay, theme, className }: SkySceneProps) {
  const key = `${kind}-${isDay}`;
  const layers = useThemeLayers(theme, key);

  return (
    <div
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}
      aria-hidden="true"
    >
      {layers.map((layer) => (
        <SkyLayer key={layer.id} theme={layer.theme} fading={layer.fading} />
      ))}

      <Celestial isDay={isDay} kind={kind} glow={theme.glow} />
      <Starfield visible={!isDay} seed={kind === "clear" ? 3 : 9} />
      <CloudField kind={kind} isDay={isDay} />
      <Precipitation kind={kind} />

      {kind === "thunder" && (
        <div
          className="absolute inset-0 animate-flash bg-[radial-gradient(120%_70%_at_60%_0%,rgba(255,255,255,0.9),transparent_65%)]"
          style={{ animationDuration: "6s" }}
        />
      )}

      {kind === "mist" && (
        <div className="absolute inset-x-0 bottom-0 h-[46vh] bg-[linear-gradient(to_top,rgba(226,236,240,0.4),transparent)]" />
      )}

      <div className="absolute inset-x-0 bottom-0 h-[52vh] bg-[linear-gradient(to_top,rgba(3,9,16,0.78),rgba(3,9,16,0.18)_55%,transparent)]" />
      <div className="absolute inset-0 grain opacity-[0.055] mix-blend-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_-10%,transparent_38%,rgba(2,8,15,0.62)_100%)]" />
    </div>
  );
}
