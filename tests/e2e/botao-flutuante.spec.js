const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// A ação mais usada ("+ Lançar") fica sempre no mesmo canto, ao alcance do polegar,
// em qualquer aba e em qualquer ponto da rolagem.

const ABAS = ['Painel', 'Lançamentos', 'Orçamento', 'Metas', 'Método'];

async function caixaDoBotao(page) {
  return page.getByRole('button', { name: '+ Lançar' }).boundingBox();
}

for (const largura of [320, 390, 1280]) {
  test(`o "+ Lançar" fica no canto inferior direito, em todas as abas, em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 800 });
    await page.goto(APP);
    let primeira;
    for (const aba of ABAS) {
      await page.getByRole('tab', { name: aba }).click();
      const caixa = await caixaDoBotao(page);
      primeira = primeira || caixa;
      expect(800 - (caixa.y + caixa.height), `${aba}: perto do rodapé`).toBeLessThanOrEqual(32);
      expect(800 - (caixa.y + caixa.height), `${aba}: não cola na borda`).toBeGreaterThanOrEqual(8);
      expect(largura - (caixa.x + caixa.width), `${aba}: perto da borda direita`).toBeLessThanOrEqual(32);
      expect(caixa.height, `${aba}: alvo de toque`).toBeGreaterThanOrEqual(44);
      expect(Math.abs(caixa.x - primeira.x) + Math.abs(caixa.y - primeira.y), `${aba}: mesmo lugar nas abas`).toBeLessThanOrEqual(1);
    }
  });
}

test('o "+ Lançar" não sai do lugar quando a página rola', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Método' }).click();
  const antes = await caixaDoBotao(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const depois = await caixaDoBotao(page);
  expect(depois.y).toBeCloseTo(antes.y, 0);
  expect(depois.x).toBeCloseTo(antes.x, 0);
});

test('o "+ Lançar" não esconde o fim do conteúdo: dá para rolar até ele ficar livre', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Método' }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const botao = await caixaDoBotao(page);
  const fimDoConteudo = await page.evaluate(() => {
    const filhos = [...document.querySelectorAll('main > section:not([hidden]) > *')];
    return Math.max(...filhos.map((f) => f.getBoundingClientRect().bottom));
  });
  expect(fimDoConteudo, 'o último bloco termina acima do botão').toBeLessThanOrEqual(botao.y);
});

test('o topo não tem mais o "+ Lançar": só o título e o mês', async ({ page }) => {
  await page.goto(APP);
  await expect(page.locator('header.topbar').getByRole('button', { name: '+ Lançar' })).toHaveCount(0);
});

test('tocar no "+ Lançar" de qualquer aba abre o formulário em Despesa', async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Metas' }).click();
  await page.getByRole('button', { name: '+ Lançar' }).click();
  await expect(page.locator('#tx-form')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Despesa' })).toBeChecked();
});
