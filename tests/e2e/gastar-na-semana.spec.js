const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Junto do "Você pode gastar hoje", o cartão diz quanto dá para gastar até domingo.
// Hoje fixo em segunda-feira, 14/09/2026: a semana tem 7 dias.

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-14T12:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('finan:data', JSON.stringify({
      version: 1,
      transactions: [
        { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' },
        { id: 'g1', type: 'expense', categoryId: 'mercado', amount: 5000, date: '2026-09-02', description: '' },
        { id: 'g2', type: 'expense', categoryId: 'mercado', amount: 10000, date: '2026-09-10', description: '' },
      ],
      budgets: { mercado: 60000 },
    }));
  });
  await page.goto(APP);
});

const cartao = (page) => page.locator('#allowance');

test('mostra o que dá para gastar hoje e até domingo, contando até o fim do mês', async ({ page }) => {
  await expect(cartao(page)).toContainText(/R\$\s26,47/); // (600 − 150) ÷ 17 dias, de 14 a 30/09
  await expect(cartao(page)).toContainText(/Nesta semana, até domingo \(7 dias\): R\$\s185,29/); // 450 × 7 ÷ 17
});

test('com o dia de pagamento informado, a semana usa o valor até o próximo pagamento', async ({ page }) => {
  await page.getByRole('tab', { name: 'Metas' }).click();
  await page.getByLabel('Em que dia útil você recebe?').selectOption('5');
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(cartao(page)).toContainText(/R\$\s21,73/); // (600 − 100) ÷ 23 dias
  await expect(cartao(page)).toContainText(/Nesta semana, até domingo \(7 dias\): R\$\s152,17/); // 500 × 7 ÷ 23
});
