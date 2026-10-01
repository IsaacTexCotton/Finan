const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// O Finan é instalável (PWA) e abre sem internet. Estes testes guardam os arquivos que isso exige.

const raiz = path.join(__dirname, '..');
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8');
const existe = (arquivo) => fs.existsSync(path.join(raiz, arquivo));

function manifesto() {
  assert.ok(existe('manifest.webmanifest'), 'falta o manifest.webmanifest');
  return JSON.parse(ler('manifest.webmanifest'));
}

/** Largura e altura de um PNG (cabeçalho IHDR). */
function tamanhoPng(arquivo) {
  const b = fs.readFileSync(path.join(raiz, arquivo));
  assert.equal(b.subarray(1, 4).toString(), 'PNG', `${arquivo} não é PNG`);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

test('o manifesto descreve um app que abre em tela cheia, em português', () => {
  const m = manifesto();
  assert.equal(m.name, 'Finan');
  assert.ok(m.short_name && m.short_name.length <= 12, 'short_name curto, para caber sob o ícone');
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.equal(m.display, 'standalone');
  assert.equal(m.lang, 'pt-BR');
  assert.match(m.background_color, /^#[0-9a-f]{6}$/i);
});

test('a cor do tema do manifesto é a mesma da página', () => {
  const m = manifesto();
  const meta = ler('index.html').match(/<meta name="theme-color" content="(#[0-9a-fA-F]{6})"/);
  assert.ok(meta, 'index.html sem theme-color');
  assert.equal(m.theme_color.toLowerCase(), meta[1].toLowerCase());
});

test('os ícones do manifesto existem, são PNG e têm o tamanho declarado', () => {
  const m = manifesto();
  const tem = (tamanho, proposito) => m.icons.some((i) => i.sizes === tamanho && (i.purpose || 'any') === proposito);
  assert.ok(tem('192x192', 'any'), 'falta o ícone 192x192');
  assert.ok(tem('512x512', 'any'), 'falta o ícone 512x512');
  assert.ok(tem('512x512', 'maskable'), 'falta o ícone 512x512 "maskable" (Android recorta em círculo)');
  for (const icone of m.icons) {
    assert.ok(existe(path.join(icone.src)), `${icone.src} não existe`);
    assert.equal(tamanhoPng(icone.src), icone.sizes, `${icone.src}: tamanho diferente do declarado`);
  }
});

test('a página liga o manifesto e o ícone do iPhone, que tem 180x180', () => {
  const html = ler('index.html');
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  const iphone = html.match(/<link rel="apple-touch-icon" href="([^"]+)">/);
  assert.ok(iphone, 'falta o apple-touch-icon');
  assert.equal(tamanhoPng(iphone[1]), '180x180');
});

test('o service worker existe, só guarda arquivos do próprio app e não chama endereços externos', () => {
  assert.ok(existe('sw.js'), 'falta o sw.js');
  const sw = ler('sw.js');
  assert.ok(!/https?:\/\//.test(sw), 'sw.js não deve citar endereços externos');
  assert.match(sw, /origin !== self\.location\.origin/, 'sw.js deve ignorar o que não é do próprio site');
});

test('a publicação copia o manifesto, o service worker e os ícones', () => {
  const fluxo = ler('.github/workflows/publicar.yml');
  const cp = fluxo.match(/cp -r ([^\n]+) _site\//);
  assert.ok(cp, 'não achei o cp da publicação');
  for (const item of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons']) {
    assert.ok(cp[1].split(/\s+/).includes(item), `publicar.yml não copia ${item}`);
  }
});

test('o app só registra o service worker em http(s), nunca ao abrir o arquivo direto', () => {
  const app = ler('js/app.js');
  assert.match(app, /serviceWorker\.register\('sw\.js'\)/);
  assert.match(app, /\^https\?:\$/, 'o registro precisa conferir que o endereço é http(s)');
});

test('todo arquivo da lista do service worker existe, e nenhum css/js do app fica de fora dela', () => {
  const lista = ler('sw.js').match(/const ARQUIVOS = \[([^\]]*)\]/);
  assert.ok(lista, 'não achei a lista ARQUIVOS no sw.js');
  const arquivos = [...lista[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const arquivo of arquivos.filter((a) => a !== './')) assert.ok(existe(arquivo), `sw.js lista ${arquivo}, que não existe (a instalação inteira falharia)`);
  for (const pasta of ['css', 'js']) {
    for (const nome of fs.readdirSync(path.join(raiz, pasta))) {
      assert.ok(arquivos.includes(`${pasta}/${nome}`), `${pasta}/${nome} não está na lista do sw.js: não abriria offline na primeira visita`);
    }
  }
});

test('o service worker não responde com a página a pedidos que não são de página', () => {
  assert.match(ler('sw.js'), /\.mode === 'navigate'/, 'o retorno a index.html só vale para navegação');
});
