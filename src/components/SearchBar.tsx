import { useEffect, useMemo, useRef, useState } from "react";
import { CURATED_PLACES, searchPlaces } from "@/lib/api";
import { usePlaceSearch } from "@/hooks/useWeather";
import type { GeocodeHit, Place, ProviderId } from "@/lib/types";
import { cn } from "@/utils/cn";
import { IconArrowRight, IconClose, IconCrosshair, IconSearch } from "./icons";

interface SearchBarProps {
  provider: ProviderId;
  apiKey: string;
  recent: Place[];
  activeId?: string;
  locating: boolean;
  onLocate: () => void;
  onSelect: (place: Place) => void;
}

export function SearchBar({
  provider,
  apiKey,
  recent,
  activeId,
  locating,
  onLocate,
  onSelect,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, searching, searchError } = usePlaceSearch(query, provider, apiKey, open);

  const suggestions = useMemo(() => {
    if (query.trim().length < 2) return recent.map(toHit);
    return results;
  }, [query, recent, results]);

  useEffect(() => setCursor(0), [suggestions.length, query]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const onSlash = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onSlash);
    return () => document.removeEventListener("keydown", onSlash);
  }, []);

  const commit = (hit: GeocodeHit) => {
    onSelect({
      id: hit.id,
      name: hit.name,
      admin: hit.admin,
      country: hit.country,
      countryCode: hit.countryCode,
      lat: hit.lat,
      lon: hit.lon,
    });
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const submit = async () => {
    const q = query.trim();
    if (!q) return;
    setSubmitting(true);
    try {
      const hits = await searchPlaces(q, provider, apiKey);
      if (hits[0]) commit(hits[0]);
    } catch {
      /* surfaced through searchError / the global error state */
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(c + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (suggestions[cursor]) commit(suggestions[cursor]);
      else void submit();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={shellRef} className="relative w-full">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-[rgba(6,15,24,0.55)] px-3 py-2 backdrop-blur-md",
          "transition-all duration-300",
          open ? "border-[var(--accent)]/70 shadow-[0_0_0_3px_rgba(255,176,32,0.12)]" : "border-white/15",
        )}
      >
        <span className={cn("shrink-0 text-white/45", (searching || submitting) && "animate-pulse text-[var(--accent)]")}>
          <IconSearch size={17} />
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search any city, airport or region…"
          aria-label="Search for a location"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent font-sans text-[14.5px] text-white placeholder:text-white/35 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Clear search"
          >
            <IconClose size={14} />
          </button>
        )}
        <kbd className="hidden shrink-0 rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/40 sm:block">
          /
        </kbd>
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
            "text-white/70 transition-all duration-300 hover:border-[var(--accent)] hover:bg-[var(--accent)]/12 hover:text-white",
            locating && "animate-pulse opacity-60",
          )}
          title="Use my location"
        >
          <IconCrosshair size={13} className={locating ? "animate-spin-slow" : undefined} />
          <span className="hidden sm:inline">{locating ? "locating" : "locate"}</span>
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-md border border-white/15 bg-[rgba(5,13,21,0.94)] shadow-[0_30px_70px_-30px_rgba(0,0,0,1)] backdrop-blur-xl">
          {query.trim().length < 2 ? (
            <div className="p-3">
              <p className="label-mono mb-2.5">{recent.length ? "Recently checked" : "Try one of these"}</p>
              <div className="flex flex-wrap gap-1.5">
                {(recent.length ? recent : CURATED_PLACES).map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => commit(toHit(place))}
                    className={cn(
                      "rounded border px-2.5 py-1.5 text-left text-[12.5px] transition-all duration-300",
                      place.id === activeId
                        ? "border-[var(--accent)]/70 bg-[var(--accent)]/15 text-white"
                        : "border-white/12 bg-white/[0.04] text-white/70 hover:-translate-y-px hover:border-white/30 hover:text-white",
                    )}
                  >
                    <span className="font-medium">{place.name}</span>
                    {place.country && (
                      <span className="ml-1.5 font-mono text-[10px] text-white/40">
                        {place.countryCode ?? place.country}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="max-h-[19rem] overflow-y-auto py-1">
              {searching && suggestions.length === 0 && (
                <li className="space-y-2 px-3 py-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-3.5 animate-pulse rounded bg-white/10"
                      style={{ width: `${88 - i * 17}%`, animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </li>
              )}
              {!searching && suggestions.length === 0 && (
                <li className="px-3 py-4 text-[13px] text-white/55">
                  {searchError ?? `No matches for “${query.trim()}”.`}
                </li>
              )}
              {suggestions.map((hit, index) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => commit(hit)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-200",
                      index === cursor ? "bg-[var(--accent)]/14" : "hover:bg-white/6",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-white">{hit.name}</span>
                      <span className="block truncate font-mono text-[10.5px] text-white/45">
                        {[hit.admin, hit.country].filter(Boolean).join(" · ") || "—"} ·{" "}
                        {hit.lat.toFixed(2)}, {hit.lon.toFixed(2)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 transition-all duration-300",
                        index === cursor ? "translate-x-0 text-[var(--accent)] opacity-100" : "-translate-x-1 opacity-0",
                      )}
                    >
                      <IconArrowRight size={15} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function toHit(place: Place): GeocodeHit {
  return { ...place, label: place.name };
}
