import { useWorkout } from '../../hooks/useWorkout';
import type { SessionExercise } from '../../types';
import { SetRow } from './SetRow';
import { BurndownSets } from './BurndownSets';
import './SetList.css';

interface SetListProps {
  exercise: SessionExercise;
  exerciseIndex: number;
}

export function SetList({ exercise, exerciseIndex }: SetListProps) {
  const { dispatch } = useWorkout();

  return (
    <div className="set-list">
      <div className="set-list-header">
        <span className="set-list-label">Set</span>
        <span className="set-list-label">Weight</span>
        <span></span>
        <span className="set-list-label">Reps</span>
      </div>

      {exercise.sets.map((set, setIndex) => (
        <SetRow
          key={setIndex}
          index={setIndex}
          set={set}
          onUpdateWeight={value => dispatch({
            type: 'UPDATE_SET',
            payload: { exerciseIndex, setIndex, field: 'weight', value },
          })}
          onUpdateReps={value => dispatch({
            type: 'UPDATE_SET',
            payload: { exerciseIndex, setIndex, field: 'reps', value },
          })}
          onToggleComplete={() => dispatch({
            type: 'TOGGLE_SET_COMPLETE',
            payload: { exerciseIndex, setIndex },
          })}
          onRemove={() => dispatch({
            type: 'REMOVE_SET',
            payload: { exerciseIndex, setIndex },
          })}
          canRemove={exercise.sets.length > 1}
        />
      ))}

      <button
        className="add-set-btn"
        onClick={() => dispatch({ type: 'ADD_SET', payload: { exerciseIndex } })}
      >
        + Add Set
      </button>

      {exercise.burndown && (
        <BurndownSets
          drops={exercise.burndown.drops}
          exerciseIndex={exerciseIndex}
        />
      )}
    </div>
  );
}
