const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cssPath = path.join(__dirname, '..', 'css', 'styles.css');
// Comentários são removidos para não serem confundidos com seletores.
const css = (fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '').replace(/\/\*[\s\S]*?\*\//g, '');

/** Cores definidas como variáveis (--nome: #rrggbb) no bloco :root. */
function tokens() {
  const root = css.match(/:root\s*\{([^}]*)\}/);
  const map = {};
  if (root) for (const [, name, value] of root[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) map[name] = value.toLowerCase();
  return map;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Regras CSS simples (seletor { corpo }), inclusive as de dentro de @media. */
function rules() {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
}

function hasRule(selector, bodyPart) {
  return rules().some((r) => r.selector.split(',').map((s) => s.trim()).includes(selector) && r.body.includes(bodyPart));
}

test('o arquivo css/styles.css existe e define as cores como variáveis', () => {
  assert.ok(css.length > 0, 'css/styles.css não existe');
  assert.ok(Object.keys(tokens()).length >= 20, 'esperava as cores como variáveis no :root');
});

// [texto, fundo, contraste mínimo]: 4.5 para texto (WCAG AA), 3 para bordas, foco e barras.
const PARES = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5],
  ['muted', 'bg', 4.5], ['muted', 'surface', 4.5],
  ['on-primary', 'primary', 4.5], ['on-primary', 'primary-strong', 4.5],
  ['primary', 'surface', 4.5], ['primary', 'bg', 4.5],
  ['primary-strong', 'primary-soft', 4.5],
  ['ok-fg', 'ok-bg', 4.5], ['warn-fg', 'warn-bg', 4.5], ['danger-fg', 'danger-bg', 4.5], ['info-fg', 'info-bg', 4.5],
  ['ok-fg', 'surface', 4.5], ['danger-fg', 'surface', 4.5],
  ['border-strong', 'surface', 3], ['border-strong', 'bg', 3],
  ['focus', 'surface', 3], ['focus', 'bg', 3],
  ['ok-fill', 'track', 3], ['warn-fill', 'track', 3], ['danger-fill', 'track', 3], ['primary', 'track', 3], ['info-fg', 'track', 3],
];

for (const [fg, bg, min] of PARES) {
  test(`contraste de ${fg} sobre ${bg} é pelo menos ${min}:1`, () => {
    const t = tokens();
    assert.ok(t[fg] && t[bg], `faltam as variáveis --${fg} e/ou --${bg}`);
    const ratio = contrast(t[fg], t[bg]);
    assert.ok(ratio >= min, `${t[fg]} sobre ${t[bg]} = ${ratio.toFixed(2)}:1 (mínimo ${min}:1)`);
  });
}

test('alvos de toque têm pelo menos 44px (2,75rem)', () => {
  const tap = css.match(/--tap:\s*([\d.]+)rem/);
  assert.ok(tap && Number(tap[1]) >= 2.75, '--tap deve ser pelo menos 2.75rem');
  for (const sel of ['.btn', '.icon-btn', 'input', 'select']) {
    assert.ok(hasRule(sel, 'min-height: var(--tap)'), `${sel} deve usar min-height: var(--tap)`);
  }
});

test('campos usam fonte de pelo menos 16px, para o celular não dar zoom ao digitar', () => {
  assert.ok(hasRule('input', 'font-size: 1rem') || hasRule('input', 'font: inherit'), 'input deve ter font-size: 1rem ou herdar a fonte');
  assert.ok(/html\s*\{[^}]*font-size:\s*(100|1[0-9]{2})%/.test(css), 'html deve respeitar o tamanho de fonte do usuário (font-size em %)');
});

test('o foco do teclado é visível e nunca fica escondido', () => {
  assert.ok(rules().some((r) => r.selector.includes(':focus-visible') && /outline:\s*\d/.test(r.body)), 'falta a regra :focus-visible com outline');
  assert.ok(!/outline:\s*(none|0)\s*[;}]/.test(css), 'não remova o outline do foco');
});

test('respeita quem pede menos movimento e o atributo hidden', () => {
  assert.ok(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css), 'falta @media (prefers-reduced-motion: reduce)');
  assert.ok(hasRule('[hidden]', 'display: none'), 'falta [hidden] { display: none } (o app usa o atributo hidden)');
});

test('a página carrega o css/styles.css', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('href="css/styles.css"'));
});

// ---------- Tela Lançamentos: fácil de usar com o polegar ----------

/** Junta o corpo de todas as regras cujo seletor é exatamente o informado. */
function bodyOf(selector) {
  return rules().filter((r) => r.selector.split(',').map((s) => s.trim()).includes(selector)).map((r) => r.body).join('\n');
}

function remOf(body, prop) {
  const m = body.match(new RegExp(`(?:^|[;\\s])${prop}:\\s*([\\d.]+)rem`));
  return m ? Number(m[1]) : 0;
}

test('o botão Salvar ocupa a largura toda e é mais alto que o mínimo de toque', () => {
  const body = bodyOf('#tx-submit');
  assert.ok(body.includes('width: 100%'), '#tx-submit deve ter width: 100%');
  assert.ok(remOf(body, 'min-height') >= 3, '#tx-submit deve ter min-height de pelo menos 3rem');
});

test('o campo de valor aparece em destaque, com fonte grande', () => {
  const body = bodyOf('input[name="amount"]');
  assert.ok(remOf(body, 'font-size') >= 1.5, 'o campo de valor deve ter font-size de pelo menos 1.5rem');
});

test('cada lançamento da lista mantém os botões de editar e excluir com alvo de toque', () => {
  assert.ok(bodyOf('.tx').includes('display: grid'), '.tx deve ser um grid (descrição, valor e botões sem apertar)');
  assert.ok(bodyOf('.tx-actions').includes('display: flex'), '.tx-actions deve agrupar os botões');
  assert.ok(hasRule('.icon-btn', 'min-width: var(--tap)'), '.icon-btn deve ter min-width: var(--tap)');
});

test('os dias da lista têm título próprio e a lista não mostra marcadores', () => {
  assert.ok(bodyOf('.day').length > 0, 'falta o estilo do título de cada dia (.day)');
  assert.ok(bodyOf('.tx-list').includes('list-style: none'), '.tx-list deve tirar os marcadores da lista');
});
