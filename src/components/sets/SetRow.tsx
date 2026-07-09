import { memo } from 'react';
import type { SetEntry } from '../../types';
import { NumericInput } from '../common/NumericInput';
import { setHitTop } from '../../utils/repRange';
import './SetRow.css';

interface SetRowProps {
  index: number;
  set: SetEntry;
  unit: string;
  targetRepMax: number | null;
  onUpdateWeight: (value: number | null) => void;
  onUpdateReps: (value: number | null) => void;
  onToggleComplete: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const SetRow = memo(function SetRow({
  index,
  set,
  unit,
  targetRepMax,
  onUpdateWeight,
  onUpdateReps,
  onToggleComplete,
  onRemove,
  canRemove,
}: SetRowProps) {
  const hasPrefill = set.reps === null && set.repsFromLastSession !== null;
  const hitTop = setHitTop(set.reps, set.completed, targetRepMax);

  const weightStep = unit === 'kg' ? 2.5 : 5;
  // Stepping reps from empty starts at the last-session placeholder.
  const repsBase = set.reps ?? set.repsFromLastSession ?? 0;

  return (
    <div className={`set-row ${set.completed ? 'set-row--completed' : ''} ${hitTop ? 'set-row--hit-top' : ''}`}>
      <span className="set-number">{index + 1}</span>
      <div className="input-stepper">
        <button
          type="button"
          className="input-stepper-btn"
          onClick={() => onUpdateWeight(Math.max(0, (set.weight ?? 0) - weightStep))}
        >
          &minus;
        </button>
        <NumericInput value={set.weight} onChange={onUpdateWeight} placeholder={unit} />
        <button
          type="button"
          className="input-stepper-btn"
          onClick={() => onUpdateWeight((set.weight ?? 0) + weightStep)}
        >
          +
        </button>
      </div>
      <span className="set-x">&times;</span>
      <div className="input-stepper">
        <button
          type="button"
          className="input-stepper-btn"
          onClick={() => onUpdateReps(Math.max(0, repsBase - 1))}
        >
          &minus;
        </button>
        <NumericInput
          value={set.reps}
          onChange={onUpdateReps}
          placeholder={hasPrefill ? String(set.repsFromLastSession) : 'reps'}
          className={`${hasPrefill ? 'numeric-input--prefilled' : ''} ${hitTop ? 'numeric-input--hit-top' : ''}`}
        />
        <button
          type="button"
          className="input-stepper-btn"
          onClick={() => onUpdateReps(repsBase + 1)}
        >
          +
        </button>
      </div>
      <button
        className={`check-btn ${set.completed ? 'check-btn--done' : ''} ${hitTop ? 'check-btn--hit-top' : ''}`}
        onClick={onToggleComplete}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
      {canRemove && (
        <button className="remove-set-btn" onClick={onRemove}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
});
