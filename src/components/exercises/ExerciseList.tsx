import { useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkout } from '../../hooks/useWorkout';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseForm } from './ExerciseForm';
import type { DayId, ExerciseId, ExerciseTemplate } from '../../types';
import './ExerciseList.css';

function SortableExercise({ exercise, dayId, onEdit }: {
  exercise: ExerciseTemplate;
  dayId: DayId;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ExerciseCard
        exercise={exercise}
        dayId={dayId}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function ExerciseList({ dayId }: { dayId: DayId }) {
  const { state, dispatch } = useWorkout();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseTemplate | null>(null);
  const day = state.days[dayId];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = day.exerciseOrder.indexOf(active.id as ExerciseId);
    const newIndex = day.exerciseOrder.indexOf(over.id as ExerciseId);
    const newOrder = [...day.exerciseOrder];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, active.id as ExerciseId);
    dispatch({ type: 'REORDER_EXERCISES', payload: { dayId, exerciseOrder: newOrder } });
  };

  return (
    <div className="exercise-list">
      {day.exerciseOrder.length > 0 ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={day.exerciseOrder} strategy={verticalListSortingStrategy}>
            <div className="exercise-items">
              {day.exerciseOrder.map(exId => {
                const exercise = day.exercises[exId];
                return (
                  <SortableExercise
                    key={exId}
                    exercise={exercise}
                    dayId={dayId}
                    onEdit={() => setEditingExercise(exercise)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="empty-state">
          <p>No exercises yet</p>
          <p className="empty-hint">Add exercises to build your workout</p>
        </div>
      )}

      <button className="btn btn--accent btn--full add-exercise-btn" onClick={() => setShowAddForm(true)}>
        + Add Exercise
      </button>

      <ExerciseForm
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        dayId={dayId}
      />

      {editingExercise && (
        <ExerciseForm
          open={true}
          onClose={() => setEditingExercise(null)}
          dayId={dayId}
          exercise={editingExercise}
        />
      )}
    </div>
  );
}
