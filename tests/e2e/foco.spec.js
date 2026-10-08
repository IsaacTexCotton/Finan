const { test, expect } = require('@playwright/test');
const { APP, lancar, irParaAba } = require('./ajuda');

// Quem usa teclado ou leitor de tela precisa continuar no mesmo lugar depois de cada ação.
// Antes, a tela era redesenhada e o foco voltava para o início da página.

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? '300' : undefined));
  await page.goto(APP);
});

test.describe('o controle continua lá depois do redesenho', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  });

  test('Orçamento: digitar um limite e apertar Tab leva ao campo seguinte', async ({ page }) => {
    await page.getByRole('tab', { name: 'Orçamento' }).click();
    await page.getByLabel('Limite para Mercado').fill('500');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Limite para Transporte')).toBeFocused();
    await expect(page.getByLabel('Limite para Mercado')).toHaveValue('500,00'); // e o limite foi salvo
  });

  test('Método: marcar um item da revisão semanal com Espaço mantém o foco nele', async ({ page }) => {
    await irParaAba(page, 'Método');
    const item = page.getByLabel(/Conferi se todos os gastos/);
    await item.focus();
    await page.keyboard.press('Space');
    await expect(item).toBeChecked();
    await expect(item).toBeFocused();
  });

  test('Metas: "Movimentar" devolve o foco ao mesmo botão depois de guardar, só com o teclado', async ({ page }) => {
    await irParaAba(page, 'Metas');
    const botao = page.locator('#goal-list .goal').first().getByRole('button', { name: /Movimentar/ });
    await botao.focus();
    await page.keyboard.press('Enter');
    await page.getByLabel('Valor a guardar').fill('300');
    await page.keyboard.press('Enter'); // envia o painel
    await expect(page.getByRole('status')).toContainText(/R\$\s300,00 adicionados à meta/);
    await expect(page.locator('#goal-list .goal').first().getByRole('button', { name: /Movimentar/ })).toBeFocused();
  });

  test('Lançamentos: excluir pelo teclado leva o foco ao lançamento que ocupou o lugar', async ({ page }) => {
    await page.getByRole('tab', { name: 'Lançamentos' }).click();
    const antes = await page.locator('#tx-list .tx').count();
    await page.locator('#tx-list .tx').first().getByRole('button', { name: 'Excluir' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tx-list .tx')).toHaveCount(antes - 1);
    await expect(page.locator('#tx-list .tx').first().getByRole('button', { name: 'Excluir' })).toBeFocused();
  });

  test('Metas: trocar o tipo de renda com as setas mantém o foco na lista', async ({ page }) => {
    await irParaAba(page, 'Metas');
    const lista = page.getByLabel('Seu tipo de renda');
    await lista.focus();
    await page.keyboard.press('ArrowDown');
    await expect(lista).toHaveValue('variavel');
    await expect(lista).toBeFocused();
  });
});

test.describe('o controle em que a pessoa estava some', () => {
  test('excluir o último lançamento leva o foco ao título da lista', async ({ page }) => {
    await lancar(page, { tipo: 'Despesa', valor: '10', categoria: 'mercado', descricao: 'Só este' });
    await page.locator('#tx-list .tx').first().getByRole('button', { name: 'Excluir' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tx-list .tx')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Lançamentos do mês' })).toBeFocused();
  });

  test('criar a meta de reserva (o botão some) leva o foco ao título da reserva', async ({ page }) => {
    await lancar(page, { tipo: 'Despesa', valor: '1000', categoria: 'moradia', descricao: 'Aluguel' });
    await irParaAba(page, 'Metas');
    await page.getByRole('button', { name: 'Criar meta de reserva' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#goal-list .goal')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: /Reserva de emergência/ })).toBeFocused();
  });

  test('carregar os dados de exemplo pelo teclado leva o foco ao início do Painel', async ({ page }) => {
    await page.getByRole('button', { name: 'Ver com dados de exemplo' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Seus baldes' })).toBeFocused();
  });
});
