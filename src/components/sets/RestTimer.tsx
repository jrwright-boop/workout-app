import { useState, useEffect, useRef } from 'react';
import './RestTimer.css';

interface RestTimerProps {
  onDismiss: () => void;
  defaultSeconds?: number;
}

export function RestTimer({ onDismiss, defaultSeconds = 90 }: RestTimerProps) {
  // Count down against a wall-clock deadline instead of interval ticks, so
  // the timer stays correct after the phone is locked or the tab suspended.
  const endRef = useRef(0);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [total, setTotal] = useState(defaultSeconds);
  const hasAlertedRef = useRef(false);

  useEffect(() => {
    endRef.current = Date.now() + defaultSeconds * 1000;
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
      // Beep via Web Audio API
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch {
        // Audio not available
      }
    }
  }, [remaining]);

  const adjust = (delta: number) => {
    endRef.current = Math.max(Date.now(), endRef.current + delta * 1000);
    setRemaining(Math.max(0, Math.round((endRef.current - Date.now()) / 1000)));
    setTotal(prev => Math.max(0, prev + delta));
    if (hasAlertedRef.current && delta > 0) {
      hasAlertedRef.current = false;
    }
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
          <button className="rest-timer-btn" onClick={() => adjust(-15)}>-15s</button>
          <button className="rest-timer-btn" onClick={() => adjust(15)}>+15s</button>
        </div>
        <button className="rest-timer-dismiss" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
