// Enregistrer le service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré avec succès:', registration.scope)
        
        // Vérifier les mises à jour périodiquement
        setInterval(() => {
          registration.update()
        }, 60000) // Toutes les minutes
      })
      .catch((error) => {
        console.error('❌ Échec de l\'enregistrement du Service Worker:', error)
      })
  })
}


