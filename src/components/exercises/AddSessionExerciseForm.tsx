import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { useWorkout } from '../../hooks/useWorkout';
import { wasPerformed } from '../../utils/exerciseHistory';
import type { DayId, ExerciseId, SessionExercise } from '../../types';
import './ExerciseForm.css';
import './AddSessionExerciseForm.css';

interface AddSessionExerciseFormProps {
  open: boolean;
  onClose: () => void;
}

interface Suggestion {
  exerciseId: ExerciseId | null;
  name: string;
  defaultSetCount: number;
  dayName: string | null;
  lastEx: SessionExercise | null;
}

function formatLastSets(ex: SessionExercise): string {
  return ex.sets
    .filter(s => s.weight != null && s.reps != null)
    .map(s => `${s.weight}x${s.reps}`)
    .join(', ');
}

export function AddSessionExerciseForm({ open, onClose }: AddSessionExerciseFormProps) {
  const { state, dispatch } = useWorkout();
  const [name, setName] = useState('');
  const [setCount, setSetCount] = useState(3);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const session = state.activeSession;

  // Build a deduped suggestion list from day templates + history, excluding
  // exercises already present in the current session.
  const knownExercises = useMemo<Suggestion[]>(() => {
    if (!session) return [];
    const currentIds = new Set(session.exercises.map(e => e.exerciseId));
    const coveredNames = new Set(session.exercises.map(e => e.name.toLowerCase()));

    // Start with all day templates (each carries a stable exerciseId).
    const templates = new Map<ExerciseId, Suggestion>();
    for (const dayId of state.dayOrder) {
      const day = state.days[dayId];
      for (const exId of day.exerciseOrder) {
        const ex = day.exercises[exId];
        if (currentIds.has(ex.id)) continue;
        if (templates.has(ex.id)) continue;
        templates.set(ex.id, {
          exerciseId: ex.id,
          name: ex.name,
          defaultSetCount: ex.defaultSetCount,
          dayName: day.name,
          lastEx: null,
        });
        coveredNames.add(ex.name.toLowerCase());
      }
    }

    // Walk history once: attach lastEx to matching templates, and capture
    // one-off exercises (no template) as name-only suggestions. Skipped or
    // empty entries carry no data and are ignored.
    const oneOffs = new Map<string, Suggestion>();
    for (const past of state.history) {
      for (const ex of past.exercises) {
        if (!wasPerformed(ex)) continue;
        const tpl = templates.get(ex.exerciseId);
        if (tpl) {
          if (!tpl.lastEx) tpl.lastEx = ex;
          continue;
        }
        const nameLower = ex.name.toLowerCase();
        if (coveredNames.has(nameLower)) continue;
        if (oneOffs.has(nameLower)) continue;
        oneOffs.set(nameLower, {
          exerciseId: null,
          name: ex.name,
          defaultSetCount: ex.sets.length,
          dayName: null,
          lastEx: ex,
        });
      }
    }

    const combined = [...templates.values(), ...oneOffs.values()];
    combined.sort((a, b) => {
      // Entries with history first, then alphabetical.
      const aHas = a.lastEx ? 1 : 0;
      const bHas = b.lastEx ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return a.name.localeCompare(b.name);
    });
    return combined;
  }, [session, state.days, state.dayOrder, state.history]);

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return knownExercises;
    return knownExercises.filter(e => e.name.toLowerCase().includes(q));
  }, [knownExercises, name]);

  // Exact match for the currently typed name — drives the "Last: ..." badge
  // and lets handleSave pass the original exerciseId back through.
  const exactMatch = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return null;
    return knownExercises.find(e => e.name.toLowerCase() === q) ?? null;
  }, [knownExercises, name]);

  // Days whose plan still has exercises not in the current session — for
  // doing a missed day's workout alongside (or instead of) today's plan.
  const importableDays = useMemo(() => {
    if (!session) return [];
    const currentIds = new Set(session.exercises.map(e => e.exerciseId));
    return state.dayOrder
      .map(dayId => {
        const day = state.days[dayId];
        const count = day.exerciseOrder
          .map(eid => day.exercises[eid])
          .filter(ex => !ex.skipped && !currentIds.has(ex.id))
          .length;
        return { dayId: dayId as DayId, name: day.name, count };
      })
      .filter(d => d.count > 0);
  }, [session, state.dayOrder, state.days]);

  const handleClose = () => {
    setName('');
    setSetCount(3);
    setShowSuggestions(false);
    onClose();
  };

  const handlePick = (s: Suggestion) => {
    setName(s.name);
    setSetCount(s.lastEx ? s.lastEx.sets.length : s.defaultSetCount);
    setShowSuggestions(false);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({
      type: 'ADD_SESSION_EXERCISE',
      payload: {
        exerciseId: exactMatch?.exerciseId ?? null,
        name: trimmed,
        defaultSetCount: setCount,
      },
    });
    handleClose();
  };

  const handleImportDay = (dayId: DayId) => {
    dispatch({ type: 'ADD_DAY_TO_SESSION', payload: { dayId } });
    handleClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Exercise">
      <div className="exercise-form">
        <label className="form-label">
          Name
          <div className="autocomplete-wrapper">
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="e.g. Bench Press"
              autoFocus
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="autocomplete-list">
                {suggestions.slice(0, 8).map(s => (
                  <li key={s.exerciseId ?? `name:${s.name.toLowerCase()}`}>
                    <button
                      type="button"
                      className="autocomplete-item"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handlePick(s)}
                    >
                      <span className="autocomplete-name">{s.name}</span>
                      <span className="autocomplete-hint">
                        {s.lastEx ? formatLastSets(s.lastEx) : (s.dayName ?? '')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </label>

        {exactMatch?.lastEx && (
          <div className="last-performance-badge">
            Last: {formatLastSets(exactMatch.lastEx)}
            <span className="last-performance-note">Weights will be pre-filled</span>
          </div>
        )}

        <label className="form-label">
          Sets
          <div className="stepper">
            <button type="button" className="stepper-btn" onClick={() => setSetCount(Math.max(1, setCount - 1))}>-</button>
            <span className="stepper-value">{setCount}</span>
            <button type="button" className="stepper-btn" onClick={() => setSetCount(setCount + 1)}>+</button>
          </div>
        </label>

        <button className="btn btn--accent btn--full" onClick={handleSave} disabled={!name.trim()}>
          Add Exercise
        </button>

        {importableDays.length > 0 && (
          <div className="day-import">
            <span className="day-import-label">Or add a whole day&apos;s plan</span>
            {importableDays.map(d => (
              <button
                key={d.dayId}
                type="button"
                className="day-import-item"
                onClick={() => handleImportDay(d.dayId)}
              >
                <span className="day-import-name">{d.name}</span>
                <span className="day-import-meta">
                  +{d.count} exercise{d.count === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
