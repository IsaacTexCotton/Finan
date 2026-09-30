const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Visual da tela Orçamento: cada envelope é um bloco legível, com o selo de status na linha do nome,
// campo de limite fácil de tocar, grupos separados e o aviso da renda em destaque.
// Dados de exemplo: "Faltam R$ 290,00 sem destino" (aviso amarelo) e Mercado estourado.

async function abrir(page, largura) {
  await page.setViewportSize({ width: largura, height: 900 });
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  await page.getByRole('tab', { name: 'Orçamento' }).click();
}

const linhaDe = (page, categoria) => page.locator('.budget-row').filter({ has: page.getByLabel(`Limite para ${categoria}`) });

test.describe('no celular (390px)', () => {
  test.beforeEach(async ({ page }) => abrir(page, 390));

  test('o selo de status fica na mesma linha do nome da categoria', async ({ page }) => {
    const linha = linhaDe(page, 'Mercado');
    const nome = await linha.locator('.cat-name').boundingBox();
    const selo = await linha.locator('.badge').boundingBox();
    expect(Math.abs(selo.y - nome.y), 'selo e nome na mesma linha').toBeLessThan(20);
    expect(selo.x, 'o selo fica à direita do nome').toBeGreaterThan(nome.x + nome.width * 0.5);
  });

  test('o campo de limite ocupa boa parte da linha, tem alvo de toque e rótulo visível', async ({ page }) => {
    const linha = linhaDe(page, 'Mercado');
    const campo = await linha.getByLabel('Limite para Mercado').boundingBox();
    const caixa = await linha.boundingBox();
    expect(campo.width).toBeGreaterThan(caixa.width * 0.5);
    expect(campo.height).toBeGreaterThanOrEqual(44);
    await expect(linha).toContainText('Limite mensal (R$)');
  });

  test('os envelopes são separados e os grupos têm respiro entre si', async ({ page }) => {
    const borda = await linhaDe(page, 'Mercado').evaluate((el) => getComputedStyle(el).borderBottomWidth);
    expect(borda, 'linha entre um envelope e o seguinte').not.toBe('0px');

    const titulos = page.locator('.budget-group h3');
    await expect(titulos).toHaveText(['Essenciais', 'Estilo de vida', 'Futuro']);
    const ultimaLinhaDoGrupo = await page.locator('.budget-group').first().locator('.budget-row').last().boundingBox();
    const segundoTitulo = await titulos.nth(1).boundingBox();
    expect(segundoTitulo.y - (ultimaLinhaDoGrupo.y + ultimaLinhaDoGrupo.height), 'espaço acima do título do grupo').toBeGreaterThanOrEqual(16);

    const aviso = await page.locator('.notice').boundingBox();
    const primeiroTitulo = await titulos.first().boundingBox();
    expect(primeiroTitulo.y - (aviso.y + aviso.height), 'espaço entre o aviso e o primeiro grupo').toBeGreaterThanOrEqual(8);
  });

  test('cada grupo mostra o teto e o que foi distribuído, cada um em uma linha própria', async ({ page }) => {
    const grupo = page.locator('.budget-group').first();
    await expect(grupo.locator('.budget-sum')).toContainText(/Teto do balde: R\$\s[\d.]+,\d{2} \(\d+% da renda\)/);
    await expect(grupo.locator('.budget-room')).toContainText(/Distribuído nos limites: R\$\s[\d.]+,\d{2}/);
    const teto = await grupo.locator('.budget-sum').boundingBox();
    const distribuido = await grupo.locator('.budget-room').boundingBox();
    expect(distribuido.y, 'o distribuído fica abaixo do teto, em outra linha').toBeGreaterThan(teto.y + teto.height - 1);
  });

  test('o aviso da renda tem fundo colorido, além do texto', async ({ page }) => {
    await expect(page.locator('.notice.warn')).toContainText('sem destino');
    const fundo = await page.locator('.notice.warn').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(fundo).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test('no PC (1280px) o limite fica ao lado do envelope e a linha é compacta', async ({ page }) => {
  await abrir(page, 1280);
  const linha = linhaDe(page, 'Mercado');
  const info = await linha.locator('.budget-info').boundingBox();
  const campo = await linha.getByLabel('Limite para Mercado').boundingBox();
  expect(campo.x, 'campo à direita').toBeGreaterThan(info.x + info.width);
  expect((await linha.boundingBox()).height, 'linha compacta').toBeLessThan(120);
});

test('em tela estreita (320px) a tela Orçamento não rola para o lado', async ({ page }) => {
  await abrir(page, 320);
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sobra).toBeLessThanOrEqual(0);
});
