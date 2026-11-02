import { useCallback, useEffect, useState } from "react";
import { ApiConsole, SettingsDialog } from "@/components/ApiPanel";
import { CurrentBoard } from "@/components/CurrentBoard";
import { DetailsGrid } from "@/components/DetailsGrid";
import { ForecastWeek } from "@/components/ForecastWeek";
import { HourlyStrip } from "@/components/HourlyStrip";
import { IconRefresh, IconSliders } from "@/components/icons";
import { Reveal } from "@/components/Primitives";
import { SearchBar } from "@/components/SearchBar";
import { SkyScene } from "@/components/SkyScene";
import { ErrorBanner, ErrorState, IdleState, LoadingState } from "@/components/StatusViews";
import { useNow } from "@/hooks/useUi";
import {
  useGeolocate,
  useRecentPlaces,
  useSettings,
  useStoredPlace,
  useWeather,
} from "@/hooks/useWeather";
import { CURATED_PLACES, clearTraces } from "@/lib/api";
import { IDLE_THEME, skyTheme } from "@/lib/conditions";
import { relativeTime } from "@/lib/format";
import type { Place, Units } from "@/lib/types";
import { cn } from "@/utils/cn";

function isDaylightByBrowserClock(): boolean {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 20;
}

export default function App() {
  const { apiKey, setApiKey, units, setUnits, provider } = useSettings();
  const [place, setPlace] = useStoredPlace(CURATED_PLACES[0]);
  const { recent, remember, clear: clearRecents } = useRecentPlaces();
  const { pending: locating, error: geoError, locate } = useGeolocate(provider, apiKey);
  const { phase, data, error, isRefreshing, latencyMs, requestCount, reload } = useWeather(
    place,
    provider,
    apiKey,
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const now = useNow(20_000);

  /* ---------------- connectivity awareness ---------------- */
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  /* ---------------- theme propagation ---------------- */
  const kind = data?.current.kind ?? "clouds";
  const isDay = data?.current.isDay ?? isDaylightByBrowserClock();
  const theme = data ? skyTheme(kind, isDay) : IDLE_THEME;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--sky-glow", theme.glow);
    root.style.setProperty("--sky-top", theme.top);
    root.style.setProperty("--sky-mid", theme.mid);
    root.style.setProperty("--sky-low", theme.low);
    root.style.setProperty("--sky-horizon", theme.horizon);
    root.style.backgroundColor = theme.top;
  }, [theme]);

  const handleSelect = useCallback(
    (next: Place) => {
      setPlace(next);
      remember(next);
      setBannerDismissed(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setPlace, remember],
  );

  const handleLocate = useCallback(async () => {
    const located = await locate();
    if (located) handleSelect(located);
  }, [locate, handleSelect]);

  const handleUnits = useCallback(
    (next: Units) => {
      setUnits(next);
    },
    [setUnits],
  );

  const showBanner = Boolean(error && data && !bannerDismissed);

  return (
    <div className="relative min-h-screen">
      <SkyScene kind={kind} isDay={isDay} theme={theme} />

      {/* ------------------------------- header ------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(6,14,22,0.55)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-5">
          <div className="flex items-center gap-3">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.06]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="8.4" stroke="var(--accent)" strokeWidth="1.4" />
                <path d="M12 12 16.6 8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                <path
                  d="M5.2 15.6h3l1.6-3.2 1.8 5.2 1.8-7.2 1.5 5.2h3.4"
                  stroke="var(--accent)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
              </svg>
              <span className="absolute inset-0 -z-10 rounded-md blur-md" style={{ background: theme.glow }} />
            </span>
            <div className="leading-none">
              <p className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-white">
                Isobar
              </p>
              <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
                async rest weather portal
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <SearchBar
              provider={provider}
              apiKey={apiKey}
              recent={recent}
              activeId={place?.id}
              locating={locating}
              onLocate={handleLocate}
              onSelect={handleSelect}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex overflow-hidden rounded border border-white/15">
              {(["metric", "imperial"] as Units[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleUnits(option)}
                  aria-pressed={units === option}
                  className={cn(
                    "px-3 py-2 font-mono text-[11px] tracking-[0.08em] transition-colors duration-300",
                    units === option
                      ? "bg-[var(--accent)] text-[#08131f]"
                      : "text-white/55 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {option === "metric" ? "°C" : "°F"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={reload}
              disabled={!place || isRefreshing}
              title="Refresh now"
              className="grid h-[38px] w-[38px] place-items-center rounded border border-white/15 text-white/65 transition-all duration-300 hover:border-[var(--accent)] hover:bg-[var(--accent)]/12 hover:text-white disabled:opacity-40"
            >
              <IconRefresh size={16} className={isRefreshing ? "animate-spin" : undefined} />
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Data source settings"
              className="grid h-[38px] w-[38px] place-items-center rounded border border-white/15 text-white/65 transition-all duration-300 hover:border-[var(--accent)] hover:bg-[var(--accent)]/12 hover:text-white"
            >
              <IconSliders size={16} />
            </button>
          </div>
        </div>

        {/* status ticker */}
        <div className="border-t border-white/8 bg-[rgba(4,10,17,0.45)]">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 sm:px-6">
            <StatusDot state={phase} refreshing={isRefreshing} />
            <span className="text-white/70">
              {provider === "openweathermap" ? "openweathermap" : "open-meteo"}
            </span>
            <span className={cn(!online && "text-ember")}>{online ? "online" : "offline"}</span>
            <span>{latencyMs !== null ? `${latencyMs}ms` : "—"}</span>
            <span className="hidden sm:inline">{requestCount} fetch cycles</span>
            <span className="ml-auto hidden md:inline">
              {data ? `synced ${relativeTime(data.fetchedAt, now)}` : "awaiting payload"}
            </span>
          </div>
        </div>
      </header>

      {/* -------------------------------- main -------------------------------- */}
      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6">
        {!online && (
          <div className="mb-3.5 rounded-md border border-ember/45 bg-[rgba(255,122,69,0.12)] px-4 py-2.5 text-[12.5px] text-white/80">
            <span className="font-semibold text-white">You are offline.</span> Requests will fail until the
            connection returns — the last good payload stays on screen.
          </div>
        )}

        {geoError && (
          <div className="mb-3.5 rounded-md border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[12.5px] text-white/75">
            {geoError}
          </div>
        )}

        {showBanner && error && (
          <div className="mb-3.5">
            <ErrorBanner
              error={error}
              onDismiss={() => setBannerDismissed(true)}
              onRetry={() => {
                setBannerDismissed(true);
                reload();
              }}
            />
          </div>
        )}

        {phase === "error" && error ? (
          <ErrorState error={error} onRetry={reload} onSettings={() => setSettingsOpen(true)} />
        ) : phase === "idle" ? (
          <IdleState onPick={handleSelect} />
        ) : phase === "loading" || !data ? (
          <LoadingState
            label={
              provider === "openweathermap"
                ? "GET /weather · /forecast · /air_pollution"
                : "GET /v1/forecast · /v1/air-quality"
            }
          />
        ) : (
          <div className="space-y-3.5">
            <CurrentBoard bundle={data} units={units} />

            <Reveal delay={80}>
              <HourlyStrip bundle={data} units={units} />
            </Reveal>

            <Reveal delay={120}>
              <DetailsGrid bundle={data} units={units} />
            </Reveal>

            <div className="grid gap-3.5 xl:grid-cols-12">
              <Reveal delay={160} className="xl:col-span-8">
                <ForecastWeek bundle={data} units={units} />
              </Reveal>
              <Reveal delay={200} className="xl:col-span-4">
                <ApiConsole latencyMs={latencyMs} requestCount={requestCount} provider={provider} />
              </Reveal>
            </div>
          </div>
        )}

        {/* ------------------------------- footer ------------------------------- */}
        <footer className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-lg">
              <p className="font-display text-lg font-bold tracking-tight text-white">Isobar</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">
                A single-page weather client built around asynchronous REST calls, AbortController-driven
                request cancellation, provider adapters and resilient error states. Data belongs to the
                respective provider and is fetched live in your browser.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                <button
                  type="button"
                  onClick={() => {
                    clearTraces();
                  }}
                  className="rounded border border-white/12 px-2.5 py-1 text-white/45 transition-colors hover:border-white/30 hover:text-white"
                >
                  clear console
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlace(null);
                    clearRecents();
                  }}
                  className="rounded border border-white/12 px-2.5 py-1 text-white/45 transition-colors hover:border-white/30 hover:text-white"
                >
                  reset station
                </button>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 font-mono text-[11px] sm:grid-cols-3">
              {[
                { k: "endpoints", v: provider === "openweathermap" ? "4 REST" : "3 REST" },
                { k: "transport", v: "fetch + async/await" },
                { k: "caching", v: "localStorage" },
                { k: "refresh", v: "10 min auto" },
                { k: "timeout", v: "12 s" },
                { k: "build", v: "react + vite" },
              ].map((item) => (
                <div key={item.k}>
                  <dt className="text-[9.5px] uppercase tracking-[0.16em] text-white/35">{item.k}</dt>
                  <dd className="mt-1 text-white/70">{item.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-white/25">
            {provider === "openweathermap"
              ? "© openweathermap.org · data not stored server-side"
              : "© open-meteo.com · attribution required for non-commercial use"}
          </p>
        </footer>
      </main>

      <SettingsDialog
        open={settingsOpen}
        apiKey={apiKey}
        units={units}
        provider={provider}
        onSaveKey={(key) => {
          setApiKey(key);
          setSettingsOpen(false);
        }}
        onUnits={handleUnits}
        onClearRecents={clearRecents}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

function StatusDot({
  state,
  refreshing,
}: {
  state: "idle" | "loading" | "ready" | "error";
  refreshing: boolean;
}) {
  const active = state === "loading" || refreshing;
  const tone =
    state === "error" ? "bg-ember" : active ? "bg-signal" : "bg-moss";
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", tone, active && "animate-pulse")} />
      {state === "error" ? "error" : active ? "fetching" : "ready"}
    </span>
  );
}
