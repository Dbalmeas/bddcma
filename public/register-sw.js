// Enregistrer le service worker pour PWA
(function() {
  'use strict';
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker
        .register('/sw.js')
        .then(function(registration) {
          console.log('✅ Service Worker enregistré avec succès:', registration.scope);
          
          // Vérifier les mises à jour périodiquement
          setInterval(function() {
            registration.update();
          }, 60000); // Toutes les minutes
        })
        .catch(function(error) {
          console.error('❌ Échec de l\'enregistrement du Service Worker:', error);
        });
    });
  }
})();

