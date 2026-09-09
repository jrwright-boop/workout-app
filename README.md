# Workout

A small, offline-first workout tracker built for the gym floor. Plan your training days, log sets against last session's numbers, and let the app tell you when it's time to add weight.

Runs as an installable PWA. All data lives on the device in `localStorage`; nothing is sent anywhere.

## Features

- **Days and exercises.** Build any split (Push / Pull / Legs, Upper / Lower, whatever). Reorder by drag, skip exercises without deleting them. Save a split as a **program** to switch between splits or share it as a link.
- **One exercise library.** Adding "Bench Press" to a second day picks it from the library, so history, charts, and records follow the lift across days. Editing the name or type updates every day; sets and target range stay per day.
- **Exercise types.** Plain weight, bodyweight (weight = added load), or **assisted** (weight = assistance, and progress means the number going *down*). Per-side for dumbbells, seconds for holds, and a custom weight step per exercise.
- **Target rep ranges and auto-progression.** Set 8–12 on an exercise and the row lights up green when you hit the top of the range on every set. Next session pre-fills one step heavier (or one step *less* assistance) and says why. Edit it if it's too much.
- **Pre-fill from last session, same day first.** A scheduled exercise pre-fills from the last time it was on *that day's* plan, so a heavy Monday never inherits Thursday's light numbers or a mid-week make-up. If the day has no history yet it falls back to any instance. The "Last" line also mentions a more recent result from another day or a make-up, so nothing is hidden.
- **Scheduled vs make-up.** Exercises added mid-workout (one at a time, or a whole missed day's plan) are tagged as make-ups automatically. They pre-fill from the most recent instance anywhere, show a tag in history, draw as hollow dots on charts, and can be filtered out of an exercise's history with one tap. Records are always all-time; the records row notes when this day's best differs.
- **Warm-up sets.** Tap a set number to mark it as a warm-up. Warm-ups are excluded from volume, records, and the progression check.
- **Personal records.** Heaviest, best estimated 1RM, most reps, longest hold, or least assistance, per exercise. The check button turns gold when a set beats one, and the workout summary lists them.
- **Plate calculator.** Tap "Plates" on any barbell exercise to see what to load per side. Bar weight is configurable in Settings.
- **Live session tools.** Rest timer with a wall-clock deadline (survives phone lock), workout timer, drop sets, per-exercise notes, add an exercise or a whole day's plan mid-workout.
- **History, calendar, and trends.** Month calendar with weekly stats and streak, searchable full history, edit past sets, per-exercise charts that change with the type (1RM and volume, or reps, or assistance with the axis flipped so down is good).
- **Workout summary.** Duration, sets, volume vs. last time, new records, and which exercises are ready to progress.
- **Real unit conversion.** The lbs/kg toggle converts every recorded weight (rounded to 0.25 lb / 0.1 kg). Settings has a "relabel only" option for data that was already entered in the other unit.
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

`AppState` (see `src/types/index.ts`) holds day templates, the active session, completed history, and saved programs. Sessions snapshot exercise names, target ranges, and type at start time so editing a template never rewrites the past. When history is *read* (charts, records, pre-fill) it's reinterpreted under the exercise's current type, so marking an old exercise "assisted" retroactively fixes its charts.

Exercise identity is the template id; the v5 migration gave same-named exercises across days one id and relinked history to it. Name matching (case-insensitive) is the fallback everywhere so one-off session exercises still count.

Every logged exercise carries an `origin` (`scheduled` or `makeup`) and lives inside a session that knows its `dayId`. Those two facts are what "same day first" pre-fill and the history filters use; there is one identity per exercise, never one per day. The v6 migration is purely additive: it tags each logged exercise by checking whether its session's day plan includes it, and touches nothing else (there is a test that proves the rest of the data round-trips unchanged).

`schemaVersion` gates migrations in `storage/localStorage.ts`; bump it and add a migration step when the shape changes. Stored and imported data is structurally validated; corrupt data lands on a recovery screen instead of a blank page.

### Service worker updates

`vite.config.ts` stamps `sw.js` with a unique build id so every deploy produces a byte-different worker. The app shows a "Reload" toast when a new version has installed.
