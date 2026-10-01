const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cssPath = path.join(__dirname, '..', 'css', 'styles.css');
// Comentários são removidos para não serem confundidos com seletores.
const css = fs.readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const FONT_TOKENS = ['fs-small', 'fs-body', 'fs-title', 'fs-number', 'fs-display'];

/** Bloco :root e o resto do CSS, separados. */
const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
const rootBlock = rootMatch ? rootMatch[1] : '';
const outsideRoot = css.replace(/:root\s*\{[^}]*\}/, '');

/** Valores de uma propriedade em todo o CSS fora do :root. */
function valuesOf(propertyPattern) {
  const re = new RegExp(`(?:^|[;{\\s])(${propertyPattern})\\s*:\\s*([^;}]+)`, 'g');
  return [...outsideRoot.matchAll(re)].map(([, property, value]) => ({ property, value: value.trim() }));
}

test('os tamanhos de fonte são tokens no :root', () => {
  for (const name of FONT_TOKENS) assert.match(rootBlock, new RegExp(`--${name}:`), `falta --${name}`);
});

test('toda fonte do app usa um token de tamanho, nunca um número solto', () => {
  const fontSizes = valuesOf('font-size').filter((d) => d.value !== '100%'); // 100% = tamanho do navegador (html)
  assert.ok(fontSizes.length > 20, 'esperava achar as declarações de font-size');
  const loose = fontSizes.filter((d) => !/^var\(--fs-[a-z]+\)$/.test(d.value));
  assert.deepEqual(loose, [], 'font-size fora dos tokens');
});

test('só existem os tokens de fonte definidos', () => {
  const used = new Set([...outsideRoot.matchAll(/var\(--(fs-[a-z]+)\)/g)].map((m) => m[1]));
  for (const name of used) assert.ok(FONT_TOKENS.includes(name), `--${name} não existe na escala`);
});

const SPACE_TOKENS = { 'space-1': '0.25rem', 'space-2': '0.5rem', 'space-3': '0.75rem', 'space-4': '1rem', 'space-5': '1.5rem' };

test('a escala de espaçamento (4, 8, 12, 16 e 24 px) é definida no :root', () => {
  for (const [name, value] of Object.entries(SPACE_TOKENS)) {
    assert.match(rootBlock, new RegExp(`--${name}:\\s*${value.replace('.', '\\.')}\\s*;`), `falta --${name}: ${value}`);
  }
});

test('margens, preenchimentos e vãos usam só a escala (ou 0, auto e traços de 1px)', () => {
  const spacing = valuesOf('(?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?');
  assert.ok(spacing.length > 60, 'esperava achar as declarações de espaçamento');
  const allowed = /^(?:0|auto|-?1px|var\(--space-[1-5]\)|var\(--nav-h\))$/; // --nav-h: altura da barra de baixo
  const loose = spacing
    .map((d) => ({ ...d, parts: d.value.replace(/calc\((.*)\)/, '$1').split(/\s+/) }))
    .filter((d) => d.parts.some((p) => !allowed.test(p) && !/^[*+]$|^\d+$/.test(p)));
  assert.deepEqual(loose.map((d) => `${d.property}: ${d.value}`), [], 'espaçamento fora da escala');
});

test('a mensagem de confirmação (.toast) posiciona-se só pelos tokens de espaçamento', () => {
  const regra = css.match(/\.toast\s*\{([^}]*)\}/);
  assert.ok(regra, 'esperava achar a regra .toast');
  const posicoes = [...regra[1].matchAll(/(?:^|[;\s])(right|bottom|left|top):\s*([^;]+)/g)].map((m) => `${m[1]}: ${m[2].trim()}`);
  assert.ok(posicoes.length >= 3, 'esperava right, bottom e left');
  const soltos = posicoes.filter((v) => /(?<![\w-])\d*\.?\d+rem/.test(v.replace(/var\([^)]*\)/g, '')));
  assert.deepEqual(soltos, [], '.toast com rem solto');
});
