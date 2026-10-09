const { test, expect } = require('@playwright/test');
const { APP, carregarExemplo } = require('./ajuda');

// O app é para quem não entende de finanças: toda palavra do método é explicada em linguagem
// simples, no lugar onde aparece.

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
});

test('Painel explica o que são os três baldes e o que significa 50/30/20', async ({ page }) => {
  const baldes = page.locator('#tab-painel .panel').filter({ hasText: 'Seus baldes' });
  await expect(baldes).toContainText('Essenciais (o que você precisa para viver)');
  await expect(baldes).toContainText('Estilo de vida (o que é opcional)');
  await expect(baldes).toContainText('Futuro (o que você guarda ou investe)');
  await expect(baldes).toContainText('até 50% da renda para Essenciais, até 30% para Estilo de vida e pelo menos 20% para o Futuro');
  await expect(page.locator('#plan-info')).toContainText('essenciais / estilo de vida / futuro');
});

test('Orçamento explica o que é envelope, fixa e variável sem usar "base zero"', async ({ page }) => {
  await page.getByRole('tab', { name: 'Orçamento' }).click();
  const aba = page.getByRole('tabpanel', { name: 'Orçamento' });
  await expect(aba).toContainText('Cada categoria pode ter um envelope: o limite de quanto você quer gastar nela por mês');
  await expect(aba).toContainText('Fixa: valor que quase não muda');
  await expect(aba).toContainText('Variável: muda todo mês');
  await expect(page.locator('body')).not.toContainText(/base zero/i);
});

test('as etiquetas das categorias dizem "variável", com acento', async ({ page }) => {
  await page.getByRole('tab', { name: 'Orçamento' }).click();
  const etiquetas = await page.locator('#budget-table .tag').allInnerTexts();
  expect(etiquetas).toContain('variável');
  expect(etiquetas).toContain('fixa');
  expect(etiquetas).not.toContain('variavel');
});

test('avisos do orçamento falam de "destino" para cada real, não de "função"', async ({ page }) => {
  await carregarExemplo(page);
  await page.getByRole('tab', { name: 'Orçamento' }).click();
  await expect(page.locator('#zero-based')).toContainText(/sem destino/);
  await expect(page.locator('#zero-based')).not.toContainText(/função/);
});
