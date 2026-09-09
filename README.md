# Workout

A small, offline-first workout tracker built for the gym floor. Plan your training days, log sets against last session's numbers, and let the app tell you when it's time to add weight.

Runs as an installable PWA. All data lives on the device in `localStorage`; nothing is sent anywhere.

## Features

- **Days and exercises.** Build any split (Push / Pull / Legs, Upper / Lower, whatever). Reorder by drag, skip exercises without deleting them.
- **Target rep ranges.** Set 8–12 on an exercise and the row lights up green when you hit the top of the range on every set. That's your cue to add weight next time.
- **Pre-fill from last session.** Weights carry over from the last time you did the exercise (on any day). Reps show as placeholders you can accept with one tap.
- **Live session tools.** Rest timer with a wall-clock deadline (survives phone lock), workout timer, drop sets, per-exercise notes, add an exercise or a whole day's plan mid-workout.
- **History and trends.** Per-exercise estimated 1RM and volume charts, searchable full history, edit past sets.
- **Workout summary.** Duration, sets, volume vs. last time, and which exercises are ready to progress.
- **Backup / restore.** Export everything as JSON from Settings. The app nudges you when a backup is more than 30 days old.

## Development

```sh
npm install
npm run dev        # local dev server
npm test           # vitest
npm run lint
npm run build      # typecheck + production build into dist/
```

Pushes to `master` deploy to GitHub Pages via `.github/workflows/deploy.yml`. Pull requests run lint, tests, and build via `.github/workflows/ci.yml`.

## Project layout

```
src/
  reducers/workoutReducer.ts   all state transitions (pure, tested)
  storage/localStorage.ts      persistence, schema migrations, validation
  context/                     React context wiring
  components/                  UI, grouped by feature (days, exercises, sets, history, ...)
  utils/                       date, audio, rep-range helpers
public/sw.js                   service worker (cache-first for hashed assets)
```

### Data model

`AppState` (see `src/types/index.ts`) holds day templates, the active session, and completed history. Sessions snapshot exercise names and target ranges at start time so editing a template never rewrites the past. `schemaVersion` gates migrations in `storage/localStorage.ts`; bump it and add a migration step when the shape changes.

### Service worker updates

`vite.config.ts` stamps `sw.js` with a unique build id so every deploy produces a byte-different worker. The app shows a "Reload" toast when a new version has installed.
