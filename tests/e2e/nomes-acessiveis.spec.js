const { test, expect } = require('@playwright/test');
const { APP, lancar } = require('./ajuda');

// Um leitor de tela lê só o nome do botão. "Editar" repetido 17 vezes não diz o que editar.

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
});

test('cada Editar e Excluir da lista diz de qual lançamento é', async ({ page }) => {
  await lancar(page, { tipo: 'Despesa', valor: '25,90', categoria: 'mercado', descricao: 'Padaria do bairro' });
  await lancar(page, { tipo: 'Despesa', valor: '75', categoria: 'saude', descricao: 'Farmácia' });

  await expect(page.getByRole('button', { name: /^Editar Padaria do bairro, R\$\s25,90$/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^Excluir Padaria do bairro, R\$\s25,90$/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^Excluir Farmácia, R\$\s75,00$/ })).toHaveCount(1);

  // nenhum nome de botão se repete na lista
  const nomes = await page.locator('#tx-list button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.innerText.trim()));
  expect(nomes.length).toBe(4);
  expect(new Set(nomes).size, `nomes repetidos: ${nomes.join(' | ')}`).toBe(nomes.length);
});

test('lançamento sem descrição usa a categoria, e parcela diz qual é', async ({ page }) => {
  await lancar(page, { tipo: 'Despesa', valor: '40', categoria: 'lazer', descricao: '' });
  await expect(page.getByRole('button', { name: /^Editar Lazer, R\$\s40,00$/ })).toHaveCount(1);

  await page.locator('#tx-form').getByLabel('Valor (R$)').fill('300');
  await page.locator('#tx-form').getByLabel('Descrição').fill('Notebook');
  await page.locator('#tx-form').getByLabel('Parcelas').fill('3');
  await page.locator('#tx-form').getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('button', { name: /^Excluir Notebook, parcela 1\/3, R\$\s100,00$/ })).toHaveCount(1);
});

test('botões das metas dizem de qual meta são', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  await page.getByRole('tab', { name: 'Metas' }).click();
  await expect(page.getByRole('button', { name: 'Guardar valor na meta Viagem de férias' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Excluir meta Viagem de férias' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Excluir meta Reserva de emergência' })).toHaveCount(1);
});
