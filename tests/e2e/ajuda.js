const path = require('node:path');
const { pathToFileURL } = require('node:url');

/** Endereço do app, aberto direto do arquivo (ele não precisa de servidor). */
const APP = pathToFileURL(path.join(__dirname, '..', '..', 'index.html')).href;

/** Vai para uma aba do app, como a pessoa faz (toca no nome dela). */
async function irParaAba(page, nome) {
  if (nome === 'Metas' || nome === 'Método') await page.getByRole('button', { name: 'Mais' }).click(); // ficam dentro do "Mais"
  await page.getByRole('tab', { name: nome }).click();
}

/** Abre o "Mais detalhes" do formulário (data, descrição, parcelas e fixo ficam recolhidos). */
async function abrirDetalhes(formulario) {
  const detalhes = formulario.locator('details.more');
  if (!(await detalhes.evaluate((d) => d.open))) await detalhes.locator('summary').click();
}

/**
 * Lança uma despesa ou receita pelo formulário, como o usuário faz.
 * `tipo` é 'Despesa' ou 'Receita'; `categoria` é o id da categoria (ex.: 'mercado').
 */
async function lancar(page, { tipo, valor, categoria, descricao }) {
  const formulario = page.locator('#tx-form');
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await formulario.getByRole('radio', { name: tipo }).check();
  await formulario.getByLabel('Valor (R$)').fill(valor);
  await formulario.getByLabel('Categoria').selectOption(categoria);
  await abrirDetalhes(formulario);
  await formulario.getByLabel('Descrição').fill(descricao);
  await formulario.getByRole('button', { name: 'Salvar' }).click();
}

/** Painel "Movimentar" de uma meta (aberto). */
const painelMover = (page) => page.getByRole('dialog', { name: /Movimentar/ });

/**
 * Abre o painel "Movimentar" da meta e faz a ação, como a pessoa faz.
 * `acao`: 'Guardar mais' | 'Transferir para outra meta' | 'Tirar e usar em outra coisa'.
 * `destino` é o nome da meta de destino (só em transferir); `aceitar` marca a caixa do aviso.
 * Sem `confirmar: false`, toca em "Confirmar" no fim.
 */
async function movimentar(page, nomeMeta, { acao, valor, destino, aceitar, confirmar = true }) {
  await page.locator('#goal-list .goal').filter({ hasText: nomeMeta }).getByRole('button', { name: /Movimentar/ }).click();
  const painel = painelMover(page);
  await painel.locator('label.pilula', { hasText: acao }).click();
  if (destino) await painel.getByLabel('Para qual meta?').selectOption({ label: destino });
  if (valor !== undefined) await painel.getByLabel(/^Valor a /).fill(valor);
  if (aceitar) await painel.getByLabel('Entendo, quero continuar assim.').check();
  if (confirmar) await painel.getByRole('button', { name: 'Confirmar' }).click();
  return painel;
}

module.exports = { APP, lancar, abrirDetalhes, irParaAba, movimentar, painelMover };
