const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// Transferir entre metas move o que já estava guardado (ex.: da reserva para uma meta de viagem),
// sem criar lançamento: o Guardado e o Sobrou do mês não mudam. Dados de exemplo: Reserva de
// emergência R$ 4.500,00 de R$ 18.000,00; Viagem de férias R$ 1.200,00 de R$ 6.000,00; Guardado do
// Painel = R$ 900,00.

const meta = (page, nome) => page.locator('#goal-list .goal').filter({ hasText: nome });
const guardado = (page) => page.locator('#summary-cards .card').filter({ hasText: 'Guardado' });

function responderTransferencia(page, escolha, valor) {
  page.on('dialog', async (d) => {
    if (/Transferir de/.test(d.message())) await d.accept(escolha);
    else if (/Quanto transferir/.test(d.message())) await d.accept(valor);
    else await d.dismiss();
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
});

test('transferir move o valor entre as metas sem mudar o Guardado do Painel', async ({ page }) => {
  responderTransferencia(page, '1', '500');
  await irParaAba(page, 'Metas');
  await meta(page, 'Reserva de emergência').getByRole('button', { name: /Transferir/ }).click();
  await expect(page.getByRole('status')).toContainText(/R\$\s500,00 transferidos de "Reserva de emergência" para "Viagem de férias"/);
  await expect(meta(page, 'Reserva de emergência')).toContainText(/R\$\s4\.000,00 de R\$\s18\.000,00/); // 4.500 - 500
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.700,00 de R\$\s6\.000,00/); // 1.200 + 500

  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(guardado(page)).toContainText(/R\$\s900,00/); // não muda: é só realocação
});

test('transferir recusa mover mais do que a meta tem', async ({ page }) => {
  responderTransferencia(page, '1', '999999'); // mais do que os R$ 1.200,00 da Viagem de férias
  await irParaAba(page, 'Metas');
  await meta(page, 'Viagem de férias').getByRole('button', { name: /Transferir/ }).click();
  await expect(page.getByRole('status')).toContainText(/só tem R\$\s1\.200,00 guardado/);
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.200,00 de R\$\s6\.000,00/); // sem mudança
});

test('o botão Transferir não aparece quando há só uma meta', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await meta(page, 'Viagem de férias').getByRole('button', { name: 'Excluir meta Viagem de férias' }).click();
  await expect(meta(page, 'Reserva de emergência').getByRole('button', { name: /Transferir/ })).toHaveCount(0);
});
