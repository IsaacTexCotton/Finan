const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Identidade visual (decisão do Isaac, 09/10/2026): símbolo "F com moeda". Fonte: docs/ux-estrategia.md.

const ler = (arquivo) => fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8');
const css = ler('css/styles.css');
const cor = (nome) => (css.match(new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})`)) || [])[1];

test('a cor de conquista (a moeda do logo) existe como variável e é #5fd39a', () => {
  assert.equal((cor('conquista') || '').toLowerCase(), '#5fd39a');
});

test('a barra do navegador (theme-color) tem a mesma cor do topo do app (--primary-strong), no site e no manifesto', () => {
  const topo = cor('primary-strong').toLowerCase();
  const meta = ler('index.html').match(/<meta name="theme-color" content="(#[0-9a-fA-F]{6})"/)[1].toLowerCase();
  const manifesto = JSON.parse(ler('manifest.webmanifest')).theme_color.toLowerCase();
  assert.equal(meta, topo);
  assert.equal(manifesto, topo);
});

test('o ícone do app (icon.svg) é o F com moeda: fundo da marca, F branco e moeda de conquista, sem a letra antiga', () => {
  const svg = ler('icons/icon.svg').toLowerCase();
  assert.match(svg, /#084c45/);
  assert.match(svg, /#ffffff/);
  assert.match(svg, /#5fd39a/);
  assert.match(svg, /<circle/); // a moeda
});

test('o título do topo usa a marca desenhada e não o emoji 💰', () => {
  const html = ler('index.html');
  assert.ok(!html.includes('💰'));
  assert.match(html, /<h1 class="brand">[\s\S]*<svg[^>]*class="marca"[^>]*aria-hidden="true"/);
  assert.match(html, /<span class="brand-nome">Finan<\/span>/);
});
