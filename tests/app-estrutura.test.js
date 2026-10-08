const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Regras de organização do js/app.js, vigiadas por teste (como css.test.js faz com o CSS).

const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const linhas = app.split('\n');

// Chamada direta = `confirm(`, `prompt(` ou `alert(` sem ponto nem letra antes (`window.confirm(` e `confirmar(` não contam).
const DIRETA = /(?<![.\w])(confirm|prompt|alert)\(/;

test('toda janela nativa do navegador passa por confirmar(), um ponto só para trocar depois', () => {
  const diretas = linhas.map((l, i) => ({ l: l.trim(), n: i + 1 })).filter(({ l }) => !l.startsWith('//') && DIRETA.test(l));
  assert.deepEqual(diretas.map(({ n, l }) => `linha ${n}: ${l}`), [], 'use confirmar(texto); valores se pedem no painel "Movimentar", nunca por prompt()');
});

test('confirmar() existe e é o único que chama a janela nativa; prompt() não é mais usado (o painel "Movimentar" o substituiu)', () => {
  assert.match(app, /function confirmar\(/);
  assert.equal((app.match(/window\.confirm\(/g) || []).length, 1);
  assert.equal((app.match(/window\.prompt\(/g) || []).length, 0);
});

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Nomes (chaves) de uma tabela de ações do app.js: `const NOME = {` com uma chave por linha, recuo de 4 espaços.
function chavesDa(tabela) {
  const m = new RegExp(`const ${tabela} = \\{([\\s\\S]*?)\\n  \\};`).exec(app);
  assert.ok(m, `falta a tabela ${tabela} no app.js`);
  return [...m[1].matchAll(/^ {4}'?([a-z-]+)'?:/gm)].map((x) => x[1]);
}

test('todo data-action usado na tela tem uma função registrada (ACTIONS ou ADD_ACTIONS), sem esquecer nenhum', () => {
  const usados = new Set([...(app + html).matchAll(/data-action="([a-z-]+)"/g)].map((m) => m[1]));
  const registradas = new Set([...chavesDa('ACTIONS'), ...chavesDa('ADD_ACTIONS'), 'open-review']); // open-review tem ouvinte próprio
  assert.deepEqual([...usados].filter((a) => !registradas.has(a)).sort(), []);
});

test('handleAction consulta a tabela de ações, em vez de um switch com todas as ações', () => {
  assert.doesNotMatch(app, /switch \(action\)/);
  assert.match(app, /ACTIONS\[action\]/);
});
