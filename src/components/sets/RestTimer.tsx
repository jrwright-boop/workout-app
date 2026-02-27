import { useState, useEffect, useRef } from 'react';
import './RestTimer.css';

interface RestTimerProps {
  onDismiss: () => void;
  defaultSeconds?: number;
}

export function RestTimer({ onDismiss, defaultSeconds = 90 }: RestTimerProps) {
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [total, setTotal] = useState(defaultSeconds);
  const hasAlertedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    setRemaining(prev => Math.max(0, prev + delta));
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
