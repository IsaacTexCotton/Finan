const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Regras de organização do js/app.js, vigiadas por teste (como css.test.js faz com o CSS).

const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const linhas = app.split('\n');

// Chamada direta = `confirm(`, `prompt(` ou `alert(` sem ponto nem letra antes (`window.confirm(` e `confirmar(` não contam).
const DIRETA = /(?<![.\w])(confirm|prompt|alert)\(/;

test('toda janela nativa do navegador passa por confirmar() ou perguntar(), um ponto só para trocar depois', () => {
  const diretas = linhas.map((l, i) => ({ l: l.trim(), n: i + 1 })).filter(({ l }) => !l.startsWith('//') && DIRETA.test(l));
  assert.deepEqual(diretas.map(({ n, l }) => `linha ${n}: ${l}`), [], 'use confirmar(texto) ou perguntar(texto)');
});

test('confirmar() e perguntar() existem e são os únicos que chamam as janelas nativas', () => {
  assert.match(app, /function confirmar\(/);
  assert.match(app, /function perguntar\(/);
  assert.equal((app.match(/window\.confirm\(/g) || []).length, 1);
  assert.equal((app.match(/window\.prompt\(/g) || []).length, 1);
});
