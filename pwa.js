/* Enregistre le service worker (hors ligne). Sans effet en file:// ou si le navigateur ne le gère pas. */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (e) {
      console.warn('Service worker non enregistré :', e && e.message);
    });
  });
}
