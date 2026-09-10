/**
 * Rest-timer notifications. Two layers:
 *  - the page shows one itself when the timer ends while the app is hidden;
 *  - the service worker is asked to schedule one at the deadline, so it can
 *    still fire if the page has been suspended (Android; iOS suspends the
 *    worker too when the phone is locked, so there it only helps while the
 *    app is backgrounded but alive).
 */
export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function notificationsGranted(): boolean {
  return notificationsSupported() && Notification.permission === 'granted';
}

async function worker(): Promise<ServiceWorker | null> {
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg.active;
  } catch {
    return null;
  }
}

export async function scheduleRestNotification(id: string, at: number): Promise<void> {
  if (!notificationsGranted()) return;
  const w = await worker();
  w?.postMessage({ type: 'SCHEDULE_REST_END', id, at });
}

export async function cancelRestNotification(id: string): Promise<void> {
  if (!notificationsSupported()) return;
  const w = await worker();
  w?.postMessage({ type: 'CANCEL_REST_END', id });
}

/** Fire immediately from the page (used when the timer ends while hidden). */
export async function showRestNotification(): Promise<void> {
  if (!notificationsGranted()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Rest over', { body: 'Time for the next set.', tag: 'rest-timer' });
  } catch {
    // ignore
  }
}
