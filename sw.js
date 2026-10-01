/* Service worker do Finan: deixa o app abrir sem internet.
 * Estratégia "rede primeiro": com internet, sempre entrega a versão mais nova (e guarda uma
 * cópia); sem internet, entrega a cópia guardada. Só mexe em arquivos do próprio site: não
 * chama nenhum endereço externo e não guarda dados da pessoa (eles ficam no localStorage). */
const CACHE = 'finan';
const ARQUIVOS = ['./', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'js/core.js', 'js/app.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (evento) => {
  // "reload": ignora o cache do navegador (o GitHub Pages manda guardar os arquivos por 10 minutos)
  const pedidos = ARQUIVOS.map((arquivo) => new Request(arquivo, { cache: 'reload' }));
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(pedidos)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(
    // "no-cache": confere com o servidor antes de usar qualquer cópia do cache do navegador
    fetch(pedido, { cache: 'no-cache' })
      .then((resposta) => {
        if (resposta.ok && resposta.status === 200) {
          const copia = resposta.clone();
          evento.waitUntil(caches.open(CACHE).then((cache) => cache.put(pedido, copia)).catch(() => { /* sem cópia offline desta vez */ }));
        }
        return resposta;
      })
      .catch(() => caches.match(pedido).then((guardado) => guardado || (pedido.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
