const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// O "Você pode gastar hoje" nunca passa do que sobrou no mês: guardar muito baixa o valor.
// Hoje fixo em 20/09/2026 (11 dias até o fim do mês). Salário R$ 3.000, envelope de mercado
// de R$ 600 com R$ 100 gastos: os envelopes têm R$ 500 livres.

async function abrir(page, guardadoEmCentavos) {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript((guardado) => {
    localStorage.setItem('finan:data', JSON.stringify({
      version: 1,
      transactions: [
        { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' },
        { id: 'g1', type: 'expense', categoryId: 'mercado', amount: 10000, date: '2026-09-10', description: '' },
        { id: 'g2', type: 'expense', categoryId: 'metas', amount: guardado, date: '2026-09-12', description: 'Meta: Viagem', goalId: 'meta1' },
      ],
      goals: [{ id: 'meta1', name: 'Viagem', target: 600000, saved: 0, deadline: '' }],
      budgets: { mercado: 60000 },
    }));
  }, guardadoEmCentavos);
  await page.goto(APP);
}

const cartao = (page) => page.locator('#allowance');

test('sobrando mais do que os envelopes têm, vale o envelope e mostra quanto já guardou', async ({ page }) => {
  await abrir(page, 200000); // sobrou R$ 900
  await expect(cartao(page)).toContainText(/R\$\s45,45/); // R$ 500 ÷ 11 dias
  await expect(cartao(page)).toContainText(/Você já guardou R\$\s2\.000,00 neste mês/);
  await expect(cartao(page)).not.toContainText('Limitado ao que sobrou');
});

test('guardando tanto que sobra menos do que os envelopes, vale o que sobrou e o cartão explica', async ({ page }) => {
  await abrir(page, 270000); // sobrou R$ 200
  await expect(cartao(page)).toContainText(/R\$\s18,18/); // R$ 200 ÷ 11 dias
  await expect(cartao(page)).toContainText(/Limitado ao que sobrou no mês \(R\$\s200,00\)/);
  await expect(cartao(page)).toContainText(/Os envelopes ainda têm R\$\s500,00/);
});

test('com o dia de pagamento informado, o teto vale para o ciclo do salário', async ({ page }) => {
  await abrir(page, 270000);
  await page.getByRole('tab', { name: 'Metas' }).click();
  await page.getByLabel('Em que dia útil você recebe?').selectOption('5');
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(cartao(page)).toContainText(/R\$\s11,76/); // R$ 200 ÷ 17 dias
  await expect(cartao(page)).toContainText('Limitado ao que sobrou');
});
