let registered = false;

/**
 * Register the service worker and watch for new versions. When an updated
 * worker finishes installing behind a live one, `onUpdate` fires with an
 * `apply` callback: calling it tells the new worker to take over, which
 * triggers `controllerchange` and a one-time reload.
 */
export function registerServiceWorker(onUpdate: (apply: () => void) => void): void {
  if (!('serviceWorker' in navigator) || registered) return;
  registered = true;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .register('./sw.js')
    .then(reg => {
      const notify = (worker: ServiceWorker) => {
        onUpdate(() => worker.postMessage({ type: 'SKIP_WAITING' }));
      };

      // An update may already be sitting in the waiting slot from a
      // previous visit that never reloaded.
      if (reg.waiting && navigator.serviceWorker.controller) {
        notify(reg.waiting);
      }

      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          // "installed" with an existing controller means a new version is
          // ready; without a controller it's just the first-ever install.
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            notify(worker);
          }
        });
      });

      // iOS PWAs stay alive in the background for a long time; check for a
      // new version whenever the app returns to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      });
    })
    .catch(() => {});
}
