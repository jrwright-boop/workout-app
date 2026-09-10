import { useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useWorkout } from '../../hooks/useWorkout';
import { hitTopOfRange } from '../../utils/repRange';
import { formatElapsed } from '../../utils/date';
import { sessionVolume } from '../../utils/metrics';
import { computeRecords, exerciseRecordsBeaten, recordLabel } from '../../utils/records';
import { findAllPerformed, withType } from '../../utils/exerciseHistory';
import type { WorkoutSession } from '../../types';
import './WorkoutSummaryModal.css';

interface WorkoutSummaryModalProps {
  session: WorkoutSession | null;
  onClose: () => void;
}

export function WorkoutSummaryModal({ session, onClose }: WorkoutSummaryModalProps) {
  const { state } = useWorkout();

  const summary = useMemo(() => {
    if (!session) return null;

    // The prop is a pre-finish snapshot (completedAt null); the stored copy
    // in history carries the real completion time.
    const stored = state.history.find(s => s.id === session.id);
    const endIso = session.completedAt ?? stored?.completedAt ?? session.startedAt;
    const durationSec = Math.max(0, Math.floor(
      (new Date(endIso).getTime() - new Date(session.startedAt).getTime()) / 1000
    ));

    const active = session.exercises.filter(ex => !ex.skipped);
    const completedSets = active.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
    const totalSets = active.reduce((sum, ex) => sum + ex.sets.length, 0);
    const volume = sessionVolume(session);
    const progressed = active.filter(hitTopOfRange).map(ex => ex.name);

    // Most recent earlier session of the same day, for a volume comparison.
    // (By the time this renders, the finished session is already in history.)
    const priorHistory = state.history.filter(s => s.id !== session.id);
    const previous = priorHistory.find(s => s.dayId === session.dayId);
    const prevVolume = previous ? sessionVolume(previous) : 0;
    const volumeDelta = prevVolume > 0 ? Math.round(((volume - prevVolume) / prevVolume) * 100) : null;

    // Personal records: compare each exercise against everything before today.
    const records = active.flatMap(ex => {
      const prior = computeRecords(withType(findAllPerformed(priorHistory, ex.exerciseId, ex.name), ex));
      const kinds = exerciseRecordsBeaten(ex, prior, session.bodyweight);
      return kinds.map(k => `${ex.name}: ${recordLabel(k).toLowerCase()}`);
    });

    return { durationSec, completedSets, totalSets, volume, progressed, volumeDelta, records };
  }, [session, state.history]);

  if (!session || !summary) return null;

  return (
    <Modal open onClose={onClose} title="Workout Complete 💪">
      <div className="summary-content">
        <h3 className="summary-day-name">{session.dayName}</h3>

        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-value">{session.backdated ? '—' : formatElapsed(summary.durationSec)}</span>
            <span className="summary-stat-label">{session.backdated ? 'Logged later' : 'Duration'}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">{summary.completedSets}/{summary.totalSets}</span>
            <span className="summary-stat-label">Sets</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">
              {summary.volume.toLocaleString()}
              <span className="summary-stat-unit"> {state.unit}</span>
            </span>
            <span className="summary-stat-label">
              Volume
              {summary.volumeDelta !== null && (
                <span className={`summary-delta ${summary.volumeDelta >= 0 ? 'summary-delta--up' : 'summary-delta--down'}`}>
                  {' '}{summary.volumeDelta >= 0 ? '+' : ''}{summary.volumeDelta}%
                </span>
              )}
            </span>
          </div>
        </div>

        {summary.records.length > 0 && (
          <div className="summary-records">
            <span className="summary-records-title">🏆 New personal records</span>
            {summary.records.map(r => (
              <span key={r} className="summary-records-item">{r}</span>
            ))}
          </div>
        )}

        {summary.progressed.length > 0 && (
          <div className="summary-progressed">
            <span className="summary-progressed-title">🎯 Ready to progress next time</span>
            <span className="summary-progressed-names">{summary.progressed.join(', ')}</span>
          </div>
        )}

        <button className="btn btn--accent btn--full" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
