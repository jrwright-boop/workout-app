import { useState, useEffect } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkout } from './hooks/useWorkout';
import { SetList } from './components/sets/SetList';
import { RestTimer } from './components/sets/RestTimer';
import { AddSessionExerciseForm } from './components/exercises/AddSessionExerciseForm';
import { useLastSession, useProgressAssessment } from './hooks/useExerciseHistory';
import type { SessionExercise, WorkoutSession } from './types';
import { formatDate, formatDateTime, formatElapsed } from './utils/date';
import { hitTopOfRange, progressionHint } from './utils/repRange';
import { defaultIncrement } from './utils/units';
import './ActiveSession.css';

function summariseSets(ex: SessionExercise): string {
  return ex.sets
    .filter(s => !s.warmup && s.reps != null && (s.weight != null || ex.loadType !== 'external'))
    .map(s => (s.weight != null ? `${s.weight}x${s.reps}` : `BWx${s.reps}`))
    .join(', ');
}

function SessionExerciseCard({
  exercise,
  exerciseIndex,
  onSetCompleted,
  dragHandleProps,
}: {
  exercise: SessionExercise;
  exerciseIndex: number;
  onSetCompleted: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const { state, dispatch } = useWorkout();
  const { last: lastEntry, newer } = useLastSession(exercise.exerciseId, exercise.name, exercise.origin === 'scheduled' ? state.activeSession?.dayId : null);
  const readyToProgress = hitTopOfRange(exercise);
  const suggestedSet = exercise.sets.find(s => s.suggested && s.weight != null);
  const step = exercise.increment ?? defaultIncrement(state.unit);
  const dayId = state.activeSession?.dayId ?? null;
  const template = dayId ? state.days[dayId]?.exercises[exercise.exerciseId] ?? null : null;
  const progress = useProgressAssessment(exercise.exerciseId, exercise.name, exercise.origin === 'scheduled' ? exercise : null, dayId);
  const cues = template?.cues ?? '';

  return (
    <div className={`session-exercise ${exercise.skipped ? 'session-exercise--skipped' : ''} ${readyToProgress ? 'session-exercise--progress' : ''}`}>
      <div className="session-exercise-header">
        <button className="session-drag-handle" aria-label={`Reorder ${exercise.name}`} {...(dragHandleProps ?? {})}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="2" /><circle cx="15" cy="6" r="2" />
            <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
            <circle cx="9" cy="18" r="2" /><circle cx="15" cy="18" r="2" />
          </svg>
        </button>
        <div className="session-exercise-info">
          <h3 className="session-exercise-name">{exercise.name}</h3>
          {lastEntry && !exercise.skipped && (
            <span className="session-last-info">
              Last ({formatDate(lastEntry.session.startedAt)}):{' '}
              {summariseSets(lastEntry.exercise)}
              {newer && (
                <span className="session-last-newer">
                  {' · '}{formatDate(newer.session.startedAt)} {newer.exercise.origin === 'makeup' ? 'make-up' : newer.session.dayName}:{' '}
                  {summariseSets(newer.exercise)}
                </span>
              )}
            </span>
          )}
          {exercise.origin === 'makeup' && <span className="origin-tag">make-up</span>}
          {cues && <span className="session-cues">{cues}</span>}
        </div>
        <button
          className={`session-skip-btn ${exercise.skipped ? 'session-skip-btn--active' : ''}`}
          onClick={() => dispatch({
            type: 'TOGGLE_SESSION_EXERCISE_SKIP',
            payload: { exerciseIndex },
          })}
        >
          {exercise.skipped ? 'Skipped' : 'Skip'}
        </button>
      </div>
      {!exercise.skipped && (
        <>
          {suggestedSet && !readyToProgress && (
            <div className="suggestion-banner">
              ↑ Pre-filled {exercise.loadType === 'assisted' ? `${step} ${state.unit} less assistance` : `+${step} ${state.unit}`}: you hit the top of your range last time. Edit if it's too much.
            </div>
          )}
          {progress && !suggestedSet && !readyToProgress && (
            <div className="stall-banner">
              {progress.kind === 'stalled'
                ? `Stuck at ${progress.weight} ${state.unit} for ${progress.sessions} sessions. Try more reps, a smaller step, or a deload week.`
                : `Missed the bottom of the range ${progress.misses} sessions running.${progress.suggestedWeight != null ? ` Consider ${progress.suggestedWeight} ${state.unit}.` : ''}`}
            </div>
          )}
          {readyToProgress && (
            <div className="progress-banner">
              🎯 Hit the top of your range on every set — {progressionHint(exercise.loadType, exercise.measure)}
            </div>
          )}
          <SetList exercise={exercise} exerciseIndex={exerciseIndex} onSetCompleted={onSetCompleted} />
          <textarea
            className="session-notes"
            placeholder="Notes..."
            value={exercise.notes}
            onChange={e => dispatch({
              type: 'UPDATE_EXERCISE_NOTES',
              payload: { exerciseIndex, notes: e.target.value },
            })}
          />
        </>
      )}
    </div>
  );
}

function SortableSessionExercise({
  exercise,
  exerciseIndex,
  onSetCompleted,
}: {
  exercise: SessionExercise;
  exerciseIndex: number;
  onSetCompleted: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.exerciseId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SessionExerciseCard
        exercise={exercise}
        exerciseIndex={exerciseIndex}
        onSetCompleted={onSetCompleted}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function WorkoutTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startMs = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="session-timer">{formatElapsed(elapsed)}</span>;
}

export function ActiveSession({ onFinished }: { onFinished?: (session: WorkoutSession) => void }) {
  const { state, dispatch, dispatchUndoable } = useWorkout();
  const session = state.activeSession;
  const [showRestTimer, setShowRestTimer] = useState(false);
  // Bumped on every completed set so the RestTimer remounts with a full countdown.
  const [restTimerKey, setRestTimerKey] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);

  if (!session) return null;

  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + (ex.skipped ? 0 : ex.sets.filter(s => s.completed).length), 0
  );
  const totalSets = session.exercises.reduce(
    (sum, ex) => sum + (ex.skipped ? 0 : ex.sets.length), 0
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = session.exercises.findIndex(e => e.exerciseId === active.id);
    const newIndex = session.exercises.findIndex(e => e.exerciseId === over.id);
    const newExercises = [...session.exercises];
    const [moved] = newExercises.splice(oldIndex, 1);
    newExercises.splice(newIndex, 0, moved);
    dispatch({ type: 'REORDER_SESSION_EXERCISES', payload: { exercises: newExercises } });
  };

  const exerciseIds = session.exercises.map(e => e.exerciseId);

  // Consecutive exercises sharing a superset group render together and only
  // the last member of a group triggers the rest timer.
  type Group = { key: string; group: string | null; indices: number[] };
  const groups: Group[] = [];
  session.exercises.forEach((ex, index) => {
    const prev = groups[groups.length - 1];
    if (ex.supersetGroup && prev && prev.group === ex.supersetGroup) prev.indices.push(index);
    else groups.push({ key: `${ex.supersetGroup ?? 'solo'}-${index}`, group: ex.supersetGroup, indices: [index] });
  });
  const restsAfter = (index: number) => {
    const g = groups.find(gr => gr.indices.includes(index));
    return !g || g.indices.length < 2 || g.indices[g.indices.length - 1] === index;
  };

  return (
    <div className="active-session">
      <div className="session-header">
        <div>
          <h2 className="session-day-name">
            {session.dayName}
            {session.deload && <span className="deload-tag">deload</span>}
          </h2>
          <span className="session-progress">
            {session.backdated ? `Logging for ${formatDateTime(session.startedAt)} · ` : ''}
            {completedSets}/{totalSets} sets completed
          </span>
        </div>
        {!session.backdated && <WorkoutTimer startedAt={session.startedAt} />}
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={exerciseIds} strategy={verticalListSortingStrategy}>
          <div className="session-exercises">
            {groups.map(g => {
              const items = g.indices.map(index => (
                <SortableSessionExercise
                  key={session.exercises[index].exerciseId}
                  exercise={session.exercises[index]}
                  exerciseIndex={index}
                  onSetCompleted={() => {
                    if (!restsAfter(index)) return;
                    setShowRestTimer(true);
                    setRestTimerKey(k => k + 1);
                  }}
                />
              ));
              if (g.indices.length < 2) return items;
              return (
                <div key={g.key} className="superset-group">
                  <span className="superset-label">⛓ Superset · alternate sets, rest after the last</span>
                  {items}
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <button
        className="btn btn--outline btn--full session-add-exercise-btn"
        onClick={() => setShowAddExercise(true)}
      >
        + Add Exercise
      </button>

      <div className={`session-footer ${showRestTimer ? 'session-footer--with-timer' : ''}`}>
        <button
          className="btn btn--accent btn--full btn--large"
          onClick={() => {
            if (confirm('Finish this workout?')) {
              onFinished?.(session);
              dispatch({ type: 'FINISH_SESSION' });
            }
          }}
        >
          Finish Workout ({completedSets}/{totalSets})
        </button>
        <button
          className="btn btn--danger btn--full"
          onClick={() => {
            if (confirm('Discard this workout?')) {
              dispatchUndoable({ type: 'DISCARD_SESSION' }, 'Workout discarded');
            }
          }}
        >
          Discard Workout
        </button>
      </div>

      {showRestTimer && (
        <RestTimer
          key={restTimerKey}
          onDismiss={() => setShowRestTimer(false)}
          defaultSeconds={state.restSeconds}
          notify={state.restNotifications}
        />
      )}

      <AddSessionExerciseForm
        open={showAddExercise}
        onClose={() => setShowAddExercise(false)}
      />
    </div>
  );
}
