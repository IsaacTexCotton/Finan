const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// "Tirar" devolve dinheiro já guardado numa meta para a Sobra do mês: é o espelho de "Guardar
// valor". Não é gasto; some do Guardado de hoje e aumenta a Sobra. Dados de exemplo: Reserva de
// emergência R$ 4.500,00 de R$ 18.000,00; Viagem de férias R$ 1.200,00 de R$ 6.000,00; Guardado
// do Painel = R$ 900,00; Sobrou = R$ 1.300,00 (salário 5.200, gastos ~2.100, guardado 900 -> este
// número depende dos dados de exemplo e é lido da própria tela, não fixado aqui).

let resposta;

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? resposta : undefined));
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
});

const meta = (page, nome) => page.locator('#goal-list .goal').filter({ hasText: nome });
const guardado = (page) => page.locator('#summary-cards .card').filter({ hasText: 'Guardado' });
const sobrou = (page) => page.locator('#summary-cards .card').filter({ hasText: 'Sobrou' });
const numero = (texto) => Number(texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
const valorCard = async (card) => numero(await card.locator('.card-value').innerText());

test('tirar baixa a meta e o Guardado do mês, e aumenta a Sobra na mesma hora', async ({ page }) => {
  await page.getByRole('tab', { name: 'Painel' }).click();
  const sobrouAntes = await valorCard(sobrou(page));
  await expect(guardado(page)).toContainText(/R\$\s900,00/);

  resposta = '500';
  await irParaAba(page, 'Metas');
  await meta(page, 'Reserva de emergência').getByRole('button', { name: /Tirar/ }).click();
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
  let mensagemConfirm = '';
  page.removeAllListeners('dialog');
  page.on('dialog', async (d) => {
    if (d.type() === 'prompt') await d.accept('4500'); // tira tudo: reserva vai a R$ 0,00
    else {
      mensagemConfirm = d.message();
      await d.dismiss(); // desiste
    }
  });
  await irParaAba(page, 'Metas');
  await meta(page, 'Reserva de emergência').getByRole('button', { name: /Tirar/ }).click();
  await expect(meta(page, 'Reserva de emergência')).toContainText(/R\$\s4\.500,00 de R\$\s18\.000,00/); // sem mudança
  expect(mensagemConfirm).toMatch(/abaixo do ideal/);
});

test('tirar recusa valor maior do que a meta tem guardado', async ({ page }) => {
  resposta = '999999';
  await irParaAba(page, 'Metas');
  await meta(page, 'Viagem de férias').getByRole('button', { name: /Tirar/ }).click();
  await expect(page.getByRole('status')).toContainText(/só tem R\$\s1\.200,00 guardado/);
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.200,00 de R\$\s6\.000,00/);
});

test('o botão Tirar não aparece numa meta sem nada guardado', async ({ page }) => {
  resposta = '1200';
  await irParaAba(page, 'Metas');
  await meta(page, 'Viagem de férias').getByRole('button', { name: /Tirar/ }).click();
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s0,00 de R\$\s6\.000,00/);
  await expect(meta(page, 'Viagem de férias').getByRole('button', { name: /Tirar/ })).toHaveCount(0);
});
