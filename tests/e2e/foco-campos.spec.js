const { test, expect } = require('@playwright/test');
const { APP, abrirDetalhes } = require('./ajuda');

// Campo focado: a própria borda fica azul e o contorno cola nela, formando um traço único.
// Antes havia três camadas (borda escura, vão branco, anel azul), o que poluía a tela.
// Botões, caixas de marcar e abas mantêm o anel afastado.

const AZUL_DO_FOCO = 'rgb(23, 78, 166)'; // --focus: #174ea6

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
});

const estilo = (locator) => locator.evaluate((el) => {
  const s = getComputedStyle(el);
  return { borda: s.borderTopColor, contorno: s.outlineColor, estilo: s.outlineStyle, espessura: parseFloat(s.outlineWidth), afastamento: s.outlineOffset };
});

for (const [nome, achar] of [
  ['campo de valor', (page) => page.locator('#tx-form').getByLabel('Valor (R$)')],
  ['lista de escolha (categoria)', (page) => page.locator('#tx-form').getByLabel('Categoria')],
  ['campo de texto (descrição)', (page) => page.locator('#tx-form').getByLabel('Descrição')],
]) {
  test(`${nome} focado tem borda azul e contorno colado, sem vão`, async ({ page }) => {
    const campo = achar(page);
    await abrirDetalhes(page.locator('#tx-form'));
    await campo.focus();
    const s = await estilo(campo);
    expect(s.borda, 'borda na cor do foco').toBe(AZUL_DO_FOCO);
    expect(s.contorno, 'contorno na cor do foco').toBe(AZUL_DO_FOCO);
    expect(s.estilo).toBe('solid');
    expect(s.espessura, 'o foco continua bem visível').toBeGreaterThanOrEqual(2);
    expect(s.afastamento, 'sem vão entre a borda e o contorno').toBe('0px');
  });
}

test('sem foco, o campo mantém a borda escura de sempre', async ({ page }) => {
  const s = await estilo(page.locator('#tx-form').getByLabel('Descrição'));
  expect(s.borda).not.toBe(AZUL_DO_FOCO);
});

test('botões e caixas de marcar mantêm o anel afastado', async ({ page }) => {
  await abrirDetalhes(page.locator('#tx-form')); // antes do teclado: um clique do mouse desligaria o anel
  await page.keyboard.press('Shift'); // usa o teclado: só assim o navegador mostra o anel em botões
  const botao = page.locator('#tx-form').getByRole('button', { name: 'Salvar' });
  await botao.focus();
  expect((await estilo(botao)).afastamento).toBe('2px');

  const caixa = page.locator('#tx-form').getByLabel(/Lançamento fixo/);
  await caixa.focus();
  expect((await estilo(caixa)).afastamento).toBe('2px');
});
