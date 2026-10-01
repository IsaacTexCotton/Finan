const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// A revisão de segurança automática (Action da Anthropic) roda em pull requests. Estas travas
// existem porque a própria Action avisa que NÃO é protegida contra instruções maliciosas
// escondidas no código: só pode olhar PRs de confiança, e a chave nunca pode chegar a PR de fora.

const arquivo = path.join(__dirname, '..', '.github', 'workflows', 'seguranca-pr.yml');
const fluxo = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '';
const semComentarios = fluxo.replace(/^\s*#.*$/gm, '');

test('o fluxo da revisão de segurança existe', () => {
  assert.ok(fluxo.length > 0, '.github/workflows/seguranca-pr.yml não existe');
});

test('roda só em pull_request, nunca em pull_request_target (que dá a chave a PR de fora)', () => {
  assert.match(semComentarios, /^on:\s*\n\s+pull_request:/m);
  assert.ok(!/pull_request_target/.test(semComentarios), 'pull_request_target não pode aparecer');
  assert.ok(!/workflow_run|issue_comment/.test(semComentarios), 'sem gatilhos que rodam código de terceiros com a chave');
});

test('as permissões são as mínimas: ler o código e comentar no PR', () => {
  const bloco = semComentarios.match(/^permissions:\s*\n((?:\s+[\w-]+:\s*\S+\s*\n)+)/m);
  assert.ok(bloco, 'falta o bloco permissions no topo do arquivo');
  const permissoes = Object.fromEntries([...bloco[1].matchAll(/([\w-]+):\s*(\S+)/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(permissoes, { contents: 'read', 'pull-requests': 'write' });
});

test('só revisa PRs de dentro do repositório e que não são do Dependabot', () => {
  assert.match(semComentarios, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(semComentarios, /github\.actor != 'dependabot\[bot\]'/);
});

test('a Action está fixada por código exato (40 caracteres), não por um nome que muda', () => {
  const usos = [...semComentarios.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.ok(usos.length >= 2, 'esperava o checkout e a Action');
  for (const uso of usos) assert.match(uso, /@[0-9a-f]{40}$/, `${uso} precisa estar fixada por SHA completo`);
  assert.ok(usos.some((u) => u.startsWith('anthropics/claude-code-security-review@')), 'falta a Action da Anthropic');
});

test('a chave só é usada nesta Action e vem de um segredo, nunca escrita no arquivo', () => {
  const chaves = semComentarios.match(/secrets\.[A-Z_]+/g) || [];
  assert.ok(chaves.length >= 1);
  for (const chave of chaves) assert.equal(chave, 'secrets.CLAUDE_API_KEY', `segredo inesperado: ${chave}`);
  assert.ok(!/sk-ant-/.test(fluxo), 'não pode haver chave escrita no arquivo');
});

test('se a chave não estiver cadastrada, o fluxo falha com aviso claro (nunca "passa" sem revisar)', () => {
  assert.match(semComentarios, /exit 1/);
  assert.match(semComentarios, /::error::/);
});

test('o checkout usa o commit do próprio PR, com histórico mínimo, e há limite de tempo e de execuções', () => {
  assert.match(semComentarios, /ref:\s*\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(semComentarios, /fetch-depth:\s*2/);
  assert.match(semComentarios, /timeout-minutes:\s*\d+/);
  assert.match(semComentarios, /cancel-in-progress:\s*true/);
});

test('o modelo, os diretórios ignorados e o comentário no PR estão definidos na Action', () => {
  assert.match(semComentarios, /claude-model:\s*\S+/);
  assert.match(semComentarios, /exclude-directories:\s*\S+/);
  assert.match(semComentarios, /comment-pr:\s*true/);
});
