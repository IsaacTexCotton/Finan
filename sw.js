/* Service worker do Finan: deixa o app abrir sem internet.
 * Estratégia "rede primeiro": com internet, sempre entrega a versão mais nova (e guarda uma
 * cópia); sem internet, entrega a cópia guardada. Só mexe em arquivos do próprio site: não
 * chama nenhum endereço externo e não guarda dados da pessoa (eles ficam no localStorage). */
const CACHE = 'finan';
const ARQUIVOS = ['./', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'js/core.js', 'js/app.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(pedido).then((guardado) => guardado || caches.match('index.html'))),
  );
});
