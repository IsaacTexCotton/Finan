const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Nenhuma aba pode ficar escondida: a pessoa não deve precisar adivinhar que dá para deslizar.

for (const largura of [320, 360, 390, 412, 768, 1280]) {
  test(`as 5 abas aparecem inteiras, sem deslizar, em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 800 });
    await page.goto(APP);

    for (const nome of ['Painel', 'Lançamentos', 'Orçamento', 'Metas', 'Método']) {
      const caixa = await page.getByRole('tab', { name: nome }).boundingBox();
      expect(caixa.x, `${nome}: começa dentro da tela`).toBeGreaterThanOrEqual(0);
      expect(caixa.x + caixa.width, `${nome}: termina dentro da tela`).toBeLessThanOrEqual(largura + 0.5);
      expect(caixa.height, `${nome}: altura de toque`).toBeGreaterThanOrEqual(44);
      expect(caixa.width, `${nome}: largura de toque`).toBeGreaterThanOrEqual(44);
    }

    const rolagem = await page.evaluate(() => {
      const nav = document.querySelector('nav.tabs');
      return { abas: nav.scrollWidth - nav.clientWidth, pagina: document.documentElement.scrollWidth - innerWidth };
    });
    expect(rolagem.abas, 'a barra de abas não precisa de rolagem').toBeLessThanOrEqual(0);
    expect(rolagem.pagina, 'a página não rola na horizontal').toBeLessThanOrEqual(0);
  });
}

test('nenhum texto de aba é cortado pelo botão, com qualquer aba ativa', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(APP);
  for (const ativa of ['Painel', 'Lançamentos', 'Orçamento', 'Metas', 'Método']) {
    await page.getByRole('tab', { name: ativa }).click();
    const cortados = await page.getByRole('tab').evaluateAll((abas) => abas.filter((a) => a.scrollWidth > a.clientWidth).map((a) => a.textContent.trim()));
    expect(cortados, `abas com texto maior que o botão (aba ativa: ${ativa})`).toEqual([]);
  }
});

test('trocar de aba não muda o tamanho das abas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(APP);
  const medidas = async () => page.getByRole('tab').evaluateAll((abas) => abas.map((a) => Math.round(a.getBoundingClientRect().width)));
  const antes = await medidas();
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  expect(await medidas()).toEqual(antes);
});
