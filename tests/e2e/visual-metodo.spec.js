const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// Visual da tela Método: checklist da revisão semanal legível e fácil de tocar.

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await irParaAba(page, 'Método');
});

test('a lista da revisão semanal não mostra marcadores soltos', async ({ page }) => {
  const estilos = await page.locator('#review-list').evaluate((ul) => ({
    lista: getComputedStyle(ul).listStyleType,
    item: getComputedStyle(ul.querySelector('li')).listStyleType,
  }));
  expect(estilos.lista).toBe('none');
  expect(estilos.item).toBe('none');
});

test('cada item da revisão é uma linha com alvo de toque, caixa e texto na mesma altura', async ({ page }) => {
  const itens = page.locator('#review-list li:has(input)');
  const n = await itens.count();
  expect(n).toBeGreaterThanOrEqual(5);
  for (let i = 0; i < n; i++) {
    const linha = await itens.nth(i).boundingBox();
    const caixa = await itens.nth(i).locator('input').boundingBox();
    const texto = await itens.nth(i).locator('label').boundingBox();
    expect(linha.height, `item ${i + 1}: altura de toque`).toBeGreaterThanOrEqual(44);
    expect(caixa.width, `item ${i + 1}: caixa fácil de tocar`).toBeGreaterThanOrEqual(24);
    // a caixa fica alinhada ao início do texto (não flutua no meio de um parágrafo)
    const centroCaixa = caixa.y + caixa.height / 2;
    expect(centroCaixa, `item ${i + 1}: caixa dentro da linha`).toBeGreaterThanOrEqual(texto.y);
    expect(centroCaixa, `item ${i + 1}: caixa dentro da linha`).toBeLessThanOrEqual(texto.y + texto.height);
  }
});

test('os itens da revisão ficam separados por um filete e não há recuo do marcador', async ({ page }) => {
  const itens = page.locator('#review-list li:has(input)');
  const recuo = await page.locator('#review-list').evaluate((ul) => parseFloat(getComputedStyle(ul).paddingLeft));
  expect(recuo, 'sem recuo de marcador').toBe(0);
  const filete = await itens.first().evaluate((li) => parseFloat(getComputedStyle(li).borderBottomWidth));
  expect(filete, 'filete entre os itens').toBeGreaterThanOrEqual(1);
});
