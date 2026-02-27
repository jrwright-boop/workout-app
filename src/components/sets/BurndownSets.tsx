import type { DropEntry } from '../../types';
import { NumericInput } from '../common/NumericInput';
import { useWorkout } from '../../hooks/useWorkout';
import './BurndownSets.css';

interface BurndownSetsProps {
  drops: DropEntry[];
  exerciseIndex: number;
}

export function BurndownSets({ drops, exerciseIndex }: BurndownSetsProps) {
  const { dispatch } = useWorkout();

  return (
    <div className="burndown-section">
      <div className="burndown-header">Burndown / Drop Sets</div>
      {drops.map((drop, dropIndex) => (
        <div key={dropIndex} className="burndown-row">
          <span className="drop-number">D{dropIndex + 1}</span>
          <NumericInput
            value={drop.weight}
            onChange={value => dispatch({
              type: 'UPDATE_BURNDOWN_DROP',
              payload: { exerciseIndex, dropIndex, field: 'weight', value },
            })}
            placeholder="lbs"
          />
          <span className="set-x">&times;</span>
          <NumericInput
            value={drop.reps}
            onChange={value => dispatch({
              type: 'UPDATE_BURNDOWN_DROP',
              payload: { exerciseIndex, dropIndex, field: 'reps', value },
            })}
            placeholder="reps"
          />
        </div>
      ))}
    </div>
  );
}
