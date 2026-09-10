import { useMemo, useState } from 'react';
import { useWorkout } from '../../hooks/useWorkout';
import { MUSCLE_GROUPS } from '../../types';
import { weeklyVolume } from '../../utils/weeklyVolume';
import { formatMuscle } from '../../utils/muscles';
import './WeeklyVolume.css';

/** Completed working sets per muscle group, this week vs. a 4-week average. */
export function WeeklyVolume() {
  const { state } = useWorkout();
  const [view, setView] = useState<'week' | 'avg'>('week');
  const data = useMemo(() => weeklyVolume(state), [state]);
  const counts = view === 'week' ? data.thisWeek : data.fourWeekAvg;
  const rows = MUSCLE_GROUPS
    .map(m => ({ m, sets: counts[m] }))
    .filter(r => r.sets > 0 || data.fourWeekAvg[r.m] > 0)
    .sort((a, b) => b.sets - a.sets);
  const max = Math.max(1, ...rows.map(r => r.sets));

  if (rows.length === 0) return null;

  return (
    <div className="weekly-volume">
      <div className="weekly-volume-header">
        <span className="weekly-volume-title">Sets per muscle</span>
        <div className="segmented segmented--small" role="radiogroup" aria-label="Volume period">
          <button type="button" role="radio" aria-checked={view === 'week'} className={`segmented-btn ${view === 'week' ? 'segmented-btn--active' : ''}`} onClick={() => setView('week')}>This week</button>
          <button type="button" role="radio" aria-checked={view === 'avg'} className={`segmented-btn ${view === 'avg' ? 'segmented-btn--active' : ''}`} onClick={() => setView('avg')}>4-wk avg</button>
        </div>
      </div>
      <div className="weekly-volume-bars">
        {rows.map(r => (
          <div key={r.m} className="volume-row">
            <span className="volume-label">{formatMuscle(r.m)}</span>
            <div className="volume-track">
              <div className="volume-bar" style={{ width: `${(r.sets / max) * 100}%` }} />
            </div>
            <span className="volume-value">{r.sets}</span>
          </div>
        ))}
      </div>
      <span className="weekly-volume-hint">
        Primary muscles count a full set, secondary muscles half. Muscles come from exercise names; override them in the exercise editor.
        {data.untagged.length > 0 && ` Not counted: ${data.untagged.join(', ')}.`}
      </span>
    </div>
  );
}
