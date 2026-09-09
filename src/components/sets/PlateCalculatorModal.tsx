import { useState } from 'react';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { useWorkout } from '../../hooks/useWorkout';
import { BAR_OPTIONS, DEFAULT_PLATES, formatPlates, platesPerSide } from '../../utils/plates';
import './PlateCalculatorModal.css';

interface PlateCalculatorModalProps {
  initialWeight: number | null;
  onClose: () => void;
}

export function PlateCalculatorModal({ initialWeight, onClose }: PlateCalculatorModalProps) {
  const { state, dispatch } = useWorkout();
  const unit = state.unit;
  const bar = state.barWeight[unit];
  const [weight, setWeight] = useState<number | null>(initialWeight);

  const breakdown = weight != null && weight > 0 ? platesPerSide(weight, bar, DEFAULT_PLATES[unit]) : null;
  const barOptions = BAR_OPTIONS[unit].includes(bar) ? BAR_OPTIONS[unit] : [...BAR_OPTIONS[unit], bar].sort((a, b) => b - a);

  return (
    <Modal open onClose={onClose} title="Plate Calculator">
      <div className="plates-content">
        <label className="form-label">
          Target weight ({unit})
          <NumericInput value={weight} onChange={setWeight} placeholder={unit} className="plates-weight-input" />
        </label>

        <div className="form-label">
          Bar
          <div className="segmented" role="radiogroup" aria-label="Bar weight">
            {barOptions.map(b => (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={bar === b}
                className={`segmented-btn ${bar === b ? 'segmented-btn--active' : ''}`}
                onClick={() => dispatch({ type: 'SET_BAR_WEIGHT', payload: { unit, weight: b } })}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {breakdown ? (
          <div className="plates-result">
            <span className="plates-result-label">Per side</span>
            <div className="plates-visual" aria-hidden="true">
              {breakdown.perSide.map((p, i) => (
                <span key={i} className="plate" style={{ height: `${28 + Math.min(p, 45) * 0.9}px` }}>
                  {p}
                </span>
              ))}
              {breakdown.perSide.length === 0 && <span className="plates-empty">bar only</span>}
            </div>
            <span className="plates-result-text">{formatPlates(breakdown.perSide)}</span>
            {breakdown.remainder > 0 && (
              <span className="plates-remainder">
                Closest is {breakdown.achieved} {unit} ({breakdown.remainder} {unit} short with standard plates)
              </span>
            )}
            {weight != null && weight < bar && (
              <span className="plates-remainder">Target is lighter than the bar.</span>
            )}
          </div>
        ) : (
          <p className="plates-hint">Enter a weight to see what to load.</p>
        )}
      </div>
    </Modal>
  );
}
