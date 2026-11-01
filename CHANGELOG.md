# Changelog

## v1.1.1 — 2026-11-01

### Seamless launch on Android
- The native launch screen and the animated splash now start from the **same frame**: the same logo,
  the same 112 dp size, centred on the same point. The handoff is invisible, and the animation
  (pulse, expanding ring, F-O-R-M-A letters, sweep line) plays from exactly where the logo already is.
- No more blank frame between the two: the splash is now static markup in `index.html`, so it paints
  before any JavaScript loads, and Android keeps its splash up until that frame has been drawn
  (3-second safety limit).
- The web logo is shifted by the WebView's measured offset from the screen centre, so the two line up
  even on Android 12–14 where the app area sits below the status bar.
- The window behind the app is brand black (no white flash), and the WebView background is black
  while the page loads.

## v1.1.0 — 2026-11-01

### Design
- **Reworked light theme.** Cooler background with white cards lifted by a soft shadow, brand-lime fills
  with dark text, and a deep-green "ink" accent for text, icons and outlines so everything stays readable.
- **Theme tokens are now real Tailwind colours.** ~80 classes such as `bg-app-accent/15`, `border-app/60`
  and every `hover:` token variant previously generated no CSS at all; selected states, tints and hover
  feedback now work in both themes.
- Refreshed category palette with dedicated discipline icons on category chips (labels stay translated).
- Calendar legend and filters use the shared category palette and translated labels.
- Launch splash is always the black brand screen and removes itself once finished.

### Home screen shows your real training
- Weekly strip, trained days vs. goal, weekly volume (kg or lb) and PRs this week are computed from
  your sessions (they were fixed placeholder numbers).
- Physiological readiness is computed from when each muscle was last trained.
- Routine card shows exercise names, category, goal and an estimated duration.

### Calculation fixes
- **lb ↔ kg drift:** pounds were stored rounded to 0.1 kg, so 225 lb re-displayed as 225.1 lb and the
  error compounded with every +5 lb step. Conversions now use the exact 0.45359237 factor and keep
  gram precision.
- **Repeated PR celebrations:** after a PR, every later set of the same exercise re-triggered it.
  Only records that the completed set creates or improves are celebrated now.
- **First log is a baseline:** logging an exercise for the first time no longer counts as a PR.
- **Rest timer** uses the routine's prescribed rest, then the exercise's default rest
  (was always 90 s / 60 s).
- **Workout summary:** older sessions now show their muscle-load distribution (was all zero), and
  their PRs are judged only against earlier sessions.
- **Streak** is no longer capped at 90 days.
- **Warm-up sets** are excluded from weekly volume trend, all-time records, lifetime volume and calendar
  day volume; assisted (negative-load) sets no longer subtract from lifetime volume.
- All-time 1RM uses the same Epley estimate (with the 12-rep reliability cap) as the workout screen.
- PR dates, CSV export dates and backup file names use your local calendar day instead of UTC.

### Android
- Added the `VIBRATE` permission — set, timer and PR haptics were silently doing nothing in the APK.
- Status/navigation bar icons follow the in-app light/dark theme.
- "System" theme now follows OS dark/light changes live.
- App version shown in Settings comes from `package.json`; Android `versionCode 2` / `versionName 1.1.0`.

### Fixes
- Restored ~60 English Settings strings that had been deleted, which broke the TypeScript build.
- Fixed a React Rules-of-Hooks violation in the active workout screen.
- Fixed a misplaced React `key` in the library category filter and an invalid Tailwind class.
