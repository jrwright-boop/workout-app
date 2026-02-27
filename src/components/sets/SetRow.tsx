import { memo } from 'react';
import type { SetEntry } from '../../types';
import { NumericInput } from '../common/NumericInput';
import './SetRow.css';

interface SetRowProps {
  index: number;
  set: SetEntry;
  unit: string;
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
  onUpdateWeight,
  onUpdateReps,
  onToggleComplete,
  onRemove,
  canRemove,
}: SetRowProps) {
  const hasPrefill = set.reps === null && set.repsFromLastSession !== null;

  return (
    <div className={`set-row ${set.completed ? 'set-row--completed' : ''}`}>
      <span className="set-number">{index + 1}</span>
      <NumericInput value={set.weight} onChange={onUpdateWeight} placeholder={unit} />
      <span className="set-x">&times;</span>
      <NumericInput
        value={set.reps}
        onChange={onUpdateReps}
        placeholder={hasPrefill ? String(set.repsFromLastSession) : 'reps'}
        className={hasPrefill ? 'numeric-input--prefilled' : ''}
      />
      <button
        className={`check-btn ${set.completed ? 'check-btn--done' : ''}`}
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
