import { memo, useState } from 'react';
import type { ExerciseTemplate, DayId } from '../../types';
import { useWorkout } from '../../hooks/useWorkout';
import { useLastSession } from '../../hooks/useExerciseHistory';
import { LastSessionBadge } from '../history/LastSessionBadge';
import { HistoryView } from '../history/HistoryView';
import './ExerciseCard.css';

interface ExerciseCardProps {
  exercise: ExerciseTemplate;
  dayId: DayId;
  onEdit: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  dayId,
  onEdit,
  dragHandleProps,
}: ExerciseCardProps) {
  const { dispatch } = useWorkout();
  const lastSession = useLastSession(exercise.id);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <div className={`exercise-card ${exercise.skipped ? 'exercise-card--skipped' : ''}`}>
        <div className="exercise-card-header">
          <button className="drag-handle" {...(dragHandleProps ?? {})}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="2" /><circle cx="15" cy="6" r="2" />
              <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
              <circle cx="9" cy="18" r="2" /><circle cx="15" cy="18" r="2" />
            </svg>
          </button>
          <button className="exercise-name" onClick={() => setShowHistory(true)}>
            {exercise.name}
          </button>
          <div className="exercise-meta">
            <span className="set-count">{exercise.defaultSetCount}s</span>
          </div>
          <div className="exercise-actions">
            <button
              className={`skip-btn ${exercise.skipped ? 'skip-btn--active' : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_SKIP', payload: { dayId, exerciseId: exercise.id } })}
              title={exercise.skipped ? 'Unskip' : 'Skip'}
            >
              {exercise.skipped ? 'Skipped' : 'Skip'}
            </button>
            <button className="edit-btn" onClick={onEdit}>Edit</button>
            <button
              className="delete-btn"
              onClick={() => {
                if (confirm(`Delete "${exercise.name}"?`)) {
                  dispatch({ type: 'DELETE_EXERCISE', payload: { dayId, exerciseId: exercise.id } });
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
              </svg>
            </button>
          </div>
        </div>
        {lastSession && !exercise.skipped && (
          <LastSessionBadge entry={lastSession} />
        )}
      </div>
      <HistoryView
        open={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
      />
    </>
  );
});
