const { test, expect } = require('@playwright/test');
const { APP, lancar, irParaAba, movimentar } = require('./ajuda');

// Decisão do Isaac (30/09/2026): "Sobrou" pode ficar negativo, mas o app avisa ANTES de deixar
// guardar mais do que sobrou, e a pessoa escolhe se guarda mesmo assim.

let avisos;
let aceitar;

test.beforeEach(async ({ page }) => {
  avisos = [];
  aceitar = false;
  page.on('dialog', async (d) => {
    avisos.push(d.message());
    if (aceitar) await d.accept();
    else await d.dismiss();
  });
  await page.goto(APP);
});

const cartao = (page, nome) => page.locator('#summary-cards .card').filter({ hasText: nome });

/** Renda de R$ 1.000 e aluguel de R$ 800: sobram R$ 200. */
async function mesComSobraDe200(page) {
  await lancar(page, { tipo: 'Receita', valor: '1000', categoria: 'salario', descricao: 'Salário' });
  await lancar(page, { tipo: 'Despesa', valor: '800', categoria: 'moradia', descricao: 'Aluguel' });
}

test('guardar mais do que sobrou avisa antes, e desistir não salva nada', async ({ page }) => {
  await mesComSobraDe200(page);
  aceitar = false;
  await lancar(page, { tipo: 'Despesa', valor: '300', categoria: 'investimentos', descricao: 'Aporte' });

  expect(avisos).toHaveLength(1);
  expect(avisos[0]).toMatch(/Guardar R\$\s300,00 deixa .* no vermelho/);
  expect(avisos[0]).toMatch(/faltariam R\$\s100,00/);
  expect(avisos[0]).toMatch(/guardar mesmo assim\?/);
  await expect(page.locator('#tx-list .tx').filter({ hasText: 'Aporte' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(cartao(page, 'Guardado')).toContainText(/R\$\s0,00/);
  await expect(cartao(page, 'Sobrou')).toContainText(/R\$\s200,00/);
});

test('"guardar mesmo assim" salva, e o Painel mostra que sobrou negativo', async ({ page }) => {
  await mesComSobraDe200(page);
  aceitar = true;
  await lancar(page, { tipo: 'Despesa', valor: '300', categoria: 'investimentos', descricao: 'Aporte' });

  expect(avisos).toHaveLength(1);
  await expect(page.locator('#tx-list .tx').filter({ hasText: 'Aporte' })).toHaveCount(1);
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(cartao(page, 'Guardado')).toContainText(/R\$\s300,00/);
  await expect(cartao(page, 'Sobrou')).toContainText(/-R\$\s100,00/);
  await expect(page.locator('#insights')).toContainText(/passam da renda em R\$\s100,00/);
});

test('guardar dentro do que sobrou não avisa nada', async ({ page }) => {
  await mesComSobraDe200(page);
  await lancar(page, { tipo: 'Despesa', valor: '150', categoria: 'investimentos', descricao: 'Aporte' });
  expect(avisos).toEqual([]);
  await expect(page.locator('#tx-list .tx').filter({ hasText: 'Aporte' })).toHaveCount(1);
});

test('o mesmo aviso vale para "Guardar valor" numa meta', async ({ page }) => {
  await mesComSobraDe200(page);
  await irParaAba(page, 'Metas');
  await page.getByRole('button', { name: 'Criar meta de reserva' }).click();
  // O aviso agora aparece dentro do painel "Movimentar": a pessoa lê e só confirma se marcar a caixa.
  const painel = await movimentar(page, 'Reserva de emergência', { acao: 'Guardar mais', valor: '300', confirmar: false });
  await expect(painel).toContainText(/Guardar R\$\s300,00 deixa .* no vermelho/);
  await expect(painel.getByRole('button', { name: 'Confirme o aviso' })).toBeDisabled();
  await painel.getByRole('button', { name: 'Cancelar' }).click(); // desistir não salva nada
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await expect(page.locator('#tx-list .tx').filter({ hasText: 'Meta: Reserva de emergência' })).toHaveCount(0);

  await irParaAba(page, 'Metas');
  await movimentar(page, 'Reserva de emergência', { acao: 'Guardar mais', valor: '300', aceitar: true });
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await expect(page.locator('#tx-list .tx').filter({ hasText: 'Meta: Reserva de emergência' })).toHaveCount(1);
});

test('gastar (e não guardar) além do que sobrou não gera esse aviso', async ({ page }) => {
  await mesComSobraDe200(page);
  await lancar(page, { tipo: 'Despesa', valor: '500', categoria: 'lazer', descricao: 'Viagem' });
  expect(avisos).toEqual([]);
  await expect(page.locator('#tx-list .tx').filter({ hasText: 'Viagem' })).toHaveCount(1);
});

test('sem renda registrada, não há o que comparar e não avisa', async ({ page }) => {
  await lancar(page, { tipo: 'Despesa', valor: '300', categoria: 'investimentos', descricao: 'Aporte' });
  expect(avisos).toEqual([]);
  await expect(page.locator('#tx-list .tx').filter({ hasText: 'Aporte' })).toHaveCount(1);
});
