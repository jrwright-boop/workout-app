import { useWorkout } from './hooks/useWorkout';
import { SetList } from './components/sets/SetList';
import { useLastSession } from './hooks/useExerciseHistory';
import type { SessionExercise } from './types';
import { formatDate } from './utils/date';
import './ActiveSession.css';

function SessionExerciseCard({ exercise, exerciseIndex }: { exercise: SessionExercise; exerciseIndex: number }) {
  const lastEntry = useLastSession(exercise.exerciseId);

  return (
    <div className="session-exercise">
      <div className="session-exercise-header">
        <h3 className="session-exercise-name">{exercise.name}</h3>
        {lastEntry && (
          <span className="session-last-info">
            Last ({formatDate(lastEntry.session.date)}):{' '}
            {lastEntry.exercise.sets
              .filter(s => s.weight != null && s.reps != null)
              .map(s => `${s.weight}x${s.reps}`)
              .join(', ')}
          </span>
        )}
      </div>
      <SetList exercise={exercise} exerciseIndex={exerciseIndex} />
    </div>
  );
}

export function ActiveSession() {
  const { state, dispatch } = useWorkout();
  const session = state.activeSession;

  if (!session) return null;

  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0
  );
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div className="active-session">
      <div className="session-header">
        <div>
          <h2 className="session-day-name">{session.dayName}</h2>
          <span className="session-progress">{completedSets}/{totalSets} sets completed</span>
        </div>
      </div>

      <div className="session-exercises">
        {session.exercises.map((exercise, index) => (
          <SessionExerciseCard
            key={exercise.exerciseId}
            exercise={exercise}
            exerciseIndex={index}
          />
        ))}
      </div>

      <div className="session-footer">
        <button
          className="btn btn--accent btn--full btn--large"
          onClick={() => {
            if (confirm('Finish this workout?')) {
              dispatch({ type: 'FINISH_SESSION' });
            }
          }}
        >
          Finish Workout ({completedSets}/{totalSets})
        </button>
        <button
          className="btn btn--danger btn--full"
          onClick={() => {
            if (confirm('Discard this workout? All logged data will be lost.')) {
              dispatch({ type: 'DISCARD_SESSION' });
            }
          }}
        >
          Discard Workout
        </button>
      </div>
    </div>
  );
}
