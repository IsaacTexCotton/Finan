const path = require('node:path');
const { pathToFileURL } = require('node:url');

/** Endereço do app, aberto direto do arquivo (ele não precisa de servidor). */
const APP = pathToFileURL(path.join(__dirname, '..', '..', 'index.html')).href;

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
  await formulario.getByLabel('Descrição').fill(descricao);
  await formulario.getByRole('button', { name: 'Salvar' }).click();
}

module.exports = { APP, lancar };
