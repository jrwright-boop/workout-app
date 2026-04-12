import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { useWorkout } from '../../hooks/useWorkout';
import type { ExerciseId } from '../../types';
import './AddSessionExerciseForm.css';

interface AddSessionExerciseFormProps {
  open: boolean;
  onClose: () => void;
}

interface KnownExercise {
  exerciseId: ExerciseId;
  name: string;
  defaultSetCount: number;
  dayName: string;
  lastDate: string | null;
}

export function AddSessionExerciseForm({ open, onClose }: AddSessionExerciseFormProps) {
  const { state, dispatch } = useWorkout();
  const [mode, setMode] = useState<'pick' | 'create'>('pick');
  const [newName, setNewName] = useState('');
  const [newSetCount, setNewSetCount] = useState(3);
  const [search, setSearch] = useState('');

  const session = state.activeSession;

  const knownExercises = useMemo<KnownExercise[]>(() => {
    if (!session) return [];
    const currentIds = new Set(session.exercises.map(e => e.exerciseId));
    const byId = new Map<ExerciseId, KnownExercise>();

    // Collect from all day templates
    for (const dayId of state.dayOrder) {
      const day = state.days[dayId];
      for (const exId of day.exerciseOrder) {
        const ex = day.exercises[exId];
        if (currentIds.has(ex.id)) continue;
        if (!byId.has(ex.id)) {
          byId.set(ex.id, {
            exerciseId: ex.id,
            name: ex.name,
            defaultSetCount: ex.defaultSetCount,
            dayName: day.name,
            lastDate: null,
          });
        }
      }
    }

    // Annotate with last performed date from history
    for (const entry of byId.values()) {
      for (const past of state.history) {
        if (past.exercises.some(e => e.exerciseId === entry.exerciseId)) {
          entry.lastDate = past.date;
          break;
        }
      }
    }

    const list = Array.from(byId.values());
    list.sort((a, b) => {
      // Exercises performed more recently first, then alphabetical
      if (a.lastDate && b.lastDate) return b.lastDate.localeCompare(a.lastDate);
      if (a.lastDate) return -1;
      if (b.lastDate) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [session, state.days, state.dayOrder, state.history]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return knownExercises;
    return knownExercises.filter(e => e.name.toLowerCase().includes(q));
  }, [knownExercises, search]);

  const handleClose = () => {
    setMode('pick');
    setNewName('');
    setNewSetCount(3);
    setSearch('');
    onClose();
  };

  const handlePick = (ex: KnownExercise) => {
    dispatch({
      type: 'ADD_SESSION_EXERCISE',
      payload: {
        exerciseId: ex.exerciseId,
        name: ex.name,
        defaultSetCount: ex.defaultSetCount,
      },
    });
    handleClose();
  };

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    dispatch({
      type: 'ADD_SESSION_EXERCISE',
      payload: {
        exerciseId: null,
        name: trimmed,
        defaultSetCount: newSetCount,
      },
    });
    handleClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Exercise">
      <div className="add-session-exercise">
        <div className="add-session-tabs">
          <button
            className={`add-session-tab ${mode === 'pick' ? 'add-session-tab--active' : ''}`}
            onClick={() => setMode('pick')}
          >
            From list
          </button>
          <button
            className={`add-session-tab ${mode === 'create' ? 'add-session-tab--active' : ''}`}
            onClick={() => setMode('create')}
          >
            New
          </button>
        </div>

        {mode === 'pick' ? (
          <>
            <input
              type="text"
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises..."
              autoFocus
            />
            <div className="add-session-list">
              {filtered.length === 0 ? (
                <p className="add-session-empty">
                  {knownExercises.length === 0
                    ? 'No other exercises available. Use "New" to create one.'
                    : 'No matches.'}
                </p>
              ) : (
                filtered.map(ex => (
                  <button
                    key={ex.exerciseId}
                    className="add-session-item"
                    onClick={() => handlePick(ex)}
                  >
                    <span className="add-session-item-name">{ex.name}</span>
                    <span className="add-session-item-meta">
                      {ex.dayName}
                      {ex.lastDate ? ' · has history' : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <label className="form-label">
              Name
              <input
                type="text"
                className="form-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Cable Fly"
                autoFocus
              />
            </label>
            <label className="form-label">
              Sets
              <div className="stepper">
                <button className="stepper-btn" onClick={() => setNewSetCount(Math.max(1, newSetCount - 1))}>-</button>
                <span className="stepper-value">{newSetCount}</span>
                <button className="stepper-btn" onClick={() => setNewSetCount(newSetCount + 1)}>+</button>
              </div>
            </label>
            <button
              className="btn btn--accent btn--full"
              onClick={handleCreate}
              disabled={!newName.trim()}
            >
              Add Exercise
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
