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
