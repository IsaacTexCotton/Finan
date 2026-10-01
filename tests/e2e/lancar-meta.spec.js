const { test, expect } = require('@playwright/test');
const { APP, abrirDetalhes } = require('./ajuda');

// No formulário de lançamento, o balde Futuro tem a categoria "Metas". Ao escolhê-la, abre a lista
// das metas da pessoa ("Para qual meta?"). Sem nenhuma meta, a categoria nem aparece.
// Dados de exemplo: metas "Viagem de férias" (R$ 1.200 de R$ 6.000) e "Reserva de emergência"; Guardado = R$ 900,00.

const formulario = (page) => page.locator('#tx-form');
const meta = (page, nome) => page.locator('#goal-list .goal').filter({ hasText: nome });

test('sem nenhuma meta, a categoria Metas nem aparece na lista', async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: '+ Lançar' }).click();
  await expect(formulario(page).getByLabel('Categoria').locator('option[value="metas"]')).toHaveCount(0);
  await expect(formulario(page).getByLabel('Categoria').locator('option[value="reserva"]')).toHaveCount(1);
  await expect(formulario(page).getByLabel('Para qual meta?')).toBeHidden();
});

test.describe('com metas', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto(APP);
    await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
    await page.getByRole('tab', { name: 'Lançamentos' }).click();
  });

  test('escolher Metas abre a lista das metas e o valor entra na meta escolhida', async ({ page }) => {
    const campo = formulario(page).getByLabel('Para qual meta?');
    await expect(campo).toBeHidden();

    await formulario(page).getByLabel('Categoria').selectOption('metas');
    await expect(campo).toBeVisible();
    await expect(campo.locator('option')).toHaveText(['Reserva de emergência', 'Viagem de férias']);
    await expect(formulario(page).getByLabel('Parcelas')).toBeHidden();

    await formulario(page).getByLabel('Valor (R$)').fill('300');
    await campo.selectOption({ label: 'Viagem de férias' });
    await formulario(page).getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('status')).toContainText(/Despesa de R\$\s300,00 lançada/);

    // vira lançamento do Futuro com a descrição padrão da meta
    await expect(page.locator('#tx-list .tx').filter({ hasText: 'Meta: Viagem de férias' })).toContainText(/R\$\s300,00/);
    await page.getByRole('tab', { name: 'Metas' }).click();
    await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.500,00 de R\$\s6\.000,00/);
    await page.getByRole('tab', { name: 'Painel' }).click();
    await expect(page.locator('#summary-cards .card').filter({ hasText: 'Guardado' })).toContainText(/R\$\s1\.200,00/);
  });

  test('trocar para outra categoria esconde a lista de metas', async ({ page }) => {
    await formulario(page).getByLabel('Categoria').selectOption('metas');
    await expect(formulario(page).getByLabel('Para qual meta?')).toBeVisible();
    await formulario(page).getByLabel('Categoria').selectOption('mercado');
    await expect(formulario(page).getByLabel('Para qual meta?')).toBeHidden();
    await abrirDetalhes(formulario(page));
    await expect(formulario(page).getByLabel('Parcelas')).toBeVisible();
  });

  test('editar o lançamento para outra categoria tira o valor da meta', async ({ page }) => {
    await formulario(page).getByLabel('Categoria').selectOption('metas');
    await formulario(page).getByLabel('Para qual meta?').selectOption({ label: 'Viagem de férias' });
    await formulario(page).getByLabel('Valor (R$)').fill('300');
    await formulario(page).getByRole('button', { name: 'Salvar' }).click();

    await page.locator('#tx-list .tx').filter({ hasText: 'Meta: Viagem de férias' }).getByRole('button', { name: /Editar/ }).click();
    await expect(formulario(page).getByLabel('Para qual meta?')).toHaveValue(/.+/);
    await expect(formulario(page).getByLabel('Para qual meta?').locator('option:checked')).toHaveText('Viagem de férias');
    await formulario(page).getByLabel('Categoria').selectOption('mercado');
    await formulario(page).getByRole('button', { name: 'Salvar alterações' }).click();

    await page.getByRole('tab', { name: 'Metas' }).click();
    await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.200,00 de R\$\s6\.000,00/);
  });
});
