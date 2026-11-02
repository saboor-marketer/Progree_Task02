import type { ElementType, ReactNode } from "react";
import { useReveal } from "@/hooks/useUi";
import { cn } from "@/utils/cn";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}

export function Reveal({ children, delay = 0, className, as: Tag = "div" }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <Tag
      ref={ref}
      className={cn("reveal", className)}
      data-visible={visible}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

interface PanelProps {
  title: string;
  meta?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  ticks?: boolean;
}

export function Panel({
  title,
  meta,
  icon,
  children,
  className,
  bodyClassName,
  ticks = true,
}: PanelProps) {
  return (
    <section
      className={cn(
        "panel group/panel relative overflow-hidden rounded-lg transition-[border-color,transform,box-shadow] duration-500",
        "hover:border-white/25",
        ticks && "corner-ticks",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          {icon && (
            <span className="text-white/70 transition-colors duration-300 group-hover/panel:text-[var(--accent)]">
              {icon}
            </span>
          )}
          <h2 className="label-mono truncate !text-white/70">{title}</h2>
        </div>
        {meta && <div className="shrink-0 font-mono text-[10px] tracking-wider text-white/45">{meta}</div>}
      </header>
      <div className={cn("px-4 py-4 sm:px-5", bodyClassName)}>{children}</div>
    </section>
  );
}

interface MeterProps {
  value: number;
  max?: number;
  tone?: string;
  className?: string;
  delay?: number;
}

export function Meter({ value, max = 100, tone, className, delay = 0 }: MeterProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-white/12", className)}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-[1200ms] ease-out"
        style={{
          width: `${pct}%`,
          background: tone ?? "linear-gradient(90deg, var(--accent), rgba(255,255,255,0.9))",
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  meter?: { value: number; max?: number; tone?: string };
  className?: string;
  delay?: number;
}

export function StatTile({
  label,
  value,
  unit,
  icon,
  footer,
  meter,
  className,
  delay = 0,
}: StatTileProps) {
  return (
    <Reveal
      delay={delay}
      className={cn(
        "group relative flex flex-col justify-between gap-3 overflow-hidden rounded-md border border-white/12",
        "bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015)_55%,rgba(4,12,20,0.3))]",
        "px-4 py-3.5 transition-all duration-500 hover:-translate-y-0.5 hover:border-white/28",
        "hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.95)]",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
        style={{ background: "var(--accent)" }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="label-mono">{label}</span>
        {icon && (
          <span className="text-white/45 transition-colors duration-300 group-hover:text-[var(--accent)]">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-semibold leading-none tracking-tight text-white">
          {value}
        </span>
        {unit && <span className="font-mono text-[11px] text-white/55">{unit}</span>}
      </div>
      {meter && <Meter value={meter.value} max={meter.max} tone={meter.tone} delay={delay} />}
      {footer && <div className="text-[11.5px] leading-snug text-white/55">{footer}</div>}
    </Reveal>
  );
}
