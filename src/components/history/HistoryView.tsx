import { lazy, Suspense, useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { useWorkout } from '../../hooks/useWorkout';
import { useExerciseHistory, useExerciseRecords } from '../../hooks/useExerciseHistory';
import { NumericInput } from '../common/NumericInput';
import { TrainingCalendar } from './TrainingCalendar';
import { formatDateTime } from '../../utils/date';
import { sessionDate } from '../../utils/calendar';
import type { ExerciseId, ExerciseTypeFields, SessionExercise, WorkoutSession } from '../../types';
import './HistoryView.css';

// Recharts is by far the heaviest dependency; load it only when someone
// actually opens an exercise's history.
const ExerciseChart = lazy(() =>
  import('./ExerciseChart').then(m => ({ default: m.ExerciseChart }))
);

interface HistoryViewProps {
  open: boolean;
  onClose: () => void;
  exerciseId?: ExerciseId;
  exerciseName?: string;
  /** The exercise's current type; history is read through it. */
  exerciseType?: ExerciseTypeFields;
}

interface ExerciseHistoryProps {
  exerciseId: ExerciseId;
  exerciseName: string;
  exerciseType?: ExerciseTypeFields;
}

function formatSets(ex: SessionExercise): string {
  const unitSuffix = ex.measure === 'seconds' ? 's' : '';
  return ex.sets
    .filter(s => s.weight != null || s.reps != null)
    .map(s => {
      const core = s.weight != null ? `${s.weight}x${s.reps ?? '?'}${unitSuffix}` : `${s.reps ?? '?'}${unitSuffix}`;
      return s.warmup ? `(${core})` : core;
    })
    .join(', ');
}

function SessionSummary({ session }: { session: WorkoutSession }) {
  const { state, dispatch } = useWorkout();
  const [editing, setEditing] = useState(false);

  const handleDelete = () => {
    if (confirm(`Delete this ${session.dayName} workout from ${formatDateTime(session.startedAt)}? This cannot be undone.`)) {
      dispatch({ type: 'DELETE_HISTORY_SESSION', payload: { sessionId: session.id } });
    }
  };

  return (
    <div className="history-session">
      <div className="history-session-header">
        <div className="history-session-title">
          <span className="history-day-name">{session.dayName}</span>
          <span className="history-date">{formatDateTime(session.startedAt)}</span>
        </div>
        <div className="history-session-actions">
          <button
            className={`history-action-btn ${editing ? 'history-action-btn--active' : ''}`}
            onClick={() => setEditing(e => !e)}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
          <button className="history-action-btn history-action-btn--danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
      {session.exercises.map((ex, exerciseIndex) => {
        const setsSummary = formatSets(ex);
        const dropsSummary = ex.burndown?.drops
          .filter(d => d.weight != null && d.reps != null)
          .map(d => `${d.weight}x${d.reps}`)
          .join(', ');

        return (
          <div key={exerciseIndex} className="history-exercise">
            <span className="history-ex-name">{ex.name}{ex.skipped ? ' (skipped)' : ''}</span>
            {editing ? (
              <div className="history-set-editor">
                {ex.sets.map((set, setIndex) => (
                  <div key={setIndex} className="history-set-edit-row">
                    <span className="history-set-edit-num">{set.warmup ? 'W' : setIndex + 1}</span>
                    <NumericInput
                      value={set.weight}
                      onChange={value => dispatch({
                        type: 'UPDATE_HISTORY_SET',
                        payload: { sessionId: session.id, exerciseIndex, setIndex, field: 'weight', value },
                      })}
                      placeholder={state.unit}
                    />
                    <span className="set-x">&times;</span>
                    <NumericInput
                      value={set.reps}
                      onChange={value => dispatch({
                        type: 'UPDATE_HISTORY_SET',
                        payload: { sessionId: session.id, exerciseIndex, setIndex, field: 'reps', value },
                      })}
                      placeholder={ex.measure === 'seconds' ? 'sec' : 'reps'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              setsSummary && <span className="history-ex-sets">{setsSummary}</span>
            )}
            {dropsSummary && <span className="history-ex-drops">Drops: {dropsSummary}</span>}
            {ex.notes && <span className="history-ex-notes">{ex.notes}</span>}
          </div>
        );
      })}
    </div>
  );
}

function RecordsRow({ exerciseId, exerciseName, exerciseType }: ExerciseHistoryProps) {
  const { state } = useWorkout();
  const records = useExerciseRecords(exerciseId, exerciseName, exerciseType);
  const unit = state.unit;
  const items: { label: string; value: string }[] = [];
  if (records.minAssistance != null) items.push({ label: 'Least assist', value: `${records.minAssistance} ${unit}` });
  if (records.bestWeight != null) items.push({ label: 'Heaviest', value: `${records.bestWeight} ${unit}` });
  if (records.bestE1RM != null) items.push({ label: 'Est. 1RM', value: `${records.bestE1RM} ${unit}` });
  if (records.bestReps != null) items.push({ label: 'Most reps', value: `${records.bestReps}` });
  if (records.bestSeconds != null) items.push({ label: 'Longest', value: `${records.bestSeconds}s` });
  if (records.bestVolume != null) items.push({ label: 'Best volume', value: records.bestVolume.toLocaleString() });
  if (items.length === 0) return null;
  return (
    <div className="records-row">
      {items.slice(0, 4).map(i => (
        <div key={i.label} className="record-stat">
          <span className="record-stat-value">{i.value}</span>
          <span className="record-stat-label">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

function ExerciseHistoryContent({ exerciseId, exerciseName, exerciseType }: ExerciseHistoryProps) {
  const { state } = useWorkout();
  const history = useExerciseHistory(exerciseId, exerciseName, exerciseType);

  return (
    <div className="history-content">
      <RecordsRow exerciseId={exerciseId} exerciseName={exerciseName} exerciseType={exerciseType} />

      <Suspense fallback={<p className="history-empty">Loading charts…</p>}>
        <ExerciseChart history={history} unit={state.unit} />
      </Suspense>

      {history.length === 0 ? (
        <p className="history-empty">No history yet for {exerciseName}</p>
      ) : (
        <div className="history-list">
          {history.map(({ session, exercise }) => {
            const setsSummary = formatSets(exercise);
            const dropsSummary = exercise.burndown?.drops
              .filter(d => d.weight != null && d.reps != null)
              .map(d => `${d.weight}x${d.reps}`)
              .join(', ');

            return (
              <div key={session.id} className="history-exercise-entry">
                <span className="history-date">
                  {formatDateTime(session.startedAt)}
                  {session.dayName && <span className="history-entry-day"> · {session.dayName}</span>}
                </span>
                {setsSummary && <span className="history-ex-sets">{setsSummary}</span>}
                {dropsSummary && <span className="history-ex-drops">Drops: {dropsSummary}</span>}
                {exercise.notes && <span className="history-ex-notes">{exercise.notes}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FullHistoryContent() {
  const { state } = useWorkout();
  const [query, setQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.history.filter(session => {
      if (selectedDate && sessionDate(session) !== selectedDate) return false;
      if (!q) return true;
      return session.dayName.toLowerCase().includes(q) ||
        session.exercises.some(ex => ex.name.toLowerCase().includes(q));
    });
  }, [state.history, query, selectedDate]);

  return (
    <div className="history-content">
      {state.history.length > 0 && (
        <TrainingCalendar history={state.history} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      )}
      {state.history.length > 0 && (
        <input
          type="text"
          className="form-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by day or exercise..."
        />
      )}
      {selectedDate && (
        <button type="button" className="history-filter-chip" onClick={() => setSelectedDate(null)}>
          Showing {selectedDate} · clear
        </button>
      )}
      {state.history.length === 0 ? (
        <p className="history-empty">No workouts completed yet</p>
      ) : filtered.length === 0 ? (
        <p className="history-empty">No workouts match</p>
      ) : (
        <div className="history-list">
          {filtered.map(session => (
            <SessionSummary key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HistoryView({ open, onClose, exerciseId, exerciseName, exerciseType }: HistoryViewProps) {
  const title = exerciseId && exerciseName
    ? `${exerciseName} History`
    : 'Workout History';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {exerciseId && exerciseName ? (
        <ExerciseHistoryContent exerciseId={exerciseId} exerciseName={exerciseName} exerciseType={exerciseType} />
      ) : (
        <FullHistoryContent />
      )}
    </Modal>
  );
}
