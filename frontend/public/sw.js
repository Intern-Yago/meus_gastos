self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Desativar interceptação de fetch temporariamente para depurar problemas de autenticação
/*
self.addEventListener('fetch', (event) => {
  // ...
});
*/
