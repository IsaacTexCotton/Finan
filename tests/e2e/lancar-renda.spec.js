const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

test('"Lançar minha renda" abre o formulário já como Receita e o salário entra nas receitas', async ({ page }) => {
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const formulario = page.locator('#tx-form');

  // 1. Pessoa nova, app vazio: passa pelo onboarding e clica no botão do passo 3
  await page.goto(APP);
  await page.locator('#onboarding').getByRole('button', { name: 'Próximo' }).click();
  await page.locator('#onboarding').getByRole('button', { name: 'Próximo' }).click();
  await page.getByRole('button', { name: 'Lançar minha renda' }).click();

  // 2. O formulário já está pronto para uma renda: Receita, categoria Salário, cursor no valor
  await expect(formulario.getByRole('radio', { name: 'Receita' })).toBeChecked();
  await expect(formulario.getByLabel('Categoria')).toHaveValue('salario');
  await expect(formulario.getByLabel('Valor (R$)')).toBeFocused();

  // 3. Só digita o valor e salva
  await formulario.getByLabel('Valor (R$)').fill('2800');
  await formulario.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('status')).toContainText(/Receita de R\$\s2\.800,00 lançada/);

  // 4. No Painel, vai para Receitas e não para Despesas
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(page.locator('#summary-cards .card').filter({ hasText: 'Receitas' })).toContainText(/R\$\s2\.800,00/);
  await expect(page.locator('#summary-cards .card').filter({ hasText: 'Gastos' })).toContainText(/R\$\s0,00/);

  expect(erros, 'o app não deve gerar erros de JavaScript').toEqual([]);
});

test('o botão "+ Lançar" do topo continua abrindo como Despesa', async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: '+ Lançar' }).click();
  await expect(page.locator('#tx-form').getByRole('radio', { name: 'Despesa' })).toBeChecked();
  await expect(page.locator('#tx-form').getByLabel('Valor (R$)')).toBeFocused();
});
