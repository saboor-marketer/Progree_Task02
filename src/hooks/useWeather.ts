import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchWeather,
  resolveProvider,
  reverseGeocode,
  searchPlaces,
  WeatherError,
} from "@/lib/api";
import type { GeocodeHit, LoadPhase, Place, ProviderId, Units, WeatherBundle } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Persisted settings
 * ------------------------------------------------------------------ */

const LS = {
  key: "isobar.owm-key",
  units: "isobar.units",
  recent: "isobar.recent",
  place: "isobar.place",
} as const;

const ENV_KEY = String(
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_OPENWEATHER_API_KEY ?? "",
);

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — settings simply won't persist */
  }
}

export function useSettings() {
  const [apiKey, setApiKey] = useState<string>(() => readLocal(LS.key, ENV_KEY));
  const [units, setUnits] = useState<Units>(() => readLocal<Units>(LS.units, "metric"));

  useEffect(() => writeLocal(LS.key, apiKey), [apiKey]);
  useEffect(() => writeLocal(LS.units, units), [units]);

  const provider: ProviderId = useMemo(() => resolveProvider(apiKey), [apiKey]);

  return { apiKey, setApiKey, units, setUnits, provider };
}

export function useRecentPlaces() {
  const [recent, setRecent] = useState<Place[]>(() => readLocal<Place[]>(LS.recent, []));

  const remember = useCallback((place: Place) => {
    setRecent((prev) => {
      const next = [place, ...prev.filter((p) => p.id !== place.id)].slice(0, 6);
      writeLocal(LS.recent, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    writeLocal(LS.recent, []);
  }, []);

  return { recent, remember, clear };
}

/* ------------------------------------------------------------------ *
 * The main asynchronous data hook
 * ------------------------------------------------------------------ */

const REFRESH_MS = 10 * 60 * 1000;

interface UseWeatherResult {
  phase: LoadPhase;
  data: WeatherBundle | null;
  error: WeatherError | null;
  isRefreshing: boolean;
  latencyMs: number | null;
  requestCount: number;
  reload: () => void;
}

export function useWeather(
  place: Place | null,
  provider: ProviderId,
  apiKey: string,
): UseWeatherResult {
  const [phase, setPhase] = useState<LoadPhase>("idle");
  const [data, setData] = useState<WeatherBundle | null>(null);
  const [error, setError] = useState<WeatherError | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [nonce, setNonce] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const dataRef = useRef<WeatherBundle | null>(null);
  dataRef.current = data;

  useEffect(() => {
    if (!place) {
      setPhase("idle");
      setData(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const started = performance.now();
    // Only show the full skeleton for a cold load; background refreshes keep
    // the previous payload on screen with a subtle progress indicator.
    const cold = dataRef.current === null;
    setRefreshing(!cold);
    if (cold) setPhase("loading");

    fetchWeather(place, provider, apiKey, controller.signal)
      .then((bundle) => {
        if (controller.signal.aborted) return;
        setData(bundle);
        setError(null);
        setPhase("ready");
        setLatencyMs(Math.round(performance.now() - started));
        setRequestCount((n) => n + 1);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || err instanceof WeatherError && err.code === "cancelled") return;
        setError(err instanceof WeatherError ? err : new WeatherError("unknown", String(err)));
        setPhase(dataRef.current ? "ready" : "error");
        setLatencyMs(Math.round(performance.now() - started));
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.id, place?.lat, place?.lon, provider, apiKey, nonce]);

  // Quiet background refresh so the board never goes stale.
  useEffect(() => {
    if (!place) return;
    const id = window.setInterval(() => setNonce((n) => n + 1), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [place?.id]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { phase, data, error, isRefreshing, latencyMs, requestCount, reload };
}

/* ------------------------------------------------------------------ *
 * Debounced type-ahead geocoding
 * ------------------------------------------------------------------ */

export function usePlaceSearch(query: string, provider: ProviderId, apiKey: string, active: boolean) {
  const [results, setResults] = useState<GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!active || q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const debounce = window.setTimeout(() => {
      setSearching(true);
      searchPlaces(q, provider, apiKey, controller.signal)
        .then((hits) => {
          setResults(hits);
          setSearchError(null);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setSearchError(err instanceof Error ? err.message : "Search failed");
        })
        .finally(() => !controller.signal.aborted && setSearching(false));
    }, 280);

    return () => {
      window.clearTimeout(debounce);
      controller.abort();
    };
  }, [query, provider, apiKey, active]);

  return { results, searching, searchError };
}

/* ------------------------------------------------------------------ *
 * Browser geolocation → place
 * ------------------------------------------------------------------ */

export function useGeolocate(provider: ProviderId, apiKey: string) {
  const [state, setState] = useState<{ pending: boolean; error: string | null }>({
    pending: false,
    error: null,
  });

  const locate = useCallback(async (): Promise<Place | null> => {
    if (!("geolocation" in navigator)) {
      setState({ pending: false, error: "This browser does not expose a geolocation API." });
      return null;
    }
    setState({ pending: true, error: null });

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const place = await reverseGeocode(latitude, longitude, provider, apiKey);
          setState({ pending: false, error: null });
          resolve(place);
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied — search for a city instead."
              : "Could not determine your position right now.";
          setState({ pending: false, error: message });
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    });
  }, [provider, apiKey]);

  return { ...state, locate };
}

/* ------------------------------------------------------------------ *
 * Persistence of the active place
 * ------------------------------------------------------------------ */

export function useStoredPlace(defaultPlace: Place): [Place | null, (p: Place | null) => void] {
  const [place, setPlace] = useState<Place | null>(() =>
    readLocal<Place | null>(LS.place, defaultPlace),
  );
  const update = useCallback((next: Place | null) => {
    setPlace(next);
    writeLocal(LS.place, next);
  }, []);
  return [place, update];
}
