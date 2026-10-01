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

test('os 5 passos do Método são cartões numerados, com o título numa linha e a explicação embaixo', async ({ page }) => {
  const passos = page.locator('.steps > li');
  await expect(passos).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    const passo = passos.nth(i);
    const estilo = await passo.evaluate((li) => {
      const s = getComputedStyle(li);
      return { borda: parseFloat(s.borderTopWidth), raio: parseFloat(s.borderTopLeftRadius), marcador: s.listStyleType, numero: getComputedStyle(li, '::before').content, conta: s.counterIncrement };
    });
    expect(estilo.borda, `passo ${i + 1}: cartão com borda`).toBeGreaterThanOrEqual(1);
    expect(estilo.raio, `passo ${i + 1}: cantos arredondados`).toBeGreaterThan(0);
    expect(estilo.marcador, `passo ${i + 1}: sem marcador do navegador`).toBe('none');
    expect(estilo.numero, `passo ${i + 1}: mostra o número do passo`).toBe('counter(passo)'); // o navegador não resolve o contador aqui
    expect(estilo.conta, `passo ${i + 1}: o contador avança`).toContain('passo');
    const titulo = await passo.locator('strong').first().boundingBox();
    const caixa = await passo.boundingBox();
    expect(caixa.width - titulo.width, `passo ${i + 1}: o título ocupa a linha`).toBeLessThan(80);
  }
  const a = await passos.nth(0).boundingBox();
  const b = await passos.nth(1).boundingBox();
  expect(b.y - (a.y + a.height), 'espaço entre os cartões').toBeGreaterThanOrEqual(8);
});

test('a lista de passos continua sendo lista para o leitor de tela', async ({ page }) => {
  await expect(page.locator('.steps')).toHaveAttribute('role', 'list');
});

test('o texto sobre dívidas fica recolhido num "Como funciona" que abre ao tocar', async ({ page }) => {
  const texto = page.getByText(/Coloque quitação de dívidas como prioridade/);
  await expect(texto).toBeHidden();
  await page.locator('details.how').filter({ hasText: 'Tem dívidas com juros altos?' }).locator('summary').click();
  await expect(texto).toBeVisible();
});
