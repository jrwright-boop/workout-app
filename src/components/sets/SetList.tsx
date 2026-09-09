import { useMemo, useState } from 'react';
import { useWorkout } from '../../hooks/useWorkout';
import { useExerciseRecords } from '../../hooks/useExerciseHistory';
import type { SessionExercise } from '../../types';
import { SetRow } from './SetRow';
import { BurndownSets } from './BurndownSets';
import { PlateCalculatorModal } from './PlateCalculatorModal';
import { formatRepRange } from '../../utils/repRange';
import { primeAudio } from '../../utils/audio';
import { setRecord } from '../../utils/records';
import { defaultIncrement, weightLabel } from '../../utils/units';
import './SetList.css';

interface SetListProps {
  exercise: SessionExercise;
  exerciseIndex: number;
  onSetCompleted?: () => void;
}

export function SetList({ exercise, exerciseIndex, onSetCompleted }: SetListProps) {
  const { state, dispatch } = useWorkout();
  const unit = state.unit;
  const targetRange = formatRepRange(exercise.targetRepMin, exercise.targetRepMax, exercise.measure);
  const records = useExerciseRecords(exercise.exerciseId, exercise.name, exercise);
  const [showPlates, setShowPlates] = useState(false);

  const weightStep = exercise.increment ?? defaultIncrement(unit);
  const canCalcPlates = exercise.loadType === 'external' && !exercise.perSide;
  const plateWeight = exercise.sets.find(s => !s.completed && s.weight != null)?.weight
    ?? exercise.sets.find(s => s.weight != null)?.weight
    ?? null;

  // A record is only "beaten" once per kind per exercise: later sets are
  // compared against the running best including earlier sets this session.
  const recordKinds = useMemo(() => {
    const running = { ...records };
    return exercise.sets.map(set => {
      const kind = setRecord(exercise, set, running);
      if (kind === 'weight') running.bestWeight = set.weight;
      if (kind === 'assistance') running.minAssistance = set.weight;
      if (kind === 'reps') running.bestReps = set.reps;
      if (kind === 'seconds') running.bestSeconds = set.reps;
      return kind;
    });
  }, [exercise, records]);

  return (
    <div className="set-list">
      {(targetRange || canCalcPlates) && (
        <div className="set-list-target-row">
          {canCalcPlates && (
            <button type="button" className="plates-btn" onClick={() => setShowPlates(true)}>
              Plates
            </button>
          )}
          {targetRange && <span className="set-list-target">Target {targetRange}</span>}
        </div>
      )}
      <div className="set-list-header">
        <span className="set-list-label">Set</span>
        <span className="set-list-label">{weightLabel(exercise.loadType, exercise.perSide)}</span>
        <span></span>
        <span className="set-list-label">{exercise.measure === 'seconds' ? 'Time' : 'Reps'}</span>
      </div>

      {exercise.sets.map((set, setIndex) => (
        <SetRow
          key={setIndex}
          index={setIndex}
          set={set}
          unit={unit}
          measure={exercise.measure}
          weightStep={weightStep}
          targetRepMax={exercise.targetRepMax}
          record={recordKinds[setIndex]}
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
            // This tap is the user gesture that lets the timer beep later (iOS).
            if (!wasCompleted) primeAudio();
            dispatch({
              type: 'TOGGLE_SET_COMPLETE',
              payload: { exerciseIndex, setIndex },
            });
            if (!wasCompleted && onSetCompleted) {
              onSetCompleted();
            }
          }}
          onToggleWarmup={() => dispatch({ type: 'TOGGLE_SET_WARMUP', payload: { exerciseIndex, setIndex } })}
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
                  aria-label="Fewer drop sets"
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
                  aria-label="More drop sets"
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

      {showPlates && (
        <PlateCalculatorModal
          initialWeight={plateWeight}
          onClose={() => setShowPlates(false)}
        />
      )}
    </div>
  );
}
