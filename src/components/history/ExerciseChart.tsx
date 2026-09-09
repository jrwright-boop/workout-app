import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ExerciseHistoryEntry } from '../../hooks/useExerciseHistory';
import { formatDate } from '../../utils/date';
import { exerciseMetrics } from '../../utils/metrics';
import './ExerciseChart.css';

interface ExerciseChartProps {
  history: ExerciseHistoryEntry[];
  unit: string;
}

interface Series {
  key: string;
  title: string;
  color: string;
  /** Reverse the Y axis so "down" reads as progress (assistance). */
  invert?: boolean;
}

function seriesFor(latest: ExerciseHistoryEntry['exercise'], unit: string): Series[] {
  if (latest.measure === 'seconds') {
    return [
      { key: 'bestSeconds', title: 'Longest hold (s)', color: 'var(--accent)' },
      ...(latest.loadType === 'external' ? [{ key: 'bestWeight', title: `Weight (${unit})`, color: '#34c759' }] : []),
    ];
  }
  if (latest.loadType === 'assisted') {
    return [
      { key: 'minAssistance', title: `Assistance (${unit}, lower is better)`, color: 'var(--accent)', invert: true },
      { key: 'bestReps', title: 'Best reps', color: '#34c759' },
    ];
  }
  if (latest.loadType === 'bodyweight') {
    return [
      { key: 'bestReps', title: 'Best reps', color: 'var(--accent)' },
      { key: 'totalReps', title: 'Total reps', color: '#34c759' },
    ];
  }
  return [
    { key: 'e1rm', title: `Est. 1RM (${unit})`, color: 'var(--accent)' },
    { key: 'volume', title: `Total volume (${unit})`, color: '#34c759' },
  ];
}

export function ExerciseChart({ history, unit }: ExerciseChartProps) {
  const data = useMemo(() => {
    return [...history].reverse().map(({ session, exercise }) => {
      const m = exerciseMetrics(exercise);
      const makeup = exercise.origin === 'makeup';
      return {
        // startedAt matches the timestamps shown in the history list.
        date: formatDate(session.startedAt),
        label: `${formatDate(session.startedAt)} · ${session.dayName}${makeup ? ' (make-up)' : ''}`,
        makeup,
        e1rm: m.e1rm ?? undefined,
        volume: m.volume || undefined,
        bestWeight: m.bestWeight ?? undefined,
        minAssistance: m.minAssistance ?? undefined,
        bestReps: m.bestReps ?? undefined,
        totalReps: m.totalReps || undefined,
        bestSeconds: m.bestSeconds ?? undefined,
      };
    });
  }, [history]);

  if (data.length < 2) {
    return <p className="chart-empty">Need at least 2 sessions to show trends</p>;
  }

  const series = seriesFor(history[0].exercise, unit);

  return (
    <div className="exercise-charts">
      {series.map(s => (
        <div className="chart-section" key={s.key}>
          <h4 className="chart-title">{s.title}</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={50} reversed={s.invert} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                labelFormatter={(_label, payload) => (payload?.[0]?.payload as { label?: string } | undefined)?.label ?? String(_label)}
              />
              <Line
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                // Make-ups draw as hollow dots so they're visible but distinguishable.
                dot={(props: { cx?: number; cy?: number; payload?: { makeup?: boolean }; value?: unknown }) => {
                  const { cx, cy, payload, value } = props;
                  if (cx == null || cy == null || value == null) return <g key={`${s.key}-${cx}`} />;
                  const hollow = !!payload?.makeup;
                  return (
                    <circle
                      key={`${s.key}-${cx}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={hollow ? 'var(--surface)' : s.color}
                      stroke={s.color}
                      strokeWidth={2}
                    />
                  );
                }}
                name={s.title}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
