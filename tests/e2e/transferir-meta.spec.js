const { test, expect } = require('@playwright/test');
const { APP, irParaAba, movimentar, painelMover } = require('./ajuda');

// Transferir entre metas move o que já estava guardado (ex.: da reserva para uma meta de viagem),
// sem criar lançamento: o Guardado e o Sobrou do mês não mudam. Dados de exemplo: Reserva de
// emergência R$ 4.500,00 de R$ 18.000,00; Viagem de férias R$ 1.200,00 de R$ 6.000,00; Guardado do
// Painel = R$ 900,00. A ação mora no painel "Movimentar" da meta.

const meta = (page, nome) => page.locator('#goal-list .goal').filter({ hasText: nome });
const guardado = (page) => page.locator('#summary-cards .card').filter({ hasText: 'Guardado' });

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
});

test('transferir move o valor entre as metas sem mudar o Guardado do Painel', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await movimentar(page, 'Reserva de emergência', { acao: 'Transferir para outra meta', destino: 'Viagem de férias', valor: '500' });
  await expect(page.getByRole('status')).toContainText(/R\$\s500,00 transferidos de "Reserva de emergência" para "Viagem de férias"/);
  await expect(meta(page, 'Reserva de emergência')).toContainText(/R\$\s4\.000,00 de R\$\s18\.000,00/); // 4.500 - 500
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.700,00 de R\$\s6\.000,00/); // 1.200 + 500

  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(guardado(page)).toContainText(/R\$\s900,00/); // não muda: é só realocação
});

test('transferir recusa mover mais do que a meta tem, dentro do painel', async ({ page }) => {
  await irParaAba(page, 'Metas');
  // mais do que os R$ 1.200,00 da Viagem de férias
  const painel = await movimentar(page, 'Viagem de férias', { acao: 'Transferir para outra meta', destino: 'Reserva de emergência', valor: '9999', confirmar: false });
  await expect(painel).toContainText(/só tem R\$\s1\.200,00 guardado/);
  await expect(painel.getByRole('button', { name: 'Corrija o valor' })).toBeDisabled();
  await painel.getByRole('button', { name: 'Cancelar' }).click();
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.200,00 de R\$\s6\.000,00/); // sem mudança
});

test('com uma meta só, "Transferir" fica indisponível e o painel explica por quê', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await meta(page, 'Viagem de férias').getByRole('button', { name: 'Excluir meta Viagem de férias' }).click();
  await meta(page, 'Reserva de emergência').getByRole('button', { name: /Movimentar/ }).click();
  const painel = painelMover(page);
  await expect(painel.getByRole('radio', { name: 'Transferir para outra meta' })).toBeDisabled();
  await expect(painel).toContainText('Crie outra meta para poder transferir.');
});
