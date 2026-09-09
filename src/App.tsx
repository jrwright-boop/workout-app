import { useEffect, useState } from 'react';
import { WorkoutProvider } from './context/WorkoutContext';
import { AppShell } from './components/layout/AppShell';
import { DayTabBar } from './components/days/DayTabBar';
import { ExerciseList } from './components/exercises/ExerciseList';
import { ActiveSession } from './ActiveSession';
import { WorkoutSummaryModal } from './components/summary/WorkoutSummaryModal';
import { useWorkout } from './hooks/useWorkout';
import { registerServiceWorker } from './swUpdate';
import { decodeProgramHash } from './utils/programLink';
import type { WorkoutSession } from './types';
import './App.css';

function UpdateToast() {
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    registerServiceWorker(apply => setApplyUpdate(() => apply));
  }, []);

  if (!applyUpdate) return null;

  return (
    <div className="update-toast">
      <span>Update available</span>
      <button className="update-toast-btn" onClick={applyUpdate}>
        Reload
      </button>
    </div>
  );
}

function CrashRecovery() {
  const { state, dispatch } = useWorkout();
  const [dismissed, setDismissed] = useState(false);

  // Only show on mount if there's a stale active session (crash recovery)
  const [isStale] = useState(() => !!state.activeSession);

  if (!state.activeSession || dismissed || !isStale) return null;

  return (
    <div className="crash-recovery">
      <p>You have an unfinished workout from earlier.</p>
      <div className="crash-actions">
        <button
          className="btn btn--accent"
          onClick={() => setDismissed(true)}
        >
          Resume
        </button>
        <button
          className="btn btn--danger"
          onClick={() => {
            if (confirm('Discard this workout? All logged data will be lost.')) {
              dispatch({ type: 'DISCARD_SESSION' });
            }
          }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}

/** Picks up a shared program link (#program=...) once on launch. */
function SharedProgramImport() {
  const { dispatch } = useWorkout();
  const [program] = useState(() => decodeProgramHash(window.location.hash));
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (program && window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [program]);

  if (!program || handled) return null;

  return (
    <div className="crash-recovery">
      <p>Someone shared the program <strong>{program.name}</strong> ({program.dayOrder.length} day{program.dayOrder.length === 1 ? '' : 's'}) with you.</p>
      <div className="crash-actions">
        <button
          className="btn btn--accent"
          onClick={() => { dispatch({ type: 'IMPORT_PROGRAM', payload: { program } }); setHandled(true); alert('Saved under Settings → Programs. Tap "Use" there to switch to it.'); }}
        >
          Save program
        </button>
        <button className="btn btn--outline" onClick={() => setHandled(true)}>Ignore</button>
      </div>
    </div>
  );
}

function WorkoutContent() {
  const { state, dispatch } = useWorkout();
  const activeDay = state.activeDayId ? state.days[state.activeDayId] : null;
  const [finishedSession, setFinishedSession] = useState<WorkoutSession | null>(null);

  if (state.activeSession) {
    return <ActiveSession onFinished={setFinishedSession} />;
  }

  return (
    <>
      <WorkoutSummaryModal
        session={finishedSession}
        onClose={() => setFinishedSession(null)}
      />
      <DayTabBar />
      {activeDay ? (
        <div className="day-content">
          <ExerciseList dayId={activeDay.id} />
          {activeDay.exerciseOrder.filter(id => !activeDay.exercises[id].skipped).length > 0 && (
            <div className="start-section">
              <button
                className="btn btn--accent btn--full btn--large start-btn"
                onClick={() => dispatch({ type: 'START_SESSION', payload: { dayId: activeDay.id } })}
              >
                Start Workout
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state-hero">
          <p>No workout days yet</p>
          <p className="empty-hint">Tap + to create your first day</p>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <WorkoutProvider>
      <AppShell>
        <CrashRecovery />
        <SharedProgramImport />
        <WorkoutContent />
      </AppShell>
      <UpdateToast />
    </WorkoutProvider>
  );
}

export default App;
