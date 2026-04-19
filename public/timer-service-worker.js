/**
 * Service Worker for background timer functionality
 * Runs timer even when app is in background
 */

let activeTimer = null;
let timerInterval = null;

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  if (type === 'START_BACKGROUND_TIMER') {
    console.log('Service Worker: Starting background timer', data);
    activeTimer = {
      sessionId: data.sessionId,
      entityId: data.entityId,
      elapsedSeconds: data.elapsedSeconds || 0,
      startTime: Date.now(),
    };
    
    // Start local timer increment
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (activeTimer) {
        activeTimer.elapsedSeconds += 1;
        // Notify all clients about the update
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'TIMER_UPDATE',
              data: { elapsedSeconds: activeTimer.elapsedSeconds }
            });
          });
        });
      }
    }, 1000);
  } 
  else if (type === 'STOP_BACKGROUND_TIMER') {
    console.log('Service Worker: Stopping background timer');
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    activeTimer = null;
  }
  else if (type === 'GET_TIMER_STATUS') {
    event.ports[0].postMessage({
      type: 'TIMER_STATUS',
      data: activeTimer
    });
  }
});

// Periodic sync for syncing timer with backend (every 30 seconds)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-timer' && activeTimer) {
    event.waitUntil(
      fetch('/api/time-tracking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeTimer.sessionId,
          elapsedSeconds: activeTimer.elapsedSeconds
        })
      }).catch(err => console.error('Background sync failed:', err))
    );
  }
});

// Handle app termination
self.addEventListener('unload', () => {
  if (timerInterval) clearInterval(timerInterval);
});
