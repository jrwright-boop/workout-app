import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ExerciseHistoryEntry } from '../../hooks/useExerciseHistory';
import { formatDate } from '../../utils/date';
import './ExerciseChart.css';

interface ExerciseChartProps {
  history: ExerciseHistoryEntry[];
}

function est1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

export function ExerciseChart({ history }: ExerciseChartProps) {
  const data = useMemo(() => {
    return [...history].reverse().map(({ session, exercise }) => {
      let bestE1RM = 0;
      let totalVolume = 0;

      for (const set of exercise.sets) {
        if (set.weight != null && set.reps != null) {
          const e = est1RM(set.weight, set.reps);
          if (e > bestE1RM) bestE1RM = e;
          totalVolume += set.weight * set.reps;
        }
      }

      if (exercise.burndown) {
        for (const drop of exercise.burndown.drops) {
          if (drop.weight != null && drop.reps != null) {
            totalVolume += drop.weight * drop.reps;
          }
        }
      }

      return {
        date: formatDate(session.date),
        e1rm: bestE1RM || undefined,
        volume: totalVolume || undefined,
      };
    });
  }, [history]);

  if (data.length < 2) {
    return <p className="chart-empty">Need at least 2 sessions to show trends</p>;
  }

  return (
    <div className="exercise-charts">
      <div className="chart-section">
        <h4 className="chart-title">Est. 1RM</h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={40} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--text-secondary)' }}
            />
            <Line
              type="monotone"
              dataKey="e1rm"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--accent)' }}
              name="Est. 1RM"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-section">
        <h4 className="chart-title">Total Volume</h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={50} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--text-secondary)' }}
            />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#34c759"
              strokeWidth={2}
              dot={{ r: 4, fill: '#34c759' }}
              name="Volume"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
