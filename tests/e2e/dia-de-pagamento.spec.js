const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// "Você pode gastar hoje": por padrão conta até o fim do mês. Quem tem renda estável e recebe
// no N-ésimo dia útil informa esse dia e o valor passa a durar até o próximo pagamento.
// Hoje fixo em 20/09/2026; o 5º dia útil de setembro é 07/09 e o de outubro é 07/10 (17 dias).

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
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

const pode = (page) => page.locator('#allowance');

test('sem informar o dia de pagamento, conta até o fim do mês', async ({ page }) => {
  await expect(pode(page)).toContainText(/R\$\s40,90/); // (600 − 150) ÷ 11 dias, de 20 a 30/09
  await expect(pode(page)).toContainText('próximos 11 dias');
});

test('com o 5º dia útil, dura até o próximo pagamento e só conta os gastos do ciclo', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await page.getByLabel('Em que dia útil você recebe?').selectOption('5');
  await expect(page.getByRole('status')).toContainText('Dia de pagamento atualizado');

  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(pode(page)).toContainText(/R\$\s29,41/); // (600 − 100) ÷ 17 dias; o gasto de 02/09 é do ciclo anterior
  await expect(pode(page)).toContainText('até o próximo pagamento');
  await expect(pode(page)).toContainText('07/10');
  await expect(pode(page)).toContainText('17 dias');
});

test('renda variável continua contando até o fim do mês', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await page.getByLabel('Em que dia útil você recebe?').selectOption('5');
  await page.getByLabel('Seu tipo de renda').selectOption('variavel');
  await expect(page.getByLabel('Em que dia útil você recebe?')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(pode(page)).toContainText(/R\$\s40,90/);
  await expect(pode(page)).toContainText('próximos 11 dias');
});
