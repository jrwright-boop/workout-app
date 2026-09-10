import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { BodyweightEntry } from '../../types';
import { formatDate } from '../../utils/date';
import './ExerciseChart.css';

export function BodyweightChart({ log, unit }: { log: BodyweightEntry[]; unit: string }) {
  const data = useMemo(() => [...log].reverse().map(e => ({ date: formatDate(e.date), weight: e.weight })), [log]);
  if (data.length < 2) return null;
  return (
    <div className="chart-section">
      <h4 className="chart-title">Bodyweight ({unit})</h4>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={44} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} labelStyle={{ color: 'var(--text-secondary)' }} />
          <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent)' }} name="Bodyweight" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
