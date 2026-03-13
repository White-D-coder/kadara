// Placeholder for Rapier physics worker
// Real implementation would use Comlink or raw postMessage to run @dimforge/rapier3d-compat

self.onmessage = function(e) {
  const { type, payload } = e.data
  
  if (type === 'INIT') {
    console.log('[PhysicsWorker] Initialized off main thread')
    self.postMessage({ type: 'INIT_DONE' })
  }
}

export {}
