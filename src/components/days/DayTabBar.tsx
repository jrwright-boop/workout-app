import { useState } from 'react';
import { useWorkout } from '../../hooks/useWorkout';
import { DayTab } from './DayTab';
import { DayManager } from './DayManager';
import './DayTabBar.css';

export function DayTabBar() {
  const { state, dispatch } = useWorkout();
  const [showManager, setShowManager] = useState(false);

  return (
    <>
      <div className="day-tab-bar">
        <div className="day-tabs-scroll">
          {state.dayOrder.map(dayId => {
            const day = state.days[dayId];
            return (
              <DayTab
                key={dayId}
                name={day.name}
                active={dayId === state.activeDayId}
                onClick={() => dispatch({ type: 'SET_ACTIVE_DAY', payload: { dayId } })}
              />
            );
          })}
          <button className="add-day-btn" onClick={() => setShowManager(true)}>
            +
          </button>
        </div>
        {state.dayOrder.length > 0 && (
          <button
            className="manage-days-btn"
            onClick={() => setShowManager(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        )}
      </div>
      <DayManager open={showManager} onClose={() => setShowManager(false)} />
    </>
  );
}
