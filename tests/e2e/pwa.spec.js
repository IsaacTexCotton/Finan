const { test, expect } = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// O app abre sem internet depois da primeira visita e continua recebendo atualizações quando
// há internet, mesmo quando o servidor manda guardar os arquivos por 10 minutos (como o GitHub
// Pages). Service worker só funciona em http(s), então aqui o app é servido por um
// servidor local pequeno que entrega SÓ o que a publicação entrega.

const RAIZ = path.join(__dirname, '..', '..');
const PUBLICADOS = ['index.html', 'manifest.webmanifest', 'sw.js'];
const PASTAS = ['css', 'js', 'icons'];
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

let servidor;
let origem;
let porta = 0;
let trocas = {};

// Sem internet DE VERDADE: o servidor é desligado. (O setOffline do Playwright não alcança as
// requisições do service worker no Chromium, então um teste só com ele passaria sem provar nada.)
const ligar = () => new Promise((ok) => servidor.listen(porta, '127.0.0.1', () => { porta = servidor.address().port; origem = `http://127.0.0.1:${porta}`; ok(); }));
const desligar = () => new Promise((ok) => { servidor.closeAllConnections(); servidor.close(ok); });

test.beforeAll(async () => {
  servidor = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\//, '');
    if (rel === '') rel = 'index.html';
    const permitido = PUBLICADOS.includes(rel) || PASTAS.some((p) => rel.startsWith(`${p}/`));
    const arquivo = path.join(RAIZ, rel);
    if (!permitido || rel.includes('..') || !fs.existsSync(arquivo)) {
      res.writeHead(404).end('não encontrado');
      return;
    }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(rel)] || 'application/octet-stream', 'cache-control': 'max-age=600' });
    res.end(trocas[rel] !== undefined ? trocas[rel] : fs.readFileSync(arquivo));
  });
  await ligar();
});

test.afterAll(async () => { if (servidor.listening) await desligar(); });
test.beforeEach(async () => {
  trocas = {};
  if (!servidor.listening) await ligar();
});

/** Abre o app e espera o service worker assumir o controle da página. */
async function abrir(page) {
  await page.goto(`${origem}/`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // a partir daqui a página já é controlada pelo service worker
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

test('o app registra o service worker e ele fica ativo', async ({ page }) => {
  await page.goto(`${origem}/`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).active.state)).toBe('activated');
});

test('depois da primeira visita, o app abre sem internet e os dados continuam lá', async ({ page }) => {
  await abrir(page);
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await page.locator('#tx-form').getByLabel('Valor (R$)').fill('42,50');
  await page.locator('#tx-form').getByLabel('Categoria').selectOption('mercado');
  await page.locator('#tx-form').getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('status')).toContainText('lançada');

  await desligar();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await expect(page.locator('#tx-list')).toContainText('R$ 42,50');
});

test('com internet, o app pega a versão nova (não fica preso numa versão antiga)', async ({ page }) => {
  await abrir(page);
  trocas['index.html'] = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace('<title>Finan — controle de gastos</title>', '<title>Finan — versão nova</title>');
  await page.goto(`${origem}/`); // abrir de novo (e não "recarregar", que já ignora o cache do navegador)
  await expect(page).toHaveTitle('Finan — versão nova');
});

test('o app só fala com o próprio endereço: nada de rede externa', async ({ page }) => {
  const externos = [];
  page.on('request', (req) => { if (!req.url().startsWith(origem) && !req.url().startsWith('data:')) externos.push(req.url()); });
  await abrir(page);
  expect(externos).toEqual([]);
});

test('o manifesto e os ícones são entregues e o navegador os aceita', async ({ page }) => {
  await page.goto(`${origem}/`);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const resposta = await page.request.get(new URL(href, `${origem}/`).href);
  expect(resposta.ok()).toBe(true);
  const manifesto = await resposta.json();
  for (const icone of manifesto.icons) {
    const r = await page.request.get(new URL(icone.src, `${origem}/`).href);
    expect(r.ok(), icone.src).toBe(true);
    expect(r.headers()['content-type']).toBe('image/png');
  }
});

test('offline, um arquivo que não está guardado falha de verdade, em vez de receber a página inicial', async ({ page }) => {
  await abrir(page);
  await desligar();
  const resposta = await page.evaluate(() => fetch('js/nao-existe.js').then((r) => `${r.status} ${r.headers.get('content-type')}`, () => 'falhou'));
  expect(resposta).toBe('falhou');
});

test('a cópia para uso offline é a da versão mais nova, não a antiga', async ({ page }) => {
  await abrir(page);
  trocas['index.html'] = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace('<title>Finan — controle de gastos</title>', '<title>Finan — versão guardada</title>');
  await page.goto(`${origem}/`);
  await expect(page).toHaveTitle('Finan — versão guardada');
  await page.waitForTimeout(300); // dá tempo de a cópia ser gravada
  await desligar();
  await page.reload();
  await expect(page).toHaveTitle('Finan — versão guardada');
});
