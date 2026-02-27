import { useState, useEffect } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkout } from './hooks/useWorkout';
import { SetList } from './components/sets/SetList';
import { RestTimer } from './components/sets/RestTimer';
import { useLastSession } from './hooks/useExerciseHistory';
import type { SessionExercise } from './types';
import { formatDate, formatElapsed } from './utils/date';
import './ActiveSession.css';

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
  const { dispatch } = useWorkout();
  const lastEntry = useLastSession(exercise.exerciseId);

  return (
    <div className={`session-exercise ${exercise.skipped ? 'session-exercise--skipped' : ''}`}>
      <div className="session-exercise-header">
        <button className="session-drag-handle" {...(dragHandleProps ?? {})}>
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
              Last ({formatDate(lastEntry.session.date)}):{' '}
              {lastEntry.exercise.sets
                .filter(s => s.weight != null && s.reps != null)
                .map(s => `${s.weight}x${s.reps}`)
                .join(', ')}
            </span>
          )}
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

export function ActiveSession() {
  const { state, dispatch } = useWorkout();
  const session = state.activeSession;
  const [showRestTimer, setShowRestTimer] = useState(false);

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

  return (
    <div className="active-session">
      <div className="session-header">
        <div>
          <h2 className="session-day-name">{session.dayName}</h2>
          <span className="session-progress">{completedSets}/{totalSets} sets completed</span>
        </div>
        <WorkoutTimer startedAt={session.startedAt} />
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={exerciseIds} strategy={verticalListSortingStrategy}>
          <div className="session-exercises">
            {session.exercises.map((exercise, index) => (
              <SortableSessionExercise
                key={exercise.exerciseId}
                exercise={exercise}
                exerciseIndex={index}
                onSetCompleted={() => setShowRestTimer(true)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className={`session-footer ${showRestTimer ? 'session-footer--with-timer' : ''}`}>
        <button
          className="btn btn--accent btn--full btn--large"
          onClick={() => {
            if (confirm('Finish this workout?')) {
              dispatch({ type: 'FINISH_SESSION' });
            }
          }}
        >
          Finish Workout ({completedSets}/{totalSets})
        </button>
        <button
          className="btn btn--danger btn--full"
          onClick={() => {
            if (confirm('Discard this workout? All logged data will be lost.')) {
              dispatch({ type: 'DISCARD_SESSION' });
            }
          }}
        >
          Discard Workout
        </button>
      </div>

      {showRestTimer && (
        <RestTimer onDismiss={() => setShowRestTimer(false)} />
      )}
    </div>
  );
}
