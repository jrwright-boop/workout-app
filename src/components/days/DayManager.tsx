import { useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkout } from '../../hooks/useWorkout';
import { Modal } from '../common/Modal';
import type { DayId } from '../../types';
import './DayManager.css';

interface DayManagerProps {
  open: boolean;
  onClose: () => void;
}

function SortableDayItem({ dayId, name, onRename, onDelete }: {
  dayId: DayId;
  name: string;
  onRename: (id: DayId) => void;
  onDelete: (id: DayId) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dayId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="day-manager-item">
      <button className="drag-handle" {...attributes} {...listeners}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="2" /><circle cx="15" cy="6" r="2" />
          <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
          <circle cx="9" cy="18" r="2" /><circle cx="15" cy="18" r="2" />
        </svg>
      </button>
      <span className="day-manager-name">{name}</span>
      <button className="day-action-btn" onClick={() => onRename(dayId)}>Rename</button>
      <button className="day-action-btn day-action-btn--danger" onClick={() => onDelete(dayId)}>Delete</button>
    </div>
  );
}

export function DayManager({ open, onClose }: DayManagerProps) {
  const { state, dispatch } = useWorkout();
  const [newDayName, setNewDayName] = useState('');

  const handleAdd = () => {
    const name = newDayName.trim();
    if (!name) return;
    dispatch({ type: 'ADD_DAY', payload: { name } });
    setNewDayName('');
  };

  const handleRename = (dayId: DayId) => {
    const day = state.days[dayId];
    const name = prompt('Rename day:', day.name);
    if (name && name.trim()) {
      dispatch({ type: 'RENAME_DAY', payload: { dayId, name: name.trim() } });
    }
  };

  const handleDelete = (dayId: DayId) => {
    const day = state.days[dayId];
    if (confirm(`Delete "${day.name}" and all its exercises?`)) {
      dispatch({ type: 'DELETE_DAY', payload: { dayId } });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = state.dayOrder.indexOf(active.id as string);
    const newIndex = state.dayOrder.indexOf(over.id as string);
    const newOrder = [...state.dayOrder];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, active.id as string);
    dispatch({ type: 'REORDER_DAYS', payload: { dayOrder: newOrder } });
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage Days">
      <div className="day-manager-add">
        <input
          type="text"
          placeholder="New day name (e.g. Push, Pull, Legs)"
          value={newDayName}
          onChange={e => setNewDayName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="day-name-input"
        />
        <button className="btn btn--accent" onClick={handleAdd} disabled={!newDayName.trim()}>
          Add
        </button>
      </div>

      {state.dayOrder.length > 0 && (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={state.dayOrder} strategy={verticalListSortingStrategy}>
            <div className="day-manager-list">
              {state.dayOrder.map(dayId => (
                <SortableDayItem
                  key={dayId}
                  dayId={dayId}
                  name={state.days[dayId].name}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </Modal>
  );
}
