const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { APP, irParaAba, movimentar, painelMover } = require('./ajuda');

// Painel "Movimentar" da meta: troca as janelas nativas (prompt/confirm) por um painel na tela.
// Dados de exemplo: Reserva de emergência R$ 4.500,00 de R$ 18.000,00; Viagem de férias
// R$ 1.200,00 de R$ 6.000,00; Guardado do Painel = R$ 900,00.

const meta = (page, nome) => page.locator('#goal-list .goal').filter({ hasText: nome });
const botao = (page, nome) => meta(page, nome).getByRole('button', { name: /Movimentar/ });

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => { throw new Error(`janela nativa inesperada: ${d.message()}`); }); // nada de prompt/confirm
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  await irParaAba(page, 'Metas');
});

test('cada meta tem um botão Movimentar com o nome da meta', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Movimentar a meta Viagem de férias' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Movimentar a meta Reserva de emergência' })).toHaveCount(1);
});

test('abre o painel com "Guardar mais" marcada e o foco no título; Cancelar fecha e devolve o foco', async ({ page }) => {
  await botao(page, 'Viagem de férias').click();
  const painel = painelMover(page);
  await expect(painel).toBeVisible();
  await expect(painel.getByRole('heading', { name: /Movimentar .Viagem de férias./ })).toBeFocused();
  await expect(painel.getByRole('radio', { name: 'Guardar mais' })).toBeChecked();
  await painel.getByRole('button', { name: 'Cancelar' }).click();
  await expect(painel).toBeHidden();
  await expect(botao(page, 'Viagem de férias')).toBeFocused();
});

test('Esc e o toque fora do painel fecham sem mudar nada', async ({ page }) => {
  await botao(page, 'Viagem de férias').click();
  await page.keyboard.press('Escape');
  await expect(painelMover(page)).toBeHidden();
  await expect(botao(page, 'Viagem de férias')).toBeFocused();
  await botao(page, 'Viagem de férias').click();
  await page.mouse.click(5, 5); // camada escura
  await expect(painelMover(page)).toBeHidden();
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.200,00 de R\$\s6\.000,00/);
});

test('Confirmar fica desabilitado e diz "Preencha o valor" até haver um valor válido', async ({ page }) => {
  await botao(page, 'Viagem de férias').click();
  const painel = painelMover(page);
  const ok = painel.getByRole('button', { name: 'Preencha o valor' });
  await expect(ok).toBeDisabled();
  await painel.getByLabel('Valor a guardar').fill('abc');
  await expect(ok).toBeDisabled();
  await painel.getByLabel('Valor a guardar').fill('300');
  await expect(painel.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
  await painel.getByLabel('Valor a guardar').fill('');
  await expect(painel.getByRole('button', { name: 'Preencha o valor' })).toBeDisabled();
});

test('guardar mais: aumenta a meta e o Guardado do Painel, sem janela nativa', async ({ page }) => {
  await movimentar(page, 'Viagem de férias', { acao: 'Guardar mais', valor: '300' });
  await expect(painelMover(page)).toBeHidden();
  await expect(page.getByRole('status')).toContainText(/R\$\s300,00 adicionados à meta/);
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s1\.500,00 de R\$\s6\.000,00/);
  await expect(botao(page, 'Viagem de férias')).toBeFocused();
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(page.locator('#summary-cards .card').filter({ hasText: 'Guardado' })).toContainText(/R\$\s1\.200,00/);
});

test('guardar mais além do que sobrou pede para marcar o aviso antes de confirmar', async ({ page }) => {
  const painel = await movimentar(page, 'Viagem de férias', { acao: 'Guardar mais', valor: '99999', confirmar: false });
  await expect(painel).toContainText(/no vermelho/);
  await expect(painel.getByRole('button', { name: 'Confirme o aviso' })).toBeDisabled();
  await painel.getByLabel('Entendo, quero continuar assim.').check();
  await painel.getByRole('button', { name: 'Confirmar' }).click();
  await expect(painel).toBeHidden();
  await expect(meta(page, 'Viagem de férias')).toContainText(/R\$\s101\.199,00 de/);
});

test.describe('acessibilidade e tela estreita', () => {
  for (const acao of ['Guardar mais', 'Transferir para outra meta', 'Tirar e usar em outra coisa']) {
    test(`o painel aberto em "${acao}" não tem violações do axe`, async ({ page }) => {
      const painel = await movimentar(page, 'Reserva de emergência', { acao, valor: '99999', confirmar: false }); // mostra erro/aviso também
      await expect(painel).toBeVisible();
      const resultado = await new AxeBuilder({ page }).include('#mover-meta').analyze();
      expect(resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
    });
  }

  test('em 320px o painel cabe sem rolagem para o lado e os botões ficam à vista', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const painel = await movimentar(page, 'Reserva de emergência', { acao: 'Tirar e usar em outra coisa', valor: '500', confirmar: false });
    const caixa = await painel.boundingBox();
    expect(caixa.x).toBeGreaterThanOrEqual(0);
    expect(caixa.x + caixa.width).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(painel.getByRole('button', { name: 'Confirme o aviso' })).toBeInViewport(); // ainda falta marcar a caixa
  });
});
