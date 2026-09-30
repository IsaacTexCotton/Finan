const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP = pathToFileURL(path.join(__dirname, '..', '..', 'index.html')).href;

test('lançar uma despesa e vê-la no Painel', async ({ page }) => {
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));

  // 1. Abre o app vazio: nenhuma despesa ainda
  await page.goto(APP);
  const formulario = page.locator('#tx-form');
  const cartaoDespesas = page.locator('#summary-cards .card').filter({ hasText: 'Despesas' });
  await expect(cartaoDespesas).toContainText(/R\$\s0,00/);
  await expect(page.locator('#top-categories')).toContainText('Nenhuma despesa neste mês ainda.');

  // 2. "+ Lançar" leva ao formulário, com o cursor no campo de valor
  await page.getByRole('button', { name: '+ Lançar' }).click();
  await expect(page.getByRole('tab', { name: 'Lançamentos' })).toHaveAttribute('aria-selected', 'true');
  await expect(formulario.getByLabel('Valor (R$)')).toBeFocused();

  // 3. Preenche e salva uma despesa de R$ 25,90 no Mercado
  await formulario.getByLabel('Valor (R$)').fill('25,90');
  await formulario.getByLabel('Categoria').selectOption('mercado');
  await formulario.getByLabel('Descrição').fill('Padaria do bairro');
  await formulario.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('status')).toContainText(/Despesa de R\$\s25,90 lançada/);

  // 4. Aparece na lista de lançamentos do mês
  await expect(page.locator('.tx').filter({ hasText: 'Padaria do bairro' })).toContainText(/R\$\s25,90/);

  // 5. E aparece no Painel: no total de despesas e na categoria Mercado
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(cartaoDespesas).toContainText(/R\$\s25,90/);
  await expect(page.locator('#top-categories .cat-row').filter({ hasText: 'Mercado' })).toContainText(/R\$\s25,90/);

  expect(erros, 'o app não deve gerar erros de JavaScript').toEqual([]);
});
