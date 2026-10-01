const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { converter, montarArquivo } = require('../tools/gerar-novidades');

// O histórico de atualizações mora em CHANGELOG.md (formato "Keep a Changelog", versões "SemVer").
// O app abre direto do arquivo e não consegue ler um .md, então tools/gerar-novidades.js copia o
// texto para js/novidades.js. Estes testes garantem que o texto está bem escrito e que a cópia
// não ficou para trás.

const raiz = path.join(__dirname, '..');
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

test('converter lê versões, datas, blocos e itens, e ignora o que não tem item', () => {
  const lista = converter([
    '# Histórico', '', 'Texto de apresentação.', '',
    '## [Não lançado]', '',
    '## [1.2.3] - 2026-01-02', '',
    '### Adicionado', '- primeiro', '- segundo', '',
    '### Corrigido', '- terceiro', '',
    '## Antes da versão 1.0.0 - 2026-01-01', '',
    '### Alterado', '- quarto', '',
  ].join('\n'));
  assert.deepEqual(lista, [
    { versao: '1.2.3', rotulo: null, data: '2026-01-02', secoes: [{ nome: 'Adicionado', itens: ['primeiro', 'segundo'] }, { nome: 'Corrigido', itens: ['terceiro'] }] },
    { versao: null, rotulo: 'Antes da versão 1.0.0', data: '2026-01-01', secoes: [{ nome: 'Alterado', itens: ['quarto'] }] },
  ]);
});

test('converter mostra o "Não lançado" quando ele tem itens', () => {
  const [primeira] = converter('## [Não lançado]\n\n### Corrigido\n- algo\n\n## [0.1.0] - 2026-01-01\n\n### Adicionado\n- x\n');
  assert.deepEqual(primeira, { versao: null, rotulo: 'Não lançado', data: null, secoes: [{ nome: 'Corrigido', itens: ['algo'] }] });
});

test('converter recusa texto mal escrito, em vez de esconder o erro', () => {
  assert.throws(() => converter('## [1.0.0] - 2026-13-45\n\n### Adicionado\n- x\n'), /data/i);
  assert.throws(() => converter('## [1.0]\n\n### Adicionado\n- x\n'), /título/i);
  assert.throws(() => converter('## [1.0.0] - 2026-01-01\n\n### Inventado\n- x\n'), /bloco/i);
  assert.throws(() => converter('## [1.0.0] - 2026-01-01\n\n- item solto\n'), /bloco/i);
  assert.throws(() => converter('## [1.0.0] - 2026-01-01\n\n### Adicionado\ntexto sem traço\n'), /linha/i);
});

test('o CHANGELOG.md do projeto está bem escrito, do mais novo para o mais antigo', () => {
  const lista = converter(ler('CHANGELOG.md'));
  const numeradas = lista.filter((e) => e.versao);
  assert.ok(numeradas.length >= 1, 'precisa de pelo menos uma versão numerada');
  const partes = (v) => v.split('.').map(Number);
  for (let i = 1; i < numeradas.length; i++) {
    const [a, b] = [partes(numeradas[i - 1].versao), partes(numeradas[i].versao)];
    const maior = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    assert.ok(maior > 0, `${numeradas[i - 1].versao} deve vir antes de ${numeradas[i].versao}`);
  }
  const datas = lista.filter((e) => e.data).map((e) => e.data);
  assert.deepEqual(datas, [...datas].sort().reverse(), 'as datas devem ir da mais nova para a mais antiga');
});

test('a versão do package.json é a da versão mais nova do CHANGELOG.md', () => {
  const [maisNova] = converter(ler('CHANGELOG.md')).filter((e) => e.versao);
  assert.equal(JSON.parse(ler('package.json')).version, maisNova.versao);
});

test('js/novidades.js é a cópia atual do CHANGELOG.md (rode: node tools/gerar-novidades.js)', () => {
  assert.equal(ler('js/novidades.js'), montarArquivo(converter(ler('CHANGELOG.md'))));
});
