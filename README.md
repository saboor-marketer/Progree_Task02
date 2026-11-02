# Isobar — Asynchronous REST Weather Portal

A single-page, data-driven weather client. Every pixel of the interface is rendered from live
`fetch()` calls to public REST endpoints — current conditions, an hourly series, a multi-day
outlook and air quality — with real loading, retry, offline and crash states wired in.

![stack](https://img.shields.io/badge/React_19-61dafb) ![stack](https://img.shields.io/badge/Vite_7-646cff) ![stack](https://img.shields.io/badge/Tailwind_CSS_4-38bdf8) ![stack](https://img.shields.io/badge/TypeScript_5-3178c6)

---

## What it does

| Area | Behaviour |
| --- | --- |
| **Search** | Debounced (280 ms) type-ahead geocoding with full keyboard navigation (`↑ ↓ ⏎ Esc`, `/` to focus). |
| **Geolocation** | One-click "locate me" via `navigator.geolocation`, resolved back to a place name with reverse geocoding. |
| **Current conditions** | Temperature (animated count-up), feels-like, high/low, wind vector on a live compass, humidity, pressure, visibility, cloud cover, UV index, US EPA air quality. |
| **Solar track** | SVG sun arc showing the sun's position between sunrise and sunset — flips to a night arc after dusk. |
| **Hourly series** | Horizontally scrollable strip with an animated temperature curve drawn from the payload plus per-hour precipitation probability bars. |
| **Multi-day outlook** | 7 days (Open-Meteo) or 5 days (OpenWeatherMap), each row with a temperature range bar scaled against the whole week. |
| **Network console** | Live log of every REST call: host, path, HTTP status, duration. Query strings are redacted; keys never leave the browser. |
| **Ambient sky** | The whole backdrop — palette, sun/moon, cloud drift, rain, snow, lightning, stars — is derived from the returned condition code and local day/night, and cross-fades when it changes. |
| **Units** | Metric ⇄ Imperial toggle, converted client-side (no extra request). |
| **Persistence** | API key, units, last station and recent searches survive reloads through `localStorage`. |
| **Auto-refresh** | Silent background refetch every 10 minutes; the previous payload stays on screen while refreshing. |

---

## Quick start

```bash
npm install        # install dependencies
npm run dev        # start the Vite dev server (http://localhost:5173)
npm run build      # production build → dist/
npm run preview    # serve the production build locally
```

The app runs **out of the box with no API key** against the keyless Open-Meteo REST API.

### Using your own OpenWeatherMap key

Paste a key into the in-app settings dialog (sliders icon, top right) — it is stored in
`localStorage` only — **or** provide it at build time:

```bash
# .env.local
VITE_OPENWEATHER_API_KEY=your_key_here
```

As soon as a key longer than 8 characters is present, the provider switches automatically from
`open-meteo` to `openweathermap` and the request pipeline changes shape accordingly. New
OpenWeatherMap keys can take up to two hours to activate; a `401` in the network console usually
means "not yet", not "wrong".

---

## Architecture

```
index.html                    fonts + document shell
src/
├── main.tsx                  React root, wrapped in <ErrorBoundary>
├── App.tsx                   composition root: header, status ticker, phase routing, footer
├── index.css                 Tailwind v4 theme, keyframes, custom utilities (.panel, .corner-ticks, …)
├── hooks/
│   ├── useWeather.ts         settings, recent places, geolocation, the core async data hook
│   └── useUi.ts              scroll reveal, count-up tween, reduced-motion, request-trace feed
├── lib/
│   ├── api.ts                fetch transport, timeouts, error taxonomy, provider adapters, tracing
│   ├── conditions.ts         WMO/OWM code → condition mapping, sky palettes, AQI + UV bands
│   ├── format.ts             timezone-aware Intl formatting and SI → imperial conversions
│   └── types.ts              the single normalised domain model shared by every provider
└── components/
    ├── SkyScene.tsx          animated, condition-reactive ambient backdrop
    ├── CurrentBoard.tsx      hero observation readout
    ├── Dials.tsx             sun arc, wind compass, arc gauge
    ├── HourlyStrip.tsx       scrollable hourly series + SVG temperature curve
    ├── ForecastWeek.tsx      multi-day outlook rows
    ├── DetailsGrid.tsx       metric bento (humidity, pressure, visibility, UV, AQI…)
    ├── ApiPanel.tsx          network console + settings dialog
    ├── SearchBar.tsx         type-ahead geocoding with keyboard support
    ├── StatusViews.tsx       idle, loading skeleton, error and error-banner states
    ├── ErrorBoundary.tsx     render-crash containment
    ├── Primitives.tsx        Panel, StatTile, Meter, Reveal
    └── icons.tsx             hand-drawn inline SVG icon set + animated weather glyphs
```

### The asynchronous pipeline

```
user action (search / locate / retry / auto-refresh)
        │
        ▼
useWeather(place, provider, apiKey)
        │  aborts the in-flight AbortController for the previous place
        ▼
fetchWeather() ──► Promise.allSettled([ ... ])
        │             ├─ GET current conditions      (required)
        │             ├─ GET hourly / 3-hourly series (required)
        │             └─ GET air quality              (optional — failures are swallowed)
        ▼
adapter normalises the payload into WeatherBundle
        ▼
React state: { phase: loading | ready | error, data, error, isRefreshing, latencyMs }
        ▼
UI renders; every request is mirrored into the network console via subscribeTraces()
```

Design decisions worth calling out:

- **One normalised model.** `WeatherBundle` is the only shape the UI knows. Adding a third
  provider means writing one adapter and nothing else.
- **`Promise.allSettled`, not `Promise.all`.** Air quality is a nice-to-have; a 4xx on that
  endpoint must not take down the temperature.
- **Race-condition safety.** Each load creates its own `AbortController`; a stale response for a
  previous city can never overwrite a newer one.
- **Cold load vs. background refresh.** The skeleton only appears when there is no data yet —
  otherwise the old payload stays visible behind a subtle spinner.
- **Errors are typed.** `WeatherError` carries a `code` (`unauthorized`, `not-found`,
  `rate-limit`, `timeout`, `network`, `server`, `parse`…) that maps to human copy, so the UI never
  prints a raw stack trace at a user.
- **Timezones are respected.** Providers return either an IANA zone or a UTC offset; both are
  normalised so "16:00" always means 16:00 *at the station*, not at your desk.

---

## Endpoints

### OpenWeatherMap (with key)

| Purpose | Request |
| --- | --- |
| Current conditions | `GET https://api.openweathermap.org/data/2.5/weather?lat=&lon=&appid=&units=metric` |
| 5 day / 3 hour series | `GET https://api.openweathermap.org/data/2.5/forecast?lat=&lon=&appid=&units=metric&cnt=40` |
| Air pollution | `GET https://api.openweathermap.org/data/2.5/air_pollution?lat=&lon=&appid=` |
| Geocoding | `GET https://api.openweathermap.org/geo/1.0/direct?q=&limit=6&appid=` |
| Reverse geocoding | `GET https://api.openweathermap.org/geo/1.0/reverse?lat=&lon=&limit=1&appid=` |

Raw pollutant concentrations are converted to a **US EPA AQI** in-app using the standard
breakpoint tables for PM2.5, PM10, O₃ and NO₂ (`computeUsAqi` in `src/lib/api.ts`).

### Open-Meteo (keyless fallback)

| Purpose | Request |
| --- | --- |
| Forecast | `GET https://api.open-meteo.com/v1/forecast?latitude=&longitude=&current=…&hourly=…&daily=…&wind_speed_unit=ms&timezone=auto` |
| Air quality | `GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude=&longitude=&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide` |
| Geocoding | `GET https://geocoding-api.open-meteo.com/v1/search?name=&count=6&language=en&format=json` |
| Reverse geocoding | `GET https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=&longitude=` |

WMO weather interpretation codes are mapped to condition families in `src/lib/conditions.ts`.

---

## State handling

| State | Trigger | What you see |
| --- | --- | --- |
| `idle` | No station selected (footer → *reset station*) | Cold-start panel with one-click stations |
| `loading` | First fetch for a station | Skeleton that mirrors the real layout, plus the endpoint list being called |
| `ready` | Payload resolved | Full board |
| `error` (blocking) | No data on screen | Error card with the failure code, a human explanation and retry / settings actions |
| `error` (background) | Data already on screen | Non-blocking banner, stale payload retained |
| offline | `navigator.onLine === false` | Persistent warning strip; requests fail fast |
| render crash | Component throws | `<ErrorBoundary>` fallback with reload / reset |

All requests time out after **12 seconds** via `AbortController`. `prefers-reduced-motion`
disables every animation, including the count-up tweens and the ambient sky.

---

## Notes

- **Type system:** strict TypeScript (`strict`, `noUnusedLocals`, `noUnusedParameters`).
- **Styling:** Tailwind CSS v4 with a `@theme` token layer; no component library, no icon
  package — the icons and weather glyphs are hand-written inline SVG.
- **Fonts:** Bricolage Grotesque (display), DM Sans (text), IBM Plex Mono (data readouts).
- **No backend.** Nothing is proxied or stored server-side; the browser talks to the providers
  directly and CORS is enabled on all of them.

## Attribution

Weather data © [OpenWeatherMap](https://openweathermap.org/) and
[Open-Meteo](https://open-meteo.com/) (open data from national weather services, DWD, NOAA and
Météo-France). Reverse geocoding © [BigDataCloud](https://www.bigdatacloud.com/). Air quality
indices follow the US EPA AQI specification.
