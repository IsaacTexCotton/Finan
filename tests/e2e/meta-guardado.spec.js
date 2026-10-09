const { test, expect } = require('@playwright/test');
const { APP, irParaAba, movimentar, painelMover, carregarExemplo } = require('./ajuda');

// Guardar dinheiro numa meta é guardar: entra no cartão Guardado do Painel, no balde Futuro,
// e aparece na lista de lançamentos. Dados de exemplo: Guardado do mês = R$ 900,00.

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await carregarExemplo(page);
});

const meta = (page, nome) => page.locator('#goal-list .goal').filter({ hasText: nome });
const guardado = (page) => page.locator('#summary-cards .card').filter({ hasText: 'Guardado' });

test('guardar numa meta aumenta a meta e também o Guardado do Painel', async ({ page }) => {
  await expect(guardado(page)).toContainText(/R\$\s900,00/);

  await irParaAba(page, 'Metas');
  await movimentar(page, 'Viagem de férias', { acao: 'Guardar mais', valor: '300' });
  await expect(page.getByRole('status')).toContainText(/R\$\s300,00 adicionados à meta/);
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.500,00 de R\$\s6\.000,00/); // 1.200 que já tinha + 300

  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(guardado(page)).toContainText(/R\$\s1\.200,00/); // 900 + 300

  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  const linha = page.locator('#tx-list .tx').filter({ hasText: 'Meta: Viagem de férias' });
  await expect(linha).toContainText('Metas');
  await expect(linha).toContainText(/R\$\s300,00/);
});

test('excluir o depósito da lista desfaz o valor da meta e do Guardado', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await movimentar(page, 'Viagem de férias', { acao: 'Guardar mais', valor: '300' });
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.500,00 de/);

  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await page.locator('#tx-list .tx').filter({ hasText: 'Meta: Viagem de férias' }).getByRole('button', { name: /Excluir/ }).click();

  await irParaAba(page, 'Metas');
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.200,00 de R\$\s6\.000,00/);
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(guardado(page)).toContainText(/R\$\s900,00/);
});

test('o depósito na meta de reserva entra na categoria Reserva de emergência', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await movimentar(page, 'Reserva de emergência', { acao: 'Guardar mais', valor: '300' });
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await expect(page.locator('#tx-list .tx').filter({ hasText: 'Meta: Reserva de emergência' })).toContainText('Reserva de emergência');
});

test('valor que não é um número positivo é recusado e não cria lançamento', async ({ page }) => {
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  const antes = await page.locator('#tx-list .tx').count();
  await irParaAba(page, 'Metas');
  for (const invalido of ['abc', '0', '-50']) {
    const painel = await movimentar(page, 'Viagem de férias', { acao: 'Guardar mais', valor: invalido, confirmar: false });
    await expect(painel).toContainText('Informe um valor maior que zero.');
    await expect(painel.getByRole('button', { name: 'Preencha o valor' })).toBeDisabled();
    await painel.getByRole('button', { name: 'Cancelar' }).click();
    await expect(painelMover(page)).toBeHidden();
  }
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await expect(page.locator('#tx-list .tx')).toHaveCount(antes);
});
