import { Modal } from '../common/Modal';
import { useWorkout } from '../../hooks/useWorkout';
import { useExerciseHistory } from '../../hooks/useExerciseHistory';
import { ExerciseChart } from './ExerciseChart';
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
  return (
    <div className="history-session">
      <div className="history-session-header">
        <span className="history-day-name">{session.dayName}</span>
        <span className="history-date">{formatDateTime(session.startedAt)}</span>
      </div>
      {session.exercises.map((ex, i) => {
        const setsSummary = ex.sets
          .filter(s => s.weight != null && s.reps != null)
          .map(s => `${s.weight}x${s.reps}`)
          .join(', ');

        const dropsSummary = ex.burndown?.drops
          .filter(d => d.weight != null && d.reps != null)
          .map(d => `${d.weight}x${d.reps}`)
          .join(', ');

        return (
          <div key={i} className="history-exercise">
            <span className="history-ex-name">{ex.name}</span>
            {setsSummary && <span className="history-ex-sets">{setsSummary}</span>}
            {dropsSummary && <span className="history-ex-drops">Drops: {dropsSummary}</span>}
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
