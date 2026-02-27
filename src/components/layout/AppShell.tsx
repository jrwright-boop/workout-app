import { useState, type ReactNode } from 'react';
import { useWorkout } from '../../hooks/useWorkout';
import { HistoryView } from '../history/HistoryView';
import { SettingsModal } from './SettingsModal';
import './AppShell.css';

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useWorkout();
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const toggleUnit = () => {
    dispatch({ type: 'SET_UNIT', payload: { unit: state.unit === 'lbs' ? 'kg' : 'lbs' } });
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1 className="app-title">Workout</h1>
        <div className="top-bar-actions">
          {state.activeSession && (
            <span className="session-badge">In Progress</span>
          )}
          <button className="unit-toggle" onClick={toggleUnit}>
            {state.unit}
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowHistory(true)}
            title="History"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
      <HistoryView open={showHistory} onClose={() => setShowHistory(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
