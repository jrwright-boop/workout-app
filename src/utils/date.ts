const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse an ISO string. Date-only values ("2026-08-19") are treated as a
 * local calendar date; `new Date("2026-08-19")` would read them as UTC
 * midnight, which displays as the previous day anywhere west of Greenwich.
 */
export function parseISO(iso: string): Date {
  if (DATE_ONLY.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function formatDate(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Local calendar date as YYYY-MM-DD (not UTC, so late-evening workouts stay on today). */
export function toISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "Today", "Yesterday", "3d ago", "2w ago", "3mo ago". */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const then = parseISO(iso);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const days = Math.round((startToday.getTime() - startThen.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** Whole-minute duration between two timestamps: "52m", "1h 05m". */
export function formatDuration(startIso: string, endIso: string): string {
  const mins = Math.max(0, Math.round((parseISO(endIso).getTime() - parseISO(startIso).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
