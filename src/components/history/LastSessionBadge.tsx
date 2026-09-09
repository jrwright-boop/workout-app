import type { LastPerformedInfo } from '../../utils/exerciseHistory';
import type { SessionExercise } from '../../types';
import { formatDate } from '../../utils/date';
import './LastSessionBadge.css';

interface LastSessionBadgeProps {
  info: LastPerformedInfo;
}

function summarise(ex: SessionExercise): string {
  return ex.sets
    .filter(s => !s.warmup && s.weight != null && s.reps != null)
    .map(s => `${s.weight}x${s.reps}`)
    .join(', ');
}

/**
 * "Last (Sep 1): 155x10, ..." for the same day's plan, with a second line
 * when the exercise was done more recently elsewhere (another day, or as a
 * make-up) so that information is visible without driving the pre-fill.
 */
export function LastSessionBadge({ info }: LastSessionBadgeProps) {
  const { last, newer } = info;
  if (!last) return null;
  const setsSummary = summarise(last.exercise);
  if (!setsSummary) return null;

  const newerSummary = newer ? summarise(newer.exercise) : '';
  const newerContext = newer
    ? newer.exercise.origin === 'makeup' ? `make-up on ${newer.session.dayName}` : `on ${newer.session.dayName}`
    : '';

  return (
    <div className="last-session-badge">
      <div className="last-session-line">
        <span className="last-label">Last ({formatDate(last.session.startedAt)}):</span>
        <span className="last-sets">{setsSummary}</span>
      </div>
      {newer && newerSummary && (
        <div className="last-session-line last-session-line--newer">
          <span className="last-label">{formatDate(newer.session.startedAt)} {newerContext}:</span>
          <span className="last-sets">{newerSummary}</span>
        </div>
      )}
    </div>
  );
}
