const path = require('node:path');
const { pathToFileURL } = require('node:url');

/** Endereço do app, aberto direto do arquivo (ele não precisa de servidor). */
const APP = pathToFileURL(path.join(__dirname, '..', '..', 'index.html')).href;

/** Vai para uma aba do app, como a pessoa faz (toca no nome dela). */
async function irParaAba(page, nome) {
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

module.exports = { APP, lancar, abrirDetalhes, irParaAba };
