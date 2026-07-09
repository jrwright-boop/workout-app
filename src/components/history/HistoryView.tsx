import { useState } from 'react';
import { Modal } from '../common/Modal';
import { useWorkout } from '../../hooks/useWorkout';
import { useExerciseHistory } from '../../hooks/useExerciseHistory';
import { ExerciseChart } from './ExerciseChart';
import { NumericInput } from '../common/NumericInput';
import { formatDateTime } from '../../utils/date';
import type { ExerciseId, WorkoutSession } from '../../types';
import './HistoryView.css';

interface HistoryViewProps {
  open: boolean;
  onClose: () => void;
  exerciseId?: ExerciseId;
  exerciseName?: string;
}

function SessionSummary({ session }: { session: WorkoutSession }) {
  const { state, dispatch } = useWorkout();
  const [editing, setEditing] = useState(false);

  const handleDelete = () => {
    if (confirm(`Delete this ${session.dayName} workout from ${formatDateTime(session.startedAt)}? This cannot be undone.`)) {
      dispatch({ type: 'DELETE_HISTORY_SESSION', payload: { sessionId: session.id } });
    }
  };

  return (
    <div className="history-session">
      <div className="history-session-header">
        <div className="history-session-title">
          <span className="history-day-name">{session.dayName}</span>
          <span className="history-date">{formatDateTime(session.startedAt)}</span>
        </div>
        <div className="history-session-actions">
          <button
            className={`history-action-btn ${editing ? 'history-action-btn--active' : ''}`}
            onClick={() => setEditing(e => !e)}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
          <button className="history-action-btn history-action-btn--danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
      {session.exercises.map((ex, exerciseIndex) => {
        const setsSummary = ex.sets
          .filter(s => s.weight != null && s.reps != null)
          .map(s => `${s.weight}x${s.reps}`)
          .join(', ');

        const dropsSummary = ex.burndown?.drops
          .filter(d => d.weight != null && d.reps != null)
          .map(d => `${d.weight}x${d.reps}`)
          .join(', ');

        return (
          <div key={exerciseIndex} className="history-exercise">
            <span className="history-ex-name">{ex.name}</span>
            {editing ? (
              <div className="history-set-editor">
                {ex.sets.map((set, setIndex) => (
                  <div key={setIndex} className="history-set-edit-row">
                    <span className="history-set-edit-num">{setIndex + 1}</span>
                    <NumericInput
                      value={set.weight}
                      onChange={value => dispatch({
                        type: 'UPDATE_HISTORY_SET',
                        payload: { sessionId: session.id, exerciseIndex, setIndex, field: 'weight', value },
                      })}
                      placeholder={state.unit}
                    />
                    <span className="set-x">&times;</span>
                    <NumericInput
                      value={set.reps}
                      onChange={value => dispatch({
                        type: 'UPDATE_HISTORY_SET',
                        payload: { sessionId: session.id, exerciseIndex, setIndex, field: 'reps', value },
                      })}
                      placeholder="reps"
                    />
                  </div>
                ))}
              </div>
            ) : (
              setsSummary && <span className="history-ex-sets">{setsSummary}</span>
            )}
            {dropsSummary && <span className="history-ex-drops">Drops: {dropsSummary}</span>}
            {ex.notes && <span className="history-ex-notes">{ex.notes}</span>}
          </div>
        );
      })}
    </div>
  );
}

function ExerciseHistoryContent({ exerciseId, exerciseName }: { exerciseId: ExerciseId; exerciseName: string }) {
  const history = useExerciseHistory(exerciseId);

  return (
    <div className="history-content">
      <ExerciseChart history={history} />

      {history.length === 0 ? (
        <p className="history-empty">No history yet for {exerciseName}</p>
      ) : (
        <div className="history-list">
          {history.map(({ session, exercise }) => {
            const setsSummary = exercise.sets
              .filter(s => s.weight != null && s.reps != null)
              .map(s => `${s.weight}x${s.reps}`)
              .join(', ');

            const dropsSummary = exercise.burndown?.drops
              .filter(d => d.weight != null && d.reps != null)
              .map(d => `${d.weight}x${d.reps}`)
              .join(', ');

            return (
              <div key={session.id} className="history-exercise-entry">
                <span className="history-date">{formatDateTime(session.startedAt)}</span>
                {setsSummary && <span className="history-ex-sets">{setsSummary}</span>}
                {dropsSummary && <span className="history-ex-drops">Drops: {dropsSummary}</span>}
                {exercise.notes && <span className="history-ex-notes">{exercise.notes}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FullHistoryContent() {
  const { state } = useWorkout();

  return (
    <div className="history-content">
      {state.history.length === 0 ? (
        <p className="history-empty">No workouts completed yet</p>
      ) : (
        <div className="history-list">
          {state.history.map(session => (
            <SessionSummary key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HistoryView({ open, onClose, exerciseId, exerciseName }: HistoryViewProps) {
  const title = exerciseId && exerciseName
    ? `${exerciseName} History`
    : 'Workout History';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {exerciseId && exerciseName ? (
        <ExerciseHistoryContent exerciseId={exerciseId} exerciseName={exerciseName} />
      ) : (
        <FullHistoryContent />
      )}
    </Modal>
  );
}
