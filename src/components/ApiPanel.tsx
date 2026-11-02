import { useEffect, useState } from "react";
import { useTraces } from "@/hooks/useUi";
import type { ProviderId, Units } from "@/lib/types";
import { cn } from "@/utils/cn";
import { IconClose, IconPlug, IconSliders } from "./icons";
import { Panel } from "./Primitives";

/* ------------------------------------------------------------------ *
 * Live REST request console
 * ------------------------------------------------------------------ */

export function ApiConsole({
  latencyMs,
  requestCount,
  provider,
}: {
  latencyMs: number | null;
  requestCount: number;
  provider: ProviderId;
}) {
  const traces = useTraces();

  return (
    <Panel
      title="Network console · GET /rest"
      icon={<IconPlug size={14} />}
      meta={`${traces.length} in flight log`}
      bodyClassName="p-0"
    >
      <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
        {[
          { label: "Provider", value: provider === "openweathermap" ? "OpenWeatherMap" : "Open-Meteo" },
          { label: "Round trips", value: String(requestCount) },
          { label: "Last latency", value: latencyMs !== null ? `${latencyMs} ms` : "—" },
        ].map((cell) => (
          <div key={cell.label} className="px-4 py-2.5">
            <p className="label-mono">{cell.label}</p>
            <p className="mt-1 truncate font-display text-[15px] font-semibold text-white">{cell.value}</p>
          </div>
        ))}
      </div>

      <ul className="max-h-56 overflow-y-auto font-mono text-[11px]">
        {traces.length === 0 && (
          <li className="px-4 py-6 text-center text-white/40">
            No requests yet — search for a city to fire the pipeline.
          </li>
        )}
        {traces.map((trace) => (
          <li
            key={trace.id}
            className="flex items-center gap-3 border-b border-white/6 px-4 py-2 last:border-0 transition-colors duration-300 hover:bg-white/[0.05]"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                trace.state === "ok" && "bg-moss",
                trace.state === "error" && "bg-ember",
                trace.state === "pending" && "animate-pulse bg-signal",
              )}
            />
            <span className="shrink-0 text-white/45">{trace.method}</span>
            <span className="min-w-0 flex-1 truncate text-white/80">
              <span className="text-white/40">{trace.host}</span>
              {trace.path}
            </span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                trace.state === "ok" && "bg-moss/15 text-moss",
                trace.state === "error" && "bg-ember/15 text-ember",
                trace.state === "pending" && "bg-white/10 text-white/55",
              )}
            >
              {trace.state === "pending" ? "···" : (trace.status ?? trace.detail)}
            </span>
            <span className="w-14 shrink-0 text-right text-white/45">
              {trace.durationMs === null ? "—" : `${trace.durationMs}ms`}
            </span>
          </li>
        ))}
      </ul>

      <p className="border-t border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/30">
        query strings redacted · api keys never leave your browser
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ *
 * Settings dialog (API key + units)
 * ------------------------------------------------------------------ */

interface SettingsDialogProps {
  open: boolean;
  apiKey: string;
  units: Units;
  provider: ProviderId;
  onSaveKey: (key: string) => void;
  onUnits: (units: Units) => void;
  onClearRecents: () => void;
  onClose: () => void;
}

export function SettingsDialog({
  open,
  apiKey,
  units,
  provider,
  onSaveKey,
  onUnits,
  onClearRecents,
  onClose,
}: SettingsDialogProps) {
  const [draft, setDraft] = useState(apiKey);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(apiKey);
      setReveal(false);
    }
  }, [open, apiKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[rgba(3,9,16,0.72)] backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Data source settings"
        className="panel relative w-full max-w-xl overflow-hidden rounded-lg"
        style={{ animation: "none" }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]">
              <IconSliders size={15} />
            </span>
            <h2 className="label-mono !text-white/80">Data source settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <IconClose size={15} />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          <section>
            <label className="label-mono mb-2 block" htmlFor="owm-key">
              OpenWeatherMap API key
            </label>
            <div className="flex gap-2">
              <input
                id="owm-key"
                type={reveal ? "text" : "password"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="paste your key to switch providers"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded border border-white/15 bg-[rgba(4,12,20,0.6)] px-3 py-2 font-mono text-[12.5px] text-white placeholder:text-white/30 focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="shrink-0 rounded border border-white/15 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:border-white/35 hover:text-white"
              >
                {reveal ? "hide" : "show"}
              </button>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-white/50">
              Stored only in <code className="font-mono text-white/70">localStorage</code> on this device and
              sent directly to <code className="font-mono text-white/70">api.openweathermap.org</code>. You can
              also expose it as{" "}
              <code className="font-mono text-white/70">VITE_OPENWEATHER_API_KEY</code> at build time.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSaveKey(draft.trim())}
                className="rounded bg-[var(--accent)] px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#08131f] transition-transform duration-200 hover:-translate-y-px hover:brightness-110"
              >
                Save &amp; refetch
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  onSaveKey("");
                }}
                className="rounded border border-white/15 px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/65 transition-colors hover:border-white/35 hover:text-white"
              >
                Clear key
              </button>
              <a
                href="https://home.openweathermap.org/api_keys"
                target="_blank"
                rel="noreferrer noopener"
                className="rounded border border-white/15 px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/65 transition-colors hover:border-[var(--accent)] hover:text-white"
              >
                Get a key ↗
              </a>
            </div>
          </section>

          <section className="border-t border-white/10 pt-4">
            <p className="label-mono mb-2">Active provider</p>
            <p className="text-[13px] leading-relaxed text-white/70">
              {provider === "openweathermap" ? (
                <>
                  <span className="font-semibold text-white">OpenWeatherMap REST</span> —{" "}
                  <code className="font-mono text-[12px] text-white/60">/data/2.5/weather</code>,{" "}
                  <code className="font-mono text-[12px] text-white/60">/data/2.5/forecast</code>,{" "}
                  <code className="font-mono text-[12px] text-white/60">/data/2.5/air_pollution</code> and{" "}
                  <code className="font-mono text-[12px] text-white/60">/geo/1.0/direct</code>.
                </>
              ) : (
                <>
                  <span className="font-semibold text-white">Open-Meteo REST</span> (keyless fallback) —{" "}
                  <code className="font-mono text-[12px] text-white/60">/v1/forecast</code>,{" "}
                  <code className="font-mono text-[12px] text-white/60">/v1/air-quality</code> and the
                  geocoding API. Same UI contract, different payload shape — the adapter normalises both.
                </>
              )}
            </p>
          </section>

          <section className="border-t border-white/10 pt-4">
            <p className="label-mono mb-2">Units</p>
            <div className="inline-flex overflow-hidden rounded border border-white/15">
              {(["metric", "imperial"] as Units[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onUnits(option)}
                  className={cn(
                    "px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors duration-300",
                    units === option
                      ? "bg-[var(--accent)] text-[#08131f]"
                      : "text-white/60 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {option === "metric" ? "°C · km/h · mm" : "°F · mph · in"}
                </button>
              ))}
            </div>
          </section>

          <section className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClearRecents}
              className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/45 transition-colors hover:text-ember"
            >
              Clear saved searches
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
