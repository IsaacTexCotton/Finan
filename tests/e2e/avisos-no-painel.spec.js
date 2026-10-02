const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// No máximo 3 avisos à vista no Painel (decisão tomada com o Isaac ausente, 02/10/2026): os mais
// importantes (a lista já vem por prioridade) ficam à vista; o resto fica recolhido em "Ver mais N
// avisos", para o Painel não virar uma parede de alertas e nenhum alerta se perder.
// Hoje fixo em 10/09/2026, com um mês cheio de problemas (mais de 3 avisos).

const mes = (d) => `2026-09-${d}`;
const DADOS = {
  version: 1,
  transactions: [
    { id: 'a1', type: 'income', categoryId: 'salario', amount: 200000, date: mes('05'), description: '' },
    { id: 'a2', type: 'expense', categoryId: 'moradia', amount: 150000, date: mes('06'), description: '' },
    { id: 'a3', type: 'expense', categoryId: 'lazer', amount: 90000, date: mes('08'), description: '' },
    { id: 'a4', type: 'expense', categoryId: 'restaurantes', amount: 60000, date: mes('08'), description: '' },
    { id: 'b1', type: 'expense', categoryId: 'moradia', amount: 150000, date: '2026-08-06', description: '' },
    { id: 'b2', type: 'expense', categoryId: 'lazer', amount: 10000, date: '2026-08-08', description: '' },
  ],
  budgets: { lazer: 50000, restaurantes: 100000 },
};

async function abrir(page, dados) {
  await page.clock.setFixedTime(new Date('2026-09-10T12:00:00'));
  await page.addInitScript((d) => { if (!localStorage.getItem('finan:data')) localStorage.setItem('finan:data', JSON.stringify(d)); }, dados);
  await page.goto(APP);
}

const visiveis = (page) => page.locator('#insights > li');
const resto = (page) => page.locator('#insights-more');

test('com muitos avisos, só 3 ficam à vista e o resto vem em "Ver mais N avisos"', async ({ page }) => {
  await abrir(page, DADOS);
  await expect(visiveis(page)).toHaveCount(3);
  await expect(visiveis(page).first()).toContainText('gastou'); // o mais importante primeiro
  await expect(resto(page)).toBeVisible();
  const total = await resto(page).locator('li').count();
  expect(total).toBeGreaterThanOrEqual(1);
  await expect(resto(page).locator('summary')).toHaveText(`Ver mais ${total} ${total === 1 ? 'aviso' : 'avisos'}`);
});

test('tocar em "Ver mais" mostra os avisos que estavam recolhidos', async ({ page }) => {
  await abrir(page, DADOS);
  const sumario = resto(page).locator('summary');
  const escondido = resto(page).locator('li').first();
  await expect(escondido).toBeHidden();
  await sumario.click();
  await expect(escondido).toBeVisible();
  await expect(page.locator('#insights li, #insights-more li')).not.toHaveCount(3); // agora há mais de 3 à vista
});

test('com 3 avisos ou menos não aparece "Ver mais"', async ({ page }) => {
  await abrir(page, { version: 1, transactions: [{ id: 'x1', type: 'income', categoryId: 'salario', amount: 300000, date: mes('05'), description: '' }] });
  await expect(visiveis(page)).not.toHaveCount(0);
  await expect(resto(page)).toBeHidden();
});

test('o botão "Ver mais" tem alvo de toque de pelo menos 44px', async ({ page }) => {
  await abrir(page, DADOS);
  const caixa = await resto(page).locator('summary').boundingBox();
  expect(caixa.height).toBeGreaterThanOrEqual(44);
});

test('com 4 avisos, o botão diz "Ver mais 1 aviso" (singular)', async ({ page }) => {
  await abrir(page, {
    version: 1,
    transactions: [
      { id: 'u1', type: 'income', categoryId: 'salario', amount: 200000, date: mes('05'), description: '' },
      { id: 'u2', type: 'expense', categoryId: 'moradia', amount: 150000, date: mes('06'), description: '' },
      { id: 'u3', type: 'expense', categoryId: 'lazer', amount: 90000, date: mes('08'), description: '' },
    ],
  });
  await expect(visiveis(page)).toHaveCount(3);
  await expect(resto(page).locator('summary')).toHaveText('Ver mais 1 aviso');
});
