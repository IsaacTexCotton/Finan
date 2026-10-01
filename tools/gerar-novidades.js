// Copia o histórico de atualizações (CHANGELOG.md) para js/novidades.js, o arquivo que o app lê.
// O app abre direto do arquivo (file://) e não consegue ler um .md. Uso: node tools/gerar-novidades.js
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
// Os tipos de "Keep a Changelog", em português.
const BLOCOS = ['Adicionado', 'Alterado', 'Corrigido', 'Removido', 'Segurança'];

function dataValida(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/** "## [1.2.3] - 2026-01-02", "## [Não lançado]" ou "## Antes da versão 1.0.0 - 2026-01-01". */
function lerTitulo(texto) {
  if (texto === '[Não lançado]') return { versao: null, rotulo: 'Não lançado', data: null, secoes: [] };
  const numerada = /^\[(\d+\.\d+\.\d+)\] - (.+)$/.exec(texto);
  const rotulada = /^([^[].*) - (\d{4}-\d{2}-\d{2})$/.exec(texto);
  const [, versao, data] = numerada || [];
  if (numerada && !dataValida(data)) throw new Error(`data inválida em "## ${texto}" (use AAAA-MM-DD)`);
  if (numerada) return { versao, rotulo: null, data, secoes: [] };
  if (rotulada && dataValida(rotulada[2])) return { versao: null, rotulo: rotulada[1], data: rotulada[2], secoes: [] };
  throw new Error(`título inválido: "## ${texto}"`);
}

function lerBloco(nome) {
  if (!BLOCOS.includes(nome)) throw new Error(`bloco desconhecido "### ${nome}" (use: ${BLOCOS.join(', ')})`);
  return { nome, itens: [] };
}

function lerItem(linha, bloco) {
  if (!bloco) throw new Error(`linha fora de um bloco ("### Adicionado" etc.): "${linha}"`);
  const m = /^- (.+)$/.exec(linha);
  if (!m) throw new Error(`linha inesperada (cada item começa com "- "): "${linha}"`);
  bloco.itens.push(m[1].trim());
}

/** Lê o CHANGELOG.md e devolve as entradas na ordem do arquivo, só as que têm itens. */
function converter(markdown) {
  const entradas = [];
  let entrada = null;
  let bloco = null;
  for (const linha of markdown.split(/\r?\n/).map((l) => l.trimEnd())) {
    if (linha.startsWith('## ')) {
      entrada = lerTitulo(linha.slice(3).trim());
      entradas.push(entrada);
      bloco = null;
    } else if (!entrada || linha === '') {
      continue; // apresentação do arquivo (antes da primeira entrada) e linhas em branco
    } else if (linha.startsWith('### ')) {
      bloco = lerBloco(linha.slice(4).trim());
      entrada.secoes.push(bloco);
    } else {
      lerItem(linha, bloco);
    }
  }
  return entradas
    .map((e) => ({ ...e, secoes: e.secoes.filter((s) => s.itens.length > 0) }))
    .filter((e) => e.secoes.length > 0);
}

function montarArquivo(entradas) {
  return `// GERADO por tools/gerar-novidades.js a partir do CHANGELOG.md. Não edite à mão: rode "node tools/gerar-novidades.js".\nwindow.FINAN_NOVIDADES = ${JSON.stringify(entradas, null, 2)};\n`;
}

if (require.main === module) {
  const markdown = fs.readFileSync(path.join(RAIZ, 'CHANGELOG.md'), 'utf8');
  fs.writeFileSync(path.join(RAIZ, 'js', 'novidades.js'), montarArquivo(converter(markdown)));
}

module.exports = { converter, montarArquivo };
