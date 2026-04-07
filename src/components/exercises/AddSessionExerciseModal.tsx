import { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useWorkout } from '../../hooks/useWorkout';
import type { SessionExercise } from '../../types';
import './ExerciseForm.css';
import './AddSessionExerciseModal.css';

interface AddSessionExerciseModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddSessionExerciseModal({ open, onClose }: AddSessionExerciseModalProps) {
  const { state, dispatch } = useWorkout();
  const [name, setName] = useState('');
  const [setCount, setSetCount] = useState(3);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Build unique exercise names from history + all day templates
  const knownExercises = useMemo(() => {
    const names = new Map<string, { name: string; lastEx: SessionExercise | null }>();

    // From history (most recent first, so first match = latest)
    for (const session of state.history) {
      for (const ex of session.exercises) {
        const key = ex.name.toLowerCase();
        if (!names.has(key)) {
          names.set(key, { name: ex.name, lastEx: ex });
        }
      }
    }

    // From day templates (in case they haven't been done yet)
    for (const dayId of state.dayOrder) {
      const day = state.days[dayId];
      for (const eid of day.exerciseOrder) {
        const ex = day.exercises[eid];
        const key = ex.name.toLowerCase();
        if (!names.has(key)) {
          names.set(key, { name: ex.name, lastEx: null });
        }
      }
    }

    return Array.from(names.values());
  }, [state.history, state.dayOrder, state.days]);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return knownExercises;
    return knownExercises.filter(e => e.name.toLowerCase().includes(trimmed));
  }, [name, knownExercises]);

  // Find last performance for display
  const lastPerformance = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return null;
    return knownExercises.find(e => e.name.toLowerCase() === trimmed)?.lastEx ?? null;
  }, [name, knownExercises]);

  const handleSelect = (exerciseName: string) => {
    setName(exerciseName);
    setShowSuggestions(false);
    // Update set count to match last performance if available
    const match = knownExercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
    if (match?.lastEx) {
      setSetCount(match.lastEx.sets.length);
    }
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({
      type: 'ADD_SESSION_EXERCISE',
      payload: { name: trimmed, setCount },
    });
    setName('');
    setSetCount(3);
    setShowSuggestions(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Exercise">
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
                  <li key={s.name}>
                    <button
                      className="autocomplete-item"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSelect(s.name)}
                    >
                      <span className="autocomplete-name">{s.name}</span>
                      {s.lastEx && (
                        <span className="autocomplete-hint">
                          {s.lastEx.sets
                            .filter(set => set.weight != null && set.reps != null)
                            .map(set => `${set.weight}x${set.reps}`)
                            .join(', ')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </label>

        {lastPerformance && (
          <div className="last-performance-badge">
            Last: {lastPerformance.sets
              .filter(s => s.weight != null && s.reps != null)
              .map(s => `${s.weight}x${s.reps}`)
              .join(', ')}
            <span className="last-performance-note">Weight will be pre-filled</span>
          </div>
        )}

        <label className="form-label">
          Sets
          <div className="stepper">
            <button className="stepper-btn" onClick={() => setSetCount(Math.max(1, setCount - 1))}>-</button>
            <span className="stepper-value">{setCount}</span>
            <button className="stepper-btn" onClick={() => setSetCount(setCount + 1)}>+</button>
          </div>
        </label>

        <button className="btn btn--accent btn--full" onClick={handleSave} disabled={!name.trim()}>
          Add Exercise
        </button>
      </div>
    </Modal>
  );
}
