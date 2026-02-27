import type { ExerciseHistoryEntry } from '../../hooks/useExerciseHistory';
import { formatDate } from '../../utils/date';
import './LastSessionBadge.css';

interface LastSessionBadgeProps {
  entry: ExerciseHistoryEntry;
}

export function LastSessionBadge({ entry }: LastSessionBadgeProps) {
  const { session, exercise } = entry;
  const setsSummary = exercise.sets
    .filter(s => s.weight != null && s.reps != null)
    .map(s => `${s.weight}x${s.reps}`)
    .join(', ');

  if (!setsSummary) return null;

  return (
    <div className="last-session-badge">
      <span className="last-label">Last ({formatDate(session.date)}):</span>
      <span className="last-sets">{setsSummary}</span>
    </div>
  );
}
