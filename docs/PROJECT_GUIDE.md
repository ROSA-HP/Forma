# Forma — Project Guide

Forma ("Athletic OS") is a local-first strength & conditioning tracker. It runs as a
Progressive Web App in any modern browser and, from the same codebase, as a native
Android app packaged with Capacitor. There is **no backend**: every byte the user
creates stays on their device.

---

## 1. What the app does

| Area | Capability |
| --- | --- |
| Workouts | Live session with per-set logging (weight × reps, bodyweight, reps, duration, distance/time, rounds), warm-up/drop/failure tags, RPE, rest timer, round timer |
| Analytics | Weekly volume trend, muscle-load distribution across 18 muscles → 6 regions, balance score, fatigue/recovery estimate, athlete XP tiers |
| Records | Automatic PR detection (heaviest load, reps, Epley 1RM, volume), celebration timing setting |
| Planning | Exercise library with built-in + custom exercises, collections/routines with per-item sets/reps/rest/role, weekly schedules with reminders |
| History | Calendar month grid, sessions grouped per day, discipline filters, per-session summary and notes |
| Body | Body measurements (weight, chest, waist, arms, thighs), locations |
| Personalisation | kg/lb, dark/light/system theme, English + Arabic (full RTL), reduced motion, plate inventory, calorie estimates |
| Data | JSON backup/restore with validation, CSV export, storage-persistence request, full reset |
| Platform | Installable PWA, offline cache, Android APK via Capacitor, local notifications (web + native) |

---

## 2. Architecture at a glance

```
src/
├── App.tsx                 shell: routing between screens, lazy loading, providers
├── main.tsx                React root
├── index.css               Tailwind entry + design tokens (CSS variables)
├── screens/                10 full screens (Home, ActiveWorkout, Summary, Progress,
│                           Calendar, Library, CollectionDetail, AddEditExercise,
│                           Settings, Onboarding)
├── components/             reusable UI (BottomNav, headers, timers, hexagon, modals…)
├── context/AppContext.tsx  single source of truth: loads storage → exposes state + actions
├── domain/                 pure logic, no React, no I/O — fully unit-tested
│   ├── calculations.ts     ​1RM, volume, PRs, smart targets, muscle load, XP, streak
│   ├── analyticsCalculations.ts  calendar matrix, trends, tiers
│   ├── collectionCalculations.ts routine stats + filtering
│   ├── sessionCalculations.ts    durations, session summary, draft set builder
│   ├── dataTransfer.ts     import validation, CSV escaping, plate math, DB stats
│   └── constants.ts        defaults: settings, muscles, regions, bands
├── services/               side-effecting adapters
│   ├── storage.ts          IndexedDB + localStorage persistence
│   ├── notification.ts     web + native reminders and timer alerts
│   ├── keepAwake.ts        screen wake lock during workouts
│   ├── haptics.ts / sound.ts / share.ts
├── i18n/                   en.ts, ar.ts, getTranslations(), RTL direction
├── hooks/                  online status, PWA install prompt
├── data/seed.ts            demo exercises/collections/sessions for first run
└── types/index.ts          all domain types
```

**Rule of the codebase:** `domain/` is pure and tested; `services/` own the outside
world; screens never touch IndexedDB directly.

Data flow: `AppContext` calls `StorageService.init()` → loads settings, exercises,
collections, sessions, schedules, measurements, locations, achievements → keeps them
in React state → every mutation updates state *and* writes through to storage.

---

## 2b. Brand assets

The mark is a lime hexagon (the app's muscle-radar shape) with a lightning bolt cut
out of it, on `#0B0D10`.

| File | Purpose |
| --- | --- |
| `public/icon.svg` | primary mark, full-bleed dark background — used by the header and `favicon` |
| `public/logo-maskable.svg` | padded variant for the maskable PWA icon (80 % safe zone) |
| `docs/brand/logo-foreground.svg` | transparent foreground for the Android adaptive icon |

`node scripts/generate-icons.mjs` re-renders everything from those three SVGs:
PWA 192/512 + maskable 512, `apple-touch-icon.png` (180), `favicon.ico` (16/32/48),
Android `ic_launcher` / `ic_launcher_round` / `ic_launcher_foreground` for all five
densities, and the eleven splash screens. Colours: accent `#C8F31D`, background
`#0B0D10`. Edit the SVGs, run the script, then `npm run build && npx cap sync android`.

---

## 3. How data is stored

Two storage mechanisms, chosen per data shape.

### 3.1 IndexedDB — the structured data

Database **`trainlog_db`**, version **1**, one object store per entity, all keyed by `id`:

| Store | Contents |
| --- | --- |
| `exercises` | library entries (tracking type, muscles, equipment, rest, increments) |
| `collections` | routines with ordered `items[]` |
| `sessions` | finished workouts incl. every `sets[]` entry, RPE, notes, XP |
| `schedules` | weekly/cycle plans: `days[]`, `time`, `reminderOn`, `collectionId` |
| `measurements` | body metrics per date |
| `locations` | gym/home names |
| `achievements` | badges and progress |

Reads are ordered for display: sessions newest-first by `startedAt`, measurements
newest-first by `date`.

### 3.2 localStorage — small, hot values

| Key | Contents |
| --- | --- |
| `trainlog_settings` | user settings JSON; merged over `DEFAULT_SETTINGS` on read, so new settings keys are back-filled automatically and corrupt JSON falls back to defaults |
| `trainlog_active_draft` | the in-progress workout (sets, current exercise index, paused time) — survives an app kill/refresh so a workout isn't lost |

### 3.3 Backup, restore, export

- **`exportData()`** returns `{ version, exportedAt, settings, exercises, collections, sessions, schedules, measurements, locations, achievements }` — one JSON file.
- **`importData()`** first runs `validateImportPayload()`: version number, then the
  required fields and types of **every** record (exercise ids/names/categories,
  collection items, session `startedAt` parseable + every set's `id`/`exerciseId`/`done`,
  schedule `days[]` + `time`, locations, measurements, achievements). If anything is
  wrong it throws **before touching a single record**.
- Only after validation does it open **one `readwrite` transaction over all seven
  stores**, clearing and re-filling each. Settings are written after the transaction
  commits. A failed import therefore cannot leave half-old/half-new data.
- The UI downloads a safety backup of current data and asks for confirmation first.
- **CSV export** writes one row per set, escapes `"` by doubling it, and neutralizes
  formula injection by prefixing a `'` to values starting with `= + - @ \t \r`.
- **`navigator.storage.persist()`** is requested after onboarding; the granted/denied
  result is displayed in Settings → Data so the user knows whether the browser may
  evict data under storage pressure.

### 3.4 What changes on mobile (Capacitor)

The storage code is identical — Capacitor runs the same web app inside an Android
`WebView`, served from `https://localhost` out of the APK's assets. What changes is
*where that browser storage physically lives*:

| | Web (PWA) | Android (Capacitor) |
| --- | --- | --- |
| IndexedDB + localStorage location | browser profile for the site origin | app-private data directory (`/data/data/com.yourname.forma/…/app_webview`) |
| Survives app restart | yes | yes |
| Survives browser cache clear | no | n/a (not in a browser) |
| Survives "Clear data" / uninstall | no | **no** — uninstalling wipes it |
| Eviction risk | possible without `persist()` | low: private app storage isn't evicted like browser storage |
| Backup | JSON export file | same JSON export (share sheet / file) |

Practical consequence: on Android the JSON export is the **only** way to carry data to
a new install, and the same file restores into the web build (and vice-versa) because
the schema and validator are shared.

---

## 4. Web app → Android app: every step

### 4.1 Prerequisites

- **JDK 17–24** (Temurin 21 recommended). Android Studio's bundled JBR 25 is *too new*
  for this project's Gradle 8.14.3 — it fails with `Unsupported class file major version 69`.
- **Android SDK** with `platform-tools`, `build-tools` and a platform. AGP downloads
  missing components by itself once the SDK licences are accepted.
- `JAVA_HOME` → the JDK, `ANDROID_HOME` → the SDK.

### 4.2 Project changes

1. `capacitor.config.ts` — `appId: 'com.yourname.forma'`, `appName: 'Forma'`, `webDir: 'dist'`.
2. `npm install @capacitor/core @capacitor/cli @capacitor/local-notifications @capacitor/android`.
3. `@capacitor/local-notifications` is why `notification.ts` branches on
   `Capacitor.isNativePlatform()`: native schedules real OS notifications; web falls
   back to the service worker's `showNotification`.
4. `vite.config.ts` keeps `base: '/'` (Capacitor serves from the local-server root) and
   the web/PWA build stays the single source of truth.

### 4.3 Build chain

```bash
npm install              # once
npm run build            # → dist/ (React app + service worker + manifest)
npx cap add android      # once → generates android/ (Gradle project, MainActivity, manifest)
npx cap sync android     # after EVERY web build: copies dist/ + wires plugins
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk` (debug-signed, installable).

### 4.4 Native specifics that are generated for you

- The plugin's manifest merges `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`,
  `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` into the app manifest — no manual XML edits.
- `MainActivity` hosts the WebView; `android:supportsRtl="true"` keeps Arabic layout.
- Assets are copied to `android/app/src/main/assets/public`; the service worker also
  ships, but on native the app is already offline because everything is in the APK.

### 4.5 Install & iterate

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk   # USB device/emulator
```

Update loop after changing web code:

```bash
npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug)
```

### 4.6 Release build (Play Store or sideload)

Requires a keystore and a `signingConfigs` block:

```bash
keytool -genkey -v -keystore forma-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias forma
cd android && ./gradlew bundleRelease   # .aab for Play, or assembleRelease for a signed APK
```

Bump `versionCode`/`versionName` in `android/app/build.gradle` for each release.

---

## 5. Tests

`npm test` runs the whole suite with Node's built-in test runner via `tsx`.

| File | Covers |
| --- | --- |
| `domain/calculations.test.ts` | 1RM, tonnage, PR detection, smart targets, muscle load, recovery, XP, streak, conversions |
| `domain/analyticsCalculations.test.ts` | calendar grid, grouping, dominant category, volume trend, PRs, athlete tier |
| `domain/collectionCalculations.test.ts` | routine stats and search/filter/sort |
| `domain/sessionCalculations.test.ts` | duration formatting, session summary, initial sets |
| `domain/dataTransfer.test.ts` | plate math, CSV escaping, import validation, DB stats |
| `domain/i18n.test.ts` | Arabic parity with English, no empty strings |
| `services/storage.test.ts` | **persistence**: store creation, settings round-trip + defaults merge, CRUD, ordering, draft recovery, export shape, import replacement, full round-trip, rejected-import safety, CSV escaping, reset |
| `services/notification.test.ts` | **reminders**: stable ids per schedule/day, 32-bit range, no collision with timer ids |

`npm run lint` = `tsc --noEmit`. `npm run build` = production Vite build.

The storage suite uses `fake-indexeddb` plus a small `localStorage` shim, so it tests
the real service code in Node without a browser.

---

## 6. Known limitations

- Screen wake lock during workouts uses the browser Wake Lock API; Android WebView
  support is unreliable, so a native keep-awake plugin may be needed.
- Web reminders only fire while the app is open (service-worker limitation on mobile
  browsers); native reminders use exact alarms.
- The in-workout sets table scrolls horizontally inside its card on very narrow phones
  (six columns with 48 px touch targets do not fit 348 px).
- Import validation messages are English-only (they only appear for a corrupt file).
