const { test, expect } = require('@playwright/test');
const { APP, carregarExemplo } = require('./ajuda');

// Consultar o Painel tem que ser rápido: na primeira tela do celular a pessoa vê os quatro
// números e quanto pode gastar hoje, sem rolar e sem ler texto de ajuda.

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await carregarExemplo(page);
});

test('os quatro números e o "pode gastar hoje" aparecem na primeira tela do celular', async ({ page }) => {
  const altura = page.viewportSize().height;
  const blocos = [
    page.locator('#summary-cards .card').filter({ hasText: 'Receitas' }),
    page.locator('#summary-cards .card').filter({ hasText: 'Gastos' }),
    page.locator('#summary-cards .card').filter({ hasText: 'Guardado' }),
    page.locator('#summary-cards .card').filter({ hasText: 'Sobrou' }),
    page.locator('#allowance'),
  ];
  for (const bloco of blocos) {
    const caixa = await bloco.boundingBox();
    expect(caixa.y + caixa.height, 'termina antes do fim da tela').toBeLessThanOrEqual(altura);
  }
});
