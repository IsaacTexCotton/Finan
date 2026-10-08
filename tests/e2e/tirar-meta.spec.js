const { test, expect } = require('@playwright/test');
const { APP, irParaAba, movimentar } = require('./ajuda');

// "Tirar" devolve dinheiro já guardado numa meta para a Sobra do mês: é o espelho de "Guardar
// mais". Não é gasto; some do Guardado de hoje e aumenta a Sobra. Dados de exemplo: Reserva de
// emergência R$ 4.500,00 de R$ 18.000,00; Viagem de férias R$ 1.200,00 de R$ 6.000,00; Guardado
// do Painel = R$ 900,00. A ação mora no painel "Movimentar" da meta.

const TIRAR = 'Tirar e usar em outra coisa';

const meta = (page, nome) => page.locator('#goal-list .goal').filter({ hasText: nome });
const guardado = (page) => page.locator('#summary-cards .card').filter({ hasText: 'Guardado' });
const sobrou = (page) => page.locator('#summary-cards .card').filter({ hasText: 'Sobrou' });
const numero = (texto) => Number(texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
const valorCard = async (card) => numero(await card.locator('.card-value').innerText());

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
});

test('tirar baixa a meta e o Guardado do mês, e aumenta a Sobra na mesma hora', async ({ page }) => {
  await page.getByRole('tab', { name: 'Painel' }).click();
  const sobrouAntes = await valorCard(sobrou(page));
  await expect(guardado(page)).toContainText(/R\$\s900,00/);

  await irParaAba(page, 'Metas');
  // a reserva já está abaixo do ideal: tirar pede o aceite do aviso
  await movimentar(page, 'Reserva de emergência', { acao: TIRAR, valor: '500', aceitar: true });
  await expect(page.getByRole('status')).toContainText(/R\$\s500,00 tirados de "Reserva de emergência" e somados à sobra do mês/);
  await expect(meta(page, 'Reserva de emergência')).toContainText(/R\$\s4\.000,00 de R\$\s18\.000,00/); // 4.500 - 500

  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(guardado(page)).toContainText(/R\$\s400,00/); // 900 - 500
  const sobrouDepois = await valorCard(sobrou(page));
  expect(sobrouDepois).toBeCloseTo(sobrouAntes + 500, 2); // a sobra sobe o mesmo valor tirado

  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  const linha = page.locator('#tx-list .tx').filter({ hasText: 'Retirada: Reserva de emergência' });
  await expect(linha).toContainText(/\+\s*R\$\s500,00/);
});

test('tirar avisa antes de deixar a reserva abaixo do ideal, e a pessoa pode desistir', async ({ page }) => {
  await irParaAba(page, 'Metas');
  const painel = await movimentar(page, 'Reserva de emergência', { acao: TIRAR, valor: '4500', confirmar: false }); // tira tudo
  await expect(painel).toContainText(/abaixo do ideal/);
  await expect(painel.getByRole('button', { name: 'Confirme o aviso' })).toBeDisabled();
  await painel.getByRole('button', { name: 'Cancelar' }).click(); // desiste
  await expect(meta(page, 'Reserva de emergência')).toContainText(/R\$\s4\.500,00 de R\$\s18\.000,00/); // sem mudança
});

test('tirar recusa valor maior do que a meta tem guardado', async ({ page }) => {
  await irParaAba(page, 'Metas');
  const painel = await movimentar(page, 'Viagem de férias', { acao: TIRAR, valor: '9999', confirmar: false });
  await expect(painel).toContainText(/só tem R\$\s1\.200,00 guardado/);
  await expect(painel.getByRole('button', { name: 'Corrija o valor' })).toBeDisabled();
  await painel.getByRole('button', { name: 'Cancelar' }).click();
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.200,00 de R\$\s6\.000,00/);
});

test('tirar tudo deixa a meta em zero, e não dá para tirar mais', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await movimentar(page, 'Viagem de férias', { acao: TIRAR, valor: '1200' });
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s0,00 de R\$\s6\.000,00/);
  const painel = await movimentar(page, 'Viagem de férias', { acao: TIRAR, valor: '1', confirmar: false });
  await expect(painel).toContainText(/só tem R\$\s0,00 guardado/);
  await expect(painel.getByRole('button', { name: 'Corrija o valor' })).toBeDisabled();
});
