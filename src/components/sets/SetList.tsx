import { useWorkout } from '../../hooks/useWorkout';
import type { SessionExercise } from '../../types';
import { SetRow } from './SetRow';
import { BurndownSets } from './BurndownSets';
import './SetList.css';

interface SetListProps {
  exercise: SessionExercise;
  exerciseIndex: number;
  onSetCompleted?: () => void;
}

export function SetList({ exercise, exerciseIndex, onSetCompleted }: SetListProps) {
  const { state, dispatch } = useWorkout();
  const unit = state.unit;

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
          unit={unit}
          onUpdateWeight={value => dispatch({
            type: 'UPDATE_SET',
            payload: { exerciseIndex, setIndex, field: 'weight', value },
          })}
          onUpdateReps={value => dispatch({
            type: 'UPDATE_SET',
            payload: { exerciseIndex, setIndex, field: 'reps', value },
          })}
          onToggleComplete={() => {
            const wasCompleted = set.completed;
            dispatch({
              type: 'TOGGLE_SET_COMPLETE',
              payload: { exerciseIndex, setIndex },
            });
            if (!wasCompleted && onSetCompleted) {
              onSetCompleted();
            }
          }}
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

      {!exercise.burndown ? (
        <button
          className="add-burndown-btn"
          onClick={() => dispatch({ type: 'TOGGLE_SESSION_BURNDOWN', payload: { exerciseIndex } })}
        >
          + Drop Sets
        </button>
      ) : (
        <div className="burndown-controls">
          <div className="burndown-controls-header">
            <span className="burndown-controls-label">Drop Sets</span>
            <div className="burndown-controls-actions">
              <div className="stepper stepper--small">
                <button
                  className="stepper-btn stepper-btn--small"
                  onClick={() => dispatch({
                    type: 'SET_SESSION_DROP_COUNT',
                    payload: { exerciseIndex, count: Math.max(1, exercise.burndown!.drops.length - 1) },
                  })}
                >
                  -
                </button>
                <span className="stepper-value stepper-value--small">{exercise.burndown.drops.length}</span>
                <button
                  className="stepper-btn stepper-btn--small"
                  onClick={() => dispatch({
                    type: 'SET_SESSION_DROP_COUNT',
                    payload: { exerciseIndex, count: exercise.burndown!.drops.length + 1 },
                  })}
                >
                  +
                </button>
              </div>
              <button
                className="burndown-remove-btn"
                onClick={() => dispatch({ type: 'TOGGLE_SESSION_BURNDOWN', payload: { exerciseIndex } })}
              >
                Remove
              </button>
            </div>
          </div>
          <BurndownSets
            drops={exercise.burndown.drops}
            exerciseIndex={exerciseIndex}
            unit={unit}
          />
        </div>
      )}
    </div>
  );
}
