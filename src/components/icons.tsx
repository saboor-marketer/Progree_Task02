import type { ReactNode } from "react";
import type { ConditionKind } from "@/lib/types";

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function Svg({
  size = 16,
  className,
  strokeWidth = 1.6,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 4.5 4.5" />
  </Svg>
);

export const IconCrosshair = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconSliders = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 1 0-.9 4.6" />
    <path d="M20 4.5V11h-6.2" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6 18 18M18 6 6 18" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Svg>
);

export const IconDroplet = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2c3.2 3.6 5.4 6.3 5.4 9.1A5.4 5.4 0 0 1 12 17.7a5.4 5.4 0 0 1-5.4-5.4c0-2.8 2.2-5.5 5.4-9.1Z" />
  </Svg>
);

export const IconWind = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8h11a3 3 0 1 0-3-3" />
    <path d="M3 12h15a3 3 0 1 1-3 3" />
    <path d="M3 16h8" />
  </Svg>
);

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
);

export const IconGauge = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.2 17a8.5 8.5 0 1 1 15.6 0" />
    <path d="m12 13.5 3.6-3.4" />
    <circle cx="12" cy="14.4" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconThermometer = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 13.6V5.4a2 2 0 1 1 4 0v8.2a4.2 4.2 0 1 1-4 0Z" />
    <path d="M12 9.5v5.2" />
  </Svg>
);

export const IconSunrise = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5v4M5.2 9.8 3.8 8.4M18.8 9.8l1.4-1.4M2.5 16.5h4M17.5 16.5h4" />
    <path d="M8 16.5a4 4 0 0 1 8 0" />
    <path d="M4 20.5h16" />
  </Svg>
);

export const IconSunset = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 8.5v-4M5.2 9.8 3.8 8.4M18.8 9.8l1.4-1.4M2.5 16.5h4M17.5 16.5h4" />
    <path d="M8 16.5a4 4 0 0 1 8 0" />
    <path d="M9.5 6.2 12 8.7l2.5-2.5" />
    <path d="M4 20.5h16" />
  </Svg>
);

export const IconLeaf = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 4c0 9-5.2 13.4-11 13.4A5 5 0 0 1 4 12.5C4 6.9 9.4 4 20 4Z" />
    <path d="M4.8 20c2.6-5.4 6-8.6 10.6-10.6" />
  </Svg>
);

export const IconCloud = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17.5 19H7a4.5 4.5 0 0 1-.6-8.96A6.5 6.5 0 0 1 18.8 9.4 4.8 4.8 0 0 1 17.5 19Z" />
  </Svg>
);

export const IconCompass = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.4 8.6-2 4.8-4.8 2 2-4.8Z" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.2 21 19.5H3L12 4.2Z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconPlug = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3v5M15 3v5" />
    <path d="M6.5 8h11v3.2A5.5 5.5 0 0 1 12 16.7a5.5 5.5 0 0 1-5.5-5.5V8Z" />
    <path d="M12 16.7V21" />
  </Svg>
);

/* ------------------------------------------------------------------ *
 * Animated condition glyphs
 * ------------------------------------------------------------------ */

interface GlyphProps {
  kind: ConditionKind;
  isDay?: boolean;
  size?: number;
  className?: string;
}

const CLOUD_PATH = "M17.6 18.4H7.2a4.3 4.3 0 0 1-.7-8.55 6.4 6.4 0 0 1 12.3-.5 4.55 4.55 0 0 1-1.2 9.05Z";

export function WeatherGlyph({ kind, isDay = true, size = 44, className }: GlyphProps) {
  const sun = (
    <g stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.1" />
      <g className="origin-center animate-spin-slow">
        <path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
      </g>
    </g>
  );

  const moon = (
    <g stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M20.5 13.6A8.4 8.4 0 1 1 10.4 3.5a6.6 6.6 0 0 0 10.1 10.1Z" />
      <path d="M17.6 4.2v2.2M16.5 5.3h2.2" opacity="0.75" />
    </g>
  );

  const cloud = (
    <path
      d={CLOUD_PATH}
      stroke="currentColor"
      fill="rgba(255,255,255,0.14)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  );

  let body: ReactNode;

  switch (kind) {
    case "clear":
      body = isDay ? sun : moon;
      break;
    case "clouds":
      body = (
        <g>
          {isDay && (
            <g transform="translate(1.5 -1.5) scale(0.72)" opacity="0.9">
              {sun}
            </g>
          )}
          <g transform="translate(-0.5 2)">{cloud}</g>
        </g>
      );
      break;
    case "drizzle":
    case "rain":
      body = (
        <g>
          {cloud}
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
            {[8.2, 12, 15.8].map((x, i) => (
              <path
                key={x}
                d={`M${x} 20v${kind === "rain" ? 2.6 : 1.7}`}
                className="animate-icon-drop"
                style={{ animationDelay: `${i * 0.22}s` }}
                opacity="0.9"
              />
            ))}
          </g>
        </g>
      );
      break;
    case "thunder":
      body = (
        <g>
          {cloud}
          <path
            d="M13 19.2 9.8 23h3.1l-1 3.2 3.9-4.4h-3l1.4-2.6Z"
            fill="currentColor"
            stroke="none"
            className="animate-flash"
            style={{ animationDuration: "3.2s" }}
          />
          <path d="M12.4 19.6 9.6 23h5.2Z" fill="currentColor" stroke="none" opacity="0.9" />
        </g>
      );
      break;
    case "snow":
      body = (
        <g>
          {cloud}
          <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none">
            {[8.4, 12, 15.6].map((x, i) => (
              <g
                key={x}
                className="animate-icon-flake"
                style={{ animationDelay: `${i * 1.4}s` }}
              >
                <path d={`M${x} 19.6v3.2M${x - 1.5} 20.4l3 1.6M${x - 1.5} 22l3-1.6`} />
              </g>
            ))}
          </g>
        </g>
      );
      break;
    case "mist":
      body = (
        <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none">
          <path d="M4 9h13M6.5 13.2h13M4 17.4h15" opacity="0.95" />
          <path d="M18.5 9h1.5M4 13.2h1" opacity="0.5" />
        </g>
      );
      break;
    default:
      body = cloud;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  );
}
