import { memo, useState } from 'react';
import type { Measure, SetEntry } from '../../types';
import { NumericInput } from '../common/NumericInput';
import { setHitTop } from '../../utils/repRange';
import type { RecordKind } from '../../utils/records';
import { recordLabel } from '../../utils/records';
import './SetRow.css';

function repChipValues(base: number): number[] {
  const values: number[] = [];
  for (let v = base - 2; v <= base + 2; v++) {
    if (v >= 1) values.push(v);
  }
  return values;
}

interface SetRowProps {
  index: number;
  set: SetEntry;
  unit: string;
  measure: Measure;
  weightStep: number;
  targetRepMax: number | null;
  /** Which record (if any) this completed set beats. */
  record: RecordKind | null;
  onUpdateWeight: (value: number | null) => void;
  onUpdateReps: (value: number | null) => void;
  onToggleComplete: () => void;
  onToggleWarmup: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const SetRow = memo(function SetRow({
  index,
  set,
  unit,
  measure,
  weightStep,
  targetRepMax,
  record,
  onUpdateWeight,
  onUpdateReps,
  onToggleComplete,
  onToggleWarmup,
  onRemove,
  canRemove,
}: SetRowProps) {
  const [repsFocused, setRepsFocused] = useState(false);
  const hasPrefill = set.reps === null && set.repsFromLastSession !== null;
  const hitTop = !set.warmup && setHitTop(set.reps, set.completed, targetRepMax);
  const repsUnit = measure === 'seconds' ? 'sec' : 'reps';

  // Stepping reps from empty starts at the last-session placeholder.
  const repsBase = set.reps ?? set.repsFromLastSession ?? 0;
  const repStep = measure === 'seconds' ? 5 : 1;

  // Quick-pick values around last time's reps (or the target ceiling).
  const chipCenter = set.reps ?? set.repsFromLastSession ?? targetRepMax;
  const chips = repsFocused && measure === 'reps' && chipCenter != null ? repChipValues(chipCenter) : [];
  const chipActive = set.reps ?? set.repsFromLastSession;

  const rowClass = [
    'set-row',
    set.completed ? 'set-row--completed' : '',
    hitTop ? 'set-row--hit-top' : '',
    set.warmup ? 'set-row--warmup' : '',
    record ? 'set-row--record' : '',
  ].join(' ');

  return (
    <>
    <div className={rowClass}>
      <button
        type="button"
        className={`set-number ${set.warmup ? 'set-number--warmup' : ''}`}
        onClick={onToggleWarmup}
        aria-pressed={set.warmup}
        aria-label={set.warmup ? `Warm-up set, tap to make it a working set` : `Set ${index + 1}, tap to mark as warm-up`}
        title={set.warmup ? 'Warm-up (tap to make working set)' : 'Tap to mark as warm-up'}
      >
        {set.warmup ? 'W' : index + 1}
      </button>
      <div className="input-stepper">
        <button
          type="button"
          className="input-stepper-btn"
          aria-label="Decrease weight"
          onClick={() => onUpdateWeight(Math.max(0, (set.weight ?? 0) - weightStep))}
        >
          &minus;
        </button>
        <NumericInput
          value={set.weight}
          onChange={onUpdateWeight}
          placeholder={unit}
          className={set.suggested ? 'numeric-input--suggested' : ''}
        />
        <button
          type="button"
          className="input-stepper-btn"
          aria-label="Increase weight"
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
          aria-label={`Decrease ${repsUnit}`}
          onClick={() => onUpdateReps(Math.max(0, repsBase - repStep))}
        >
          &minus;
        </button>
        <NumericInput
          value={set.reps}
          onChange={onUpdateReps}
          placeholder={hasPrefill ? String(set.repsFromLastSession) : repsUnit}
          className={`${hasPrefill ? 'numeric-input--prefilled' : ''} ${hitTop ? 'numeric-input--hit-top' : ''}`}
          onFocus={() => setRepsFocused(true)}
          onBlur={() => setRepsFocused(false)}
        />
        <button
          type="button"
          className="input-stepper-btn"
          aria-label={`Increase ${repsUnit}`}
          onClick={() => onUpdateReps(repsBase + repStep)}
        >
          +
        </button>
      </div>
      <button
        className={`check-btn ${set.completed ? 'check-btn--done' : ''} ${hitTop ? 'check-btn--hit-top' : ''} ${record ? 'check-btn--record' : ''}`}
        onClick={onToggleComplete}
        aria-label={`Set ${index + 1} ${set.completed ? 'completed' : 'not completed'}${record ? `, personal record: ${recordLabel(record)}` : ''}`}
        aria-pressed={set.completed}
        title={record ? `PR: ${recordLabel(record)}` : undefined}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {record && <span className="record-pill" aria-hidden="true">PR</span>}
      </button>
      {canRemove && (
        <button className="remove-set-btn" onClick={onRemove} aria-label={`Remove set ${index + 1}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
    {chips.length > 0 && (
      <div className="rep-chips">
        {chips.map(v => (
          <button
            key={v}
            type="button"
            className={`rep-chip ${v === chipActive ? 'rep-chip--active' : ''}`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onUpdateReps(v)}
          >
            {v}
          </button>
        ))}
      </div>
    )}
    </>
  );
});
