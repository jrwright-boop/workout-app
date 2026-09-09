import { useMemo, useState } from 'react';
import type { WorkoutSession } from '../../types';
import { monthGrid, trainingStats } from '../../utils/calendar';
import { toISODate } from '../../utils/date';
import './TrainingCalendar.css';

interface TrainingCalendarProps {
  history: WorkoutSession[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function TrainingCalendar({ history, selectedDate, onSelectDate }: TrainingCalendarProps) {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const today = toISODate(now);

  const cells = useMemo(() => monthGrid(view.year, view.month, history), [view, history]);
  const stats = useMemo(() => trainingStats(history), [history]);

  const shift = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="calendar">
      <div className="calendar-stats">
        <div className="calendar-stat">
          <span className="calendar-stat-value">{stats.thisWeek}</span>
          <span className="calendar-stat-label">This week</span>
        </div>
        <div className="calendar-stat">
          <span className="calendar-stat-value">{stats.avgPerWeek}</span>
          <span className="calendar-stat-label">Avg / week</span>
        </div>
        <div className="calendar-stat">
          <span className="calendar-stat-value">{stats.streakWeeks}</span>
          <span className="calendar-stat-label">Week streak</span>
        </div>
        <div className="calendar-stat">
          <span className="calendar-stat-value">{stats.totalSessions}</span>
          <span className="calendar-stat-label">Total</span>
        </div>
      </div>

      <div className="calendar-header">
        <button type="button" className="calendar-nav" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <span className="calendar-month">{MONTHS[view.month]} {view.year}</span>
        <button type="button" className="calendar-nav" onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>

      <div className="calendar-grid" role="grid">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="calendar-weekday" aria-hidden="true">{d}</span>
        ))}
        {cells.map(cell => {
          const trained = cell.sessions.length > 0;
          const selected = cell.date === selectedDate;
          const cls = [
            'calendar-cell',
            cell.inMonth ? '' : 'calendar-cell--outside',
            trained ? 'calendar-cell--trained' : '',
            selected ? 'calendar-cell--selected' : '',
            cell.date === today ? 'calendar-cell--today' : '',
          ].join(' ');
          const label = trained
            ? `${cell.date}: ${cell.sessions.map(s => s.dayName).join(', ')}`
            : cell.date;
          return (
            <button
              key={cell.date}
              type="button"
              className={cls}
              disabled={!trained}
              aria-label={label}
              aria-pressed={selected}
              onClick={() => onSelectDate(selected ? null : cell.date)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
