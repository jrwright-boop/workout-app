import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { ExerciseTemplate, BurndownConfig, DayId } from '../../types';
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
  const [burndownEnabled, setBurndownEnabled] = useState(exercise?.burndown?.enabled ?? false);
  const [dropCount, setDropCount] = useState(exercise?.burndown?.dropCount ?? 3);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const burndown: BurndownConfig | null = burndownEnabled
      ? { enabled: true, dropCount }
      : null;

    if (exercise) {
      dispatch({
        type: 'EDIT_EXERCISE',
        payload: { dayId, exerciseId: exercise.id, name: trimmed, defaultSetCount: setCount, burndown },
      });
    } else {
      dispatch({
        type: 'ADD_EXERCISE',
        payload: { dayId, name: trimmed, defaultSetCount: setCount, burndown },
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

        <label className="form-label form-row">
          <span>Burndown / Drop Sets</span>
          <button
            className={`toggle-btn ${burndownEnabled ? 'toggle-btn--on' : ''}`}
            onClick={() => setBurndownEnabled(!burndownEnabled)}
          >
            <span className="toggle-knob" />
          </button>
        </label>

        {burndownEnabled && (
          <label className="form-label">
            Drop Count
            <div className="stepper">
              <button className="stepper-btn" onClick={() => setDropCount(Math.max(1, dropCount - 1))}>-</button>
              <span className="stepper-value">{dropCount}</span>
              <button className="stepper-btn" onClick={() => setDropCount(dropCount + 1)}>+</button>
            </div>
          </label>
        )}

        <button className="btn btn--accent btn--full" onClick={handleSave} disabled={!name.trim()}>
          {exercise ? 'Save Changes' : 'Add Exercise'}
        </button>
      </div>
    </Modal>
  );
}
