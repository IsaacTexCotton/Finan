const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Nenhum item da barra pode ficar escondido: a pessoa não deve precisar adivinhar que dá para
// deslizar. A barra de baixo mostra Painel, Lançamentos, Orçamento e "Mais" (que guarda Metas e
// Método), sempre inteiros, de 320 a 1280px (decisão do Isaac, 01/10/2026).

const ITENS = ['Painel', 'Lançamentos', 'Orçamento', 'Mais'];
const item = (page, nome) => (nome === 'Mais' ? page.getByRole('button', { name: 'Mais' }) : page.getByRole('tab', { name: nome }));

for (const largura of [320, 360, 390, 412, 768, 1280]) {
  test(`os 4 itens da barra aparecem inteiros, sem deslizar, em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 800 });
    await page.goto(APP);

    for (const nome of ITENS) {
      const caixa = await item(page, nome).boundingBox();
      expect(caixa.x, `${nome}: começa dentro da tela`).toBeGreaterThanOrEqual(0);
      expect(caixa.x + caixa.width, `${nome}: termina dentro da tela`).toBeLessThanOrEqual(largura + 0.5);
      expect(caixa.height, `${nome}: altura de toque`).toBeGreaterThanOrEqual(44);
      expect(caixa.width, `${nome}: largura de toque`).toBeGreaterThanOrEqual(44);
    }

    const rolagem = await page.evaluate(() => {
      const nav = document.querySelector('nav.tabs');
      return { barra: nav.scrollWidth - nav.clientWidth, pagina: document.documentElement.scrollWidth - innerWidth };
    });
    expect(rolagem.barra, 'a barra não precisa de rolagem').toBeLessThanOrEqual(0);
    expect(rolagem.pagina, 'a página não rola na horizontal').toBeLessThanOrEqual(0);
  });
}

test('nenhum texto da barra é cortado pelo botão, com qualquer aba ativa', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(APP);
  for (const ativa of ['Painel', 'Lançamentos', 'Orçamento', 'Mais']) {
    await item(page, ativa).click();
    if (ativa === 'Mais') await page.getByRole('tab', { name: 'Metas' }).click();
    const cortados = await page.locator('nav.tabs button:visible').evaluateAll((botoes) => botoes.filter((b) => b.scrollWidth > b.clientWidth).map((b) => b.textContent.trim()));
    expect(cortados, `texto maior que o botão (item atual: ${ativa})`).toEqual([]);
  }
});

test('trocar de aba não muda o tamanho dos itens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(APP);
  const medidas = async () => Promise.all(ITENS.map(async (n) => Math.round((await item(page, n).boundingBox()).width)));
  const antes = await medidas();
  await item(page, 'Lançamentos').click();
  expect(await medidas()).toEqual(antes);
  await item(page, 'Mais').click();
  await page.getByRole('tab', { name: 'Método' }).click();
  expect(await medidas()).toEqual(antes);
});
