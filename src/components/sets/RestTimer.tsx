import { useState, useEffect, useRef, useId } from 'react';
import { playBeep } from '../../utils/audio';
import { cancelRestNotification, scheduleRestNotification, showRestNotification } from '../../utils/notifications';
import './RestTimer.css';

interface RestTimerProps {
  onDismiss: () => void;
  defaultSeconds?: number;
  /** Ask the service worker to notify at the deadline (Settings toggle). */
  notify?: boolean;
}

export function RestTimer({ onDismiss, defaultSeconds = 90, notify = false }: RestTimerProps) {
  // Count down against a wall-clock deadline instead of interval ticks, so
  // the timer stays correct after the phone is locked or the tab suspended.
  const endRef = useRef(0);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [total, setTotal] = useState(defaultSeconds);
  const hasAlertedRef = useRef(false);
  const notifyIdRef = useRef(`rest-${useId()}`);

  // Keep the worker's scheduled notification in step with the deadline.
  const syncNotification = () => {
    if (!notify) return;
    scheduleRestNotification(notifyIdRef.current, endRef.current);
  };

  useEffect(() => {
    endRef.current = Date.now() + defaultSeconds * 1000;
    if (notify) scheduleRestNotification(notifyIdRef.current, endRef.current);
    const id = notifyIdRef.current;
    return () => { if (notify) cancelRestNotification(id); };
  }, [defaultSeconds, notify]);

  useEffect(() => {
    const tick = () => {
      setRemaining(Math.max(0, Math.round((endRef.current - Date.now()) / 1000)));
    };
    const interval = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [defaultSeconds]);

  useEffect(() => {
    if (remaining === 0 && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      // Vibrate
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      playBeep();
      if (notify) {
        // The page is alive, so it owns the notification: cancel the
        // worker's copy and show one only if the app isn't on screen.
        cancelRestNotification(notifyIdRef.current);
        if (document.visibilityState !== 'visible') showRestNotification();
      }
    }
  }, [remaining, notify]);

  const adjust = (delta: number) => {
    endRef.current = Math.max(Date.now(), endRef.current + delta * 1000);
    setRemaining(Math.max(0, Math.round((endRef.current - Date.now()) / 1000)));
    setTotal(prev => Math.max(0, prev + delta));
    if (hasAlertedRef.current && delta > 0) {
      hasAlertedRef.current = false;
    }
    syncNotification();
  };

  const progress = total > 0 ? remaining / total : 0;
  const circumference = 2 * Math.PI * 20;
  const offset = circumference * (1 - progress);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className={`rest-timer ${remaining === 0 ? 'rest-timer--done' : ''}`} onClick={onDismiss}>
      <div className="rest-timer-inner" onClick={e => e.stopPropagation()}>
        <div className="rest-timer-ring">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="20" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="26" cy="26" r="20"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 26 26)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="rest-timer-time">
            {minutes}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
        <span className="rest-timer-label">Rest</span>
        <div className="rest-timer-buttons">
          <button className="rest-timer-btn" onClick={() => adjust(-15)} aria-label="Subtract 15 seconds">-15s</button>
          <button className="rest-timer-btn" onClick={() => adjust(15)} aria-label="Add 15 seconds">+15s</button>
        </div>
        <button className="rest-timer-dismiss" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
