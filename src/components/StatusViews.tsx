import { CURATED_PLACES, errorCopy, type WeatherError } from "@/lib/api";
import type { Place } from "@/lib/types";
import { IconAlert, IconArrowRight, IconClose, IconPlug, IconRefresh } from "./icons";
import { WeatherGlyph } from "./icons";

/* ------------------------------------------------------------------ *
 * Cold start
 * ------------------------------------------------------------------ */

export function IdleState({ onPick }: { onPick: (place: Place) => void }) {
  return (
    <div className="panel corner-ticks relative overflow-hidden rounded-lg">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(80% 120% at 100% 0%, var(--sky-glow, rgba(255,176,32,0.22)), transparent 60%)",
        }}
      />
      <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="max-w-xl">
          <p className="label-mono mb-3 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
            Awaiting first request
          </p>
          <h1 className="font-display text-[clamp(2.4rem,6vw,4.4rem)] font-extrabold leading-[0.92] tracking-[-0.035em] text-white text-shadow-sky">
            Pick a station.
            <br />
            <span className="text-[var(--accent)]">Pull the sky down.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/65">
            Isobar is a single-page client for public weather REST endpoints. Every panel below is
            rendered from asynchronous <code className="font-mono text-[13px] text-white/80">fetch()</code>{" "}
            calls — current conditions, an hourly series, a multi-day outlook and air quality — with
            loading, retry and offline states wired in.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {CURATED_PLACES.slice(0, 6).map((place, i) => (
              <button
                key={place.id}
                type="button"
                onClick={() => onPick(place)}
                style={{ transitionDelay: `${i * 40}ms` }}
                className="group/station flex items-center gap-2 rounded border border-white/14 bg-white/[0.05] px-3 py-2 text-[13px] text-white/75 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--accent)]/12 hover:text-white"
              >
                <span>{place.name}</span>
                <span className="font-mono text-[10px] text-white/35 group-hover/station:text-[var(--accent)]">
                  {place.countryCode}
                </span>
                <span className="opacity-0 transition-opacity duration-300 group-hover/station:opacity-100">
                  <IconArrowRight size={13} />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative hidden shrink-0 lg:block">
          <div
            className="absolute inset-0 -z-10 rounded-full blur-3xl"
            style={{ background: "var(--sky-glow, rgba(255,176,32,0.35))" }}
          />
          <div className="grid grid-cols-2 gap-3">
            {(["clear", "rain", "snow", "thunder"] as const).map((kind, i) => (
              <div
                key={kind}
                className="flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-md border border-white/12 bg-white/[0.05] text-white/80 transition-transform duration-500 hover:-translate-y-1 hover:border-white/30"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <WeatherGlyph kind={kind} isDay={i !== 3} size={38} />
                <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/45">
                  {kind}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Loading skeleton
 * ------------------------------------------------------------------ */

function Bone({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-white/[0.07] ${className ?? ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="space-y-3.5" aria-busy="true" aria-live="polite">
      <p className="label-mono flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-[var(--accent)]" />
        {label}
      </p>

      <div className="grid gap-3.5 lg:grid-cols-12">
        <div className="panel relative overflow-hidden rounded-lg p-6 sm:p-7 lg:col-span-8">
          <Bone className="h-3 w-32" />
          <Bone className="mt-4 h-12 w-2/3" delay={80} />
          <Bone className="mt-3 h-3 w-1/3" delay={140} />
          <div className="mt-8 flex items-end gap-6">
            <Bone className="h-24 w-24 rounded-full" delay={200} />
            <div className="flex-1 space-y-3">
              <Bone className="h-20 w-52" delay={260} />
              <Bone className="h-3 w-40" delay={320} />
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <Bone key={i} className="h-14" delay={380 + i * 70} />
            ))}
          </div>
        </div>
        <div className="grid gap-3.5 lg:col-span-4">
          <div className="panel rounded-lg p-5">
            <Bone className="h-3 w-24" />
            <Bone className="mt-5 h-24 w-full rounded-full" delay={120} />
            <Bone className="mt-4 h-3 w-full" delay={200} />
          </div>
          <div className="panel rounded-lg p-5">
            <Bone className="h-3 w-16" />
            <div className="mt-4 flex items-center gap-4">
              <Bone className="h-24 w-24 rounded-full" delay={160} />
              <div className="flex-1 space-y-2">
                <Bone className="h-6 w-20" delay={220} />
                <Bone className="h-3 w-16" delay={260} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden rounded-lg p-4">
        <Bone className="h-3 w-40" />
        <div className="mt-5 flex gap-3 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex w-[78px] shrink-0 flex-col items-center gap-2">
              <Bone className="h-3 w-10" delay={i * 45} />
              <Bone className="h-8 w-8 rounded-full" delay={i * 45 + 60} />
              <Bone className="h-3 w-12" delay={i * 45 + 120} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Error
 * ------------------------------------------------------------------ */

export function ErrorState({
  error,
  onRetry,
  onSettings,
}: {
  error: WeatherError;
  onRetry: () => void;
  onSettings: () => void;
}) {
  const copy = errorCopy(error.code);

  return (
    <div className="panel corner-ticks relative max-w-2xl overflow-hidden rounded-lg" role="alert">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff7a45] to-transparent" />
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 shrink-0 text-ember">
            <IconAlert size={26} strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <p className="label-mono mb-1.5 !text-ember/80">
              Request failed · {error.code}
              {error.status ? ` · HTTP ${error.status}` : ""}
            </p>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white">
              {copy.title}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/65">{copy.hint}</p>
            {error.message && error.message !== copy.title && (
              <p className="mt-3 rounded border border-white/10 bg-black/25 px-3 py-2 font-mono text-[11.5px] text-white/55">
                {error.message}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-2 rounded bg-[var(--accent)] px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#08131f] transition-transform duration-200 hover:-translate-y-px hover:brightness-110"
              >
                <IconRefresh size={13} /> Retry request
              </button>
              <button
                type="button"
                onClick={onSettings}
                className="flex items-center gap-2 rounded border border-white/18 px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/70 transition-colors hover:border-white/40 hover:text-white"
              >
                <IconPlug size={13} /> Check data source
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Non-blocking banner for failed background refreshes
 * ------------------------------------------------------------------ */

export function ErrorBanner({
  error,
  onDismiss,
  onRetry,
}: {
  error: WeatherError;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const copy = errorCopy(error.code);
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-md border border-ember/45 bg-[rgba(255,122,69,0.12)] px-4 py-2.5"
    >
      <span className="text-ember">
        <IconAlert size={16} />
      </span>
      <p className="min-w-0 flex-1 text-[12.5px] text-white/80">
        <span className="font-semibold text-white">Refresh failed — showing cached data.</span>{" "}
        {copy.title}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded border border-white/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 transition-colors hover:border-white/45 hover:text-white"
      >
        Retry
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-1 text-white/50 transition-colors hover:text-white"
        aria-label="Dismiss"
      >
        <IconClose size={14} />
      </button>
    </div>
  );
}
