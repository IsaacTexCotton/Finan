const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Identidade visual: símbolo "F com moeda". O ícone do app precisa ter o símbolo dentro da área segura
// (círculo central de 40% da largura) para o Android recortar as bordas sem cortar o F.

const FUNDO = [8, 76, 69]; // #084c45
const MOEDA = [95, 211, 154]; // #5fd39a

/** Abre o PNG numa página e devolve, por pixel, se está fora/dentro do círculo seguro e se difere do fundo. */
async function lerIcone(page, arquivo) {
  const dados = fs.readFileSync(path.join(__dirname, '..', '..', 'icons', arquivo)).toString('base64');
  await page.goto('about:blank');
  return page.evaluate(async ({ dados, FUNDO, MOEDA }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${dados}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const r = 0.4 * c.width;
    let foraDoCirculo = 0; let moedas = 0; let brancos = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        const [R, G, B] = [data[i], data[i + 1], data[i + 2]];
        const fundo = Math.abs(R - FUNDO[0]) < 6 && Math.abs(G - FUNDO[1]) < 6 && Math.abs(B - FUNDO[2]) < 6;
        const moeda = Math.abs(R - MOEDA[0]) < 8 && Math.abs(G - MOEDA[1]) < 8 && Math.abs(B - MOEDA[2]) < 8;
        if (moeda) moedas++;
        if (R > 245 && G > 245 && B > 245) brancos++;
        const fora = (x - c.width / 2) ** 2 + (y - c.height / 2) ** 2 > r * r;
        if (fora && !fundo) foraDoCirculo++;
      }
    }
    return { largura: c.width, foraDoCirculo, moedas, brancos };
  }, { dados, FUNDO, MOEDA });
}

for (const arquivo of ['icon-maskable-512.png', 'icon-512.png', 'icon-192.png', 'apple-touch-icon.png']) {
  test(`${arquivo}: o F branco e a moeda de conquista aparecem, e tudo fora da área segura é só o fundo`, async ({ page }) => {
    const r = await lerIcone(page, arquivo);
    expect(r.moedas, 'a moeda verde-clara').toBeGreaterThan(r.largura);
    expect(r.brancos, 'o F branco').toBeGreaterThan(r.largura * 2);
    expect(r.foraDoCirculo, 'pixels do símbolo fora do círculo seguro').toBe(0);
  });
}

test('o topo mostra a marca desenhada (sem emoji), com o nome Finan acessível, em 320 e em 1280', async ({ page }) => {
  for (const largura of [320, 1280]) {
    await page.setViewportSize({ width: largura, height: 800 });
    await page.goto(APP);
    const marca = page.locator('.topbar .brand svg.marca');
    await expect(marca, `a ${largura}px`).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finan');
    expect(await page.locator('.topbar').innerText()).not.toContain('💰');
    const moeda = await marca.locator('circle').evaluate((el) => getComputedStyle(el).fill);
    expect(moeda).toBe('rgb(95, 211, 154)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral a ${largura}px`).toBe(true);
    const topo = await page.locator('.topbar').boundingBox();
    const caixa = await marca.boundingBox();
    expect(caixa.x).toBeGreaterThanOrEqual(0);
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(topo.y + topo.height);
  }
});

test('o nome Finan só aparece escrito a partir de telas largas, e a marca fica sempre', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(APP);
  await expect(page.locator('.topbar .brand-nome')).not.toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('.topbar .brand-nome')).toBeInViewport();
});
