import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import type { ExerciseTemplate, DayId, LoadType, Measure, ExerciseId, MuscleGroup } from '../../types';
import { DEFAULT_TYPE_FIELDS, MUSCLE_GROUPS } from '../../types';
import { formatMuscle, inferMuscles } from '../../utils/muscles';
import { useWorkout } from '../../hooks/useWorkout';
import { useExerciseLibrary } from '../../hooks/useExerciseHistory';
import { exerciseKey } from '../../utils/exerciseKey';
import { defaultIncrement } from '../../utils/units';
import { formatDate } from '../../utils/date';
import './ExerciseForm.css';
import './AddSessionExerciseForm.css';

interface ExerciseFormProps {
  open: boolean;
  onClose: () => void;
  dayId: DayId;
  exercise?: ExerciseTemplate;
}

const LOAD_TYPES: { value: LoadType; label: string; hint: string }[] = [
  { value: 'external', label: 'Weight', hint: 'Barbell, machine, cable. Weight is the load lifted.' },
  { value: 'bodyweight', label: 'Bodyweight', hint: 'Weight is added load (belt, vest). Leave it empty for bodyweight only.' },
  { value: 'assisted', label: 'Assisted', hint: 'Weight is the assistance. Progress means this number going down.' },
];

export function ExerciseForm({ open, onClose, dayId, exercise }: ExerciseFormProps) {
  const { state, dispatch } = useWorkout();
  const library = useExerciseLibrary();
  const [name, setName] = useState(exercise?.name ?? '');
  const [pickedId, setPickedId] = useState<ExerciseId | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [setCount, setSetCount] = useState(exercise?.defaultSetCount ?? 3);
  const [repMin, setRepMin] = useState(exercise?.targetRepMin?.toString() ?? '');
  const [repMax, setRepMax] = useState(exercise?.targetRepMax?.toString() ?? '');
  const [loadType, setLoadType] = useState<LoadType>(exercise?.loadType ?? DEFAULT_TYPE_FIELDS.loadType);
  const [perSide, setPerSide] = useState(exercise?.perSide ?? DEFAULT_TYPE_FIELDS.perSide);
  const [measure, setMeasure] = useState<Measure>(exercise?.measure ?? DEFAULT_TYPE_FIELDS.measure);
  const [increment, setIncrement] = useState(exercise?.increment?.toString() ?? '');
  const [cues, setCues] = useState(exercise?.cues ?? '');
  const [muscleOverride, setMuscleOverride] = useState<MuscleGroup[] | null>(exercise?.muscles ?? null);
  const [editMuscles, setEditMuscles] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    !!exercise && (exercise.loadType !== 'external' || exercise.perSide || exercise.measure !== 'reps' || exercise.increment != null)
  );

  const day = state.days[dayId];

  // Library entries not already on this day, filtered by what's typed.
  const suggestions = useMemo(() => {
    if (exercise) return [];
    const onDay = new Set(day.exerciseOrder.map(id => exerciseKey(day.exercises[id].name)));
    const q = exerciseKey(name);
    return library
      .filter(e => !onDay.has(exerciseKey(e.name)))
      .filter(e => !q || exerciseKey(e.name).includes(q))
      .slice(0, 8);
  }, [library, day, name, exercise]);

  const exactMatch = useMemo(() => {
    const q = exerciseKey(name);
    return q ? library.find(e => exerciseKey(e.name) === q) ?? null : null;
  }, [library, name]);

  // Other days this exercise could be copied to (edit mode).
  const copyTargets = useMemo(() => {
    if (!exercise) return [];
    return state.dayOrder
      .filter(id => id !== dayId && !state.days[id].exercises[exercise.id])
      .map(id => state.days[id]);
  }, [exercise, state.dayOrder, state.days, dayId]);

  const parseRep = (raw: string): number | null => {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const inferred = useMemo(() => inferMuscles(name), [name]);
  const supersetPartner = exercise?.supersetGroup
    ? day.exerciseOrder.map(id => day.exercises[id]).find(e => e.id !== exercise.id && e.supersetGroup === exercise.supersetGroup) ?? null
    : null;
  const supersetCandidates = exercise
    ? day.exerciseOrder.map(id => day.exercises[id]).filter(e => e.id !== exercise.id)
    : [];

  const applyLibraryEntry = (entry: typeof library[number]) => {
    setName(entry.name);
    setCues(entry.cues);
    setMuscleOverride(entry.muscles);
    setPickedId(entry.id);
    setSetCount(entry.defaultSetCount);
    setRepMin(entry.targetRepMin?.toString() ?? '');
    setRepMax(entry.targetRepMax?.toString() ?? '');
    setLoadType(entry.loadType);
    setPerSide(entry.perSide);
    setMeasure(entry.measure);
    setIncrement(entry.increment?.toString() ?? '');
    setShowSuggestions(false);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const incRaw = parseFloat(increment);
    const fields = {
      name: trimmed,
      defaultSetCount: setCount,
      targetRepMin: parseRep(repMin),
      targetRepMax: parseRep(repMax),
      loadType,
      perSide,
      measure,
      increment: Number.isFinite(incRaw) && incRaw > 0 ? incRaw : null,
      cues: cues.trim(),
      muscles: muscleOverride && muscleOverride.length > 0 ? muscleOverride : null,
    };

    if (exercise) {
      dispatch({ type: 'EDIT_EXERCISE', payload: { dayId, exerciseId: exercise.id, ...fields } });
    } else {
      // Reuse the library identity when the typed name matches a known
      // exercise, so history and charts follow it onto this day.
      const id = pickedId ?? exactMatch?.id;
      dispatch({ type: 'ADD_EXERCISE', payload: { dayId, id, ...fields } });
    }
    onClose();
  };

  const measureLabel = measure === 'seconds' ? 'Seconds' : 'Reps';
  const unitInc = defaultIncrement(state.unit);

  return (
    <Modal open={open} onClose={onClose} title={exercise ? 'Edit Exercise' : 'Add Exercise'}>
      <div className="exercise-form">
        <label className="form-label">
          Name
          <div className="autocomplete-wrapper">
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => { setName(e.target.value); setPickedId(null); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="e.g. Bench Press"
              autoFocus
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="autocomplete-list">
                {suggestions.map(s => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="autocomplete-item"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => applyLibraryEntry(s)}
                    >
                      <span className="autocomplete-name">{s.name}</span>
                      <span className="autocomplete-hint">
                        {s.dayNames.length > 0 ? s.dayNames.join(', ') : s.lastDate ? `Last ${formatDate(s.lastDate)}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!exercise && exactMatch && (
            <span className="form-label-hint">
              Known exercise{exactMatch.dayNames.length > 0 ? ` (on ${exactMatch.dayNames.join(', ')})` : ''}. History will carry over.
            </span>
          )}
        </label>

        <label className="form-label">
          Sets
          <div className="stepper">
            <button type="button" className="stepper-btn" aria-label="Fewer sets" onClick={() => setSetCount(Math.max(1, setCount - 1))}>-</button>
            <span className="stepper-value">{setCount}</span>
            <button type="button" className="stepper-btn" aria-label="More sets" onClick={() => setSetCount(setCount + 1)}>+</button>
          </div>
        </label>

        <label className="form-label">
          Target {measureLabel} <span className="form-label-hint">(optional)</span>
          <div className="rep-range-inputs">
            <input
              type="text"
              inputMode="numeric"
              className="form-input rep-range-input"
              value={repMin}
              onChange={e => setRepMin(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="min"
            />
            <span className="rep-range-dash">–</span>
            <input
              type="text"
              inputMode="numeric"
              className="form-input rep-range-input"
              value={repMax}
              onChange={e => setRepMax(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="max"
            />
          </div>
          <span className="form-label-hint">
            Hit the max on every set and the exercise lights up green.
            {loadType === 'assisted' ? ' Next session pre-fills less assistance.' : ' Next session pre-fills the next weight up.'}
          </span>
        </label>

        <label className="form-label">
          Cues <span className="form-label-hint">(shown every session)</span>
          <textarea
            className="form-input form-textarea"
            value={cues}
            onChange={e => setCues(e.target.value)}
            placeholder="e.g. seat 4, grip one finger outside the ring"
            rows={2}
          />
        </label>

        <div className="form-label">
          <span>
            Muscles{' '}
            <span className="form-label-hint">
              {muscleOverride ? '(set by you)' : inferred ? '(from the name)' : '(unknown, tap to set)'}
            </span>
          </span>
          <div className="muscle-chips">
            {(muscleOverride ?? inferred?.primary ?? []).map(m => (
              <span key={m} className="muscle-chip muscle-chip--primary">{formatMuscle(m)}</span>
            ))}
            {!muscleOverride && inferred?.secondary.map(m => (
              <span key={m} className="muscle-chip">{formatMuscle(m)}</span>
            ))}
            <button type="button" className="muscle-chip muscle-chip--edit" onClick={() => setEditMuscles(v => !v)}>
              {editMuscles ? 'Done' : muscleOverride ? 'Change' : 'Override'}
            </button>
          </div>
          {editMuscles && (
            <div className="muscle-chips" role="group" aria-label="Primary muscles">
              {MUSCLE_GROUPS.map(m => {
                const on = (muscleOverride ?? []).includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    className={`muscle-chip muscle-chip--toggle ${on ? 'muscle-chip--primary' : ''}`}
                    onClick={() => setMuscleOverride(prev => {
                      const cur = prev ?? [];
                      const next = cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m];
                      return next.length ? next : null;
                    })}
                  >
                    {formatMuscle(m)}
                  </button>
                );
              })}
              {muscleOverride && (
                <button type="button" className="muscle-chip muscle-chip--edit" onClick={() => setMuscleOverride(null)}>
                  Back to auto
                </button>
              )}
            </div>
          )}
        </div>

        {exercise && supersetCandidates.length > 0 && (
          <label className="form-label">
            Superset with
            <select
              className="form-input"
              value={supersetPartner?.id ?? ''}
              onChange={e => dispatch({
                type: 'SET_SUPERSET',
                payload: { dayId, exerciseId: exercise.id, withExerciseId: e.target.value || null },
              })}
            >
              <option value="">None</option>
              {supersetCandidates.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <span className="form-label-hint">Paired exercises alternate sets; the rest timer runs after the pair.</span>
          </label>
        )}

        <button type="button" className="form-disclosure" onClick={() => setShowAdvanced(v => !v)} aria-expanded={showAdvanced}>
          {showAdvanced ? '▾' : '▸'} Exercise type
          {!showAdvanced && (
            <span className="form-disclosure-summary">
              {LOAD_TYPES.find(t => t.value === loadType)?.label}
              {perSide ? ' · per side' : ''}
              {measure === 'seconds' ? ' · timed' : ''}
            </span>
          )}
        </button>

        {showAdvanced && (
          <div className="exercise-type-fields">
            <div className="form-label">
              Load
              <div className="segmented" role="radiogroup" aria-label="Load type">
                {LOAD_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={loadType === t.value}
                    className={`segmented-btn ${loadType === t.value ? 'segmented-btn--active' : ''}`}
                    onClick={() => setLoadType(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <span className="form-label-hint">{LOAD_TYPES.find(t => t.value === loadType)?.hint}</span>
            </div>

            <label className="form-label form-row">
              <span>
                Per side
                <span className="form-label-hint form-hint-block">Dumbbells, or one arm / leg at a time. Volume counts both.</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={perSide}
                className={`toggle-btn ${perSide ? 'toggle-btn--on' : ''}`}
                onClick={() => setPerSide(v => !v)}
              >
                <span className="toggle-knob" />
              </button>
            </label>

            <div className="form-label">
              Count
              <div className="segmented" role="radiogroup" aria-label="Measure">
                {(['reps', 'seconds'] as Measure[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={measure === m}
                    className={`segmented-btn ${measure === m ? 'segmented-btn--active' : ''}`}
                    onClick={() => setMeasure(m)}
                  >
                    {m === 'reps' ? 'Reps' : 'Seconds (hold)'}
                  </button>
                ))}
              </div>
            </div>

            <label className="form-label">
              Weight step <span className="form-label-hint">(optional, default {unitInc} {state.unit})</span>
              <input
                type="text"
                inputMode="decimal"
                className="form-input rep-range-input"
                value={increment}
                onChange={e => setIncrement(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder={String(unitInc)}
              />
              <span className="form-label-hint">Used by the +/− buttons and the progression suggestion.</span>
            </label>
          </div>
        )}

        <button className="btn btn--accent btn--full" onClick={handleSave} disabled={!name.trim()}>
          {exercise ? 'Save Changes' : 'Add Exercise'}
        </button>

        {exercise && copyTargets.length > 0 && (
          <div className="day-import">
            <span className="day-import-label">Also add to another day</span>
            {copyTargets.map(d => (
              <button
                key={d.id}
                type="button"
                className="day-import-item"
                onClick={() => dispatch({ type: 'COPY_EXERCISE_TO_DAY', payload: { fromDayId: dayId, toDayId: d.id, exerciseId: exercise.id } })}
              >
                <span className="day-import-name">{d.name}</span>
                <span className="day-import-meta">Copy here</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
