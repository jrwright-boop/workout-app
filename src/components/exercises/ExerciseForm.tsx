import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { ExerciseTemplate, DayId } from '../../types';
import { useWorkout } from '../../hooks/useWorkout';
import './ExerciseForm.css';

interface ExerciseFormProps {
  open: boolean;
  onClose: () => void;
  dayId: DayId;
  exercise?: ExerciseTemplate;
}

export function ExerciseForm({ open, onClose, dayId, exercise }: ExerciseFormProps) {
  const { dispatch } = useWorkout();
  const [name, setName] = useState(exercise?.name ?? '');
  const [setCount, setSetCount] = useState(exercise?.defaultSetCount ?? 3);
  const [repMin, setRepMin] = useState(exercise?.targetRepMin?.toString() ?? '');
  const [repMax, setRepMax] = useState(exercise?.targetRepMax?.toString() ?? '');

  const parseRep = (raw: string): number | null => {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const targetRepMin = parseRep(repMin);
    const targetRepMax = parseRep(repMax);

    if (exercise) {
      dispatch({
        type: 'EDIT_EXERCISE',
        payload: { dayId, exerciseId: exercise.id, name: trimmed, defaultSetCount: setCount, targetRepMin, targetRepMax },
      });
    } else {
      dispatch({
        type: 'ADD_EXERCISE',
        payload: { dayId, name: trimmed, defaultSetCount: setCount, targetRepMin, targetRepMax },
      });
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={exercise ? 'Edit Exercise' : 'Add Exercise'}>
      <div className="exercise-form">
        <label className="form-label">
          Name
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Bench Press"
            autoFocus
          />
        </label>

        <label className="form-label">
          Sets
          <div className="stepper">
            <button className="stepper-btn" onClick={() => setSetCount(Math.max(1, setCount - 1))}>-</button>
            <span className="stepper-value">{setCount}</span>
            <button className="stepper-btn" onClick={() => setSetCount(setCount + 1)}>+</button>
          </div>
        </label>

        <label className="form-label">
          Target Reps <span className="form-label-hint">(optional)</span>
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
            Hit the max on every set and the exercise lights up green — time to add weight.
          </span>
        </label>

        <button className="btn btn--accent btn--full" onClick={handleSave} disabled={!name.trim()}>
          {exercise ? 'Save Changes' : 'Add Exercise'}
        </button>
      </div>
    </Modal>
  );
}
