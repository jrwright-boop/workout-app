import { memo, useState } from 'react';
import type { ExerciseTemplate, DayId } from '../../types';
import { useWorkout } from '../../hooks/useWorkout';
import { useLastSession, useProgressAssessment } from '../../hooks/useExerciseHistory';
import { LastSessionBadge } from '../history/LastSessionBadge';
import { HistoryView } from '../history/HistoryView';
import { formatRepRange } from '../../utils/repRange';
import './ExerciseCard.css';

interface ExerciseCardProps {
  exercise: ExerciseTemplate;
  dayId: DayId;
  onEdit: () => void;
  dragHandleProps?: Record<string, unknown>;
}

function typeBadge(ex: ExerciseTemplate): string | null {
  const parts: string[] = [];
  if (ex.loadType === 'assisted') parts.push('assisted');
  if (ex.loadType === 'bodyweight') parts.push('BW');
  if (ex.perSide) parts.push('each');
  if (ex.measure === 'seconds') parts.push('timed');
  return parts.length ? parts.join(' · ') : null;
}

export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  dayId,
  onEdit,
  dragHandleProps,
}: ExerciseCardProps) {
  const { state, dispatch, dispatchUndoable } = useWorkout();
  const lastInfo = useLastSession(exercise.id, exercise.name, dayId);
  const progress = useProgressAssessment(exercise.id, exercise.name, exercise, dayId);
  const partner = exercise.supersetGroup
    ? Object.values(state.days[dayId].exercises).find(e => e.id !== exercise.id && e.supersetGroup === exercise.supersetGroup)
    : null;
  const [showHistory, setShowHistory] = useState(false);
  const targetRange = formatRepRange(exercise.targetRepMin, exercise.targetRepMax, exercise.measure);
  const badge = typeBadge(exercise);

  return (
    <>
      <div className={`exercise-card ${exercise.skipped ? 'exercise-card--skipped' : ''}`}>
        <div className="exercise-card-header">
          <button className="drag-handle" aria-label={`Reorder ${exercise.name}`} {...(dragHandleProps ?? {})}>
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
            {targetRange && <span className="target-badge">{targetRange}</span>}
            {badge && <span className="type-badge">{badge}</span>}
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
              aria-label={`Delete ${exercise.name}`}
              onClick={() => dispatchUndoable(
                { type: 'DELETE_EXERCISE', payload: { dayId, exerciseId: exercise.id } },
                `Removed ${exercise.name}`
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
              </svg>
            </button>
          </div>
        </div>
        {partner && <span className="superset-badge">⛓ Superset with {partner.name}</span>}
        {lastInfo.last && !exercise.skipped && (
          <LastSessionBadge info={lastInfo} />
        )}
        {progress && !exercise.skipped && (
          <span className="progress-note">
            {progress.kind === 'stalled'
              ? `Stuck at ${progress.weight} ${state.unit} for ${progress.sessions} sessions. Try more reps, a smaller step, or a deload.`
              : `Missed the bottom of the range ${progress.misses} sessions running.${progress.suggestedWeight != null ? ` Consider ${progress.suggestedWeight} ${state.unit}${exercise.loadType === 'assisted' ? ' assistance' : ''}.` : ''}`}
          </span>
        )}
      </div>
      <HistoryView
        open={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        exerciseType={exercise}
        dayId={dayId}
      />
    </>
  );
});
