const { test, expect } = require('@playwright/test');
const { APP, abrirDetalhes } = require('./ajuda');

// Três ações da tela que não tinham nenhum teste no navegador: próximo mês, cancelar edição e
// trazer os lançamentos fixos do mês anterior. Estes testes descrevem o comportamento de hoje, para
// proteger a refatoração do `handleAction` (tabela de ações). Hoje fixo em 20/09/2026.

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('finan:data', JSON.stringify({
      version: 1,
      transactions: [
        { id: 'f1', type: 'expense', categoryId: 'assinaturas', amount: 4490, date: '2026-08-15', description: 'Streaming', recurring: true },
        { id: 'g1', type: 'expense', categoryId: 'mercado', amount: 5000, date: '2026-09-02', description: 'Padaria', recurring: false },
      ],
    }));
  });
  await page.goto(APP);
});

const mes = (page) => page.locator('#month-label');

test('"Próximo mês" avança um mês, "Mês anterior" volta, e a data do formulário acompanha o mês', async ({ page }) => {
  const proximo = page.getByRole('button', { name: 'Próximo mês' });
  const anterior = page.getByRole('button', { name: 'Mês anterior', exact: true });
  await expect(mes(page)).toHaveText(/setembro de 2026/i);
  await proximo.click();
  await expect(mes(page)).toHaveText(/outubro de 2026/i);
  await proximo.click();
  await expect(mes(page)).toHaveText(/novembro de 2026/i);

  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  const formulario = page.locator('#tx-form');
  await abrirDetalhes(formulario);
  await expect(formulario.getByLabel('Data')).toHaveValue('2026-11-01'); // em outro mês, começa no dia 1

  await anterior.click();
  await expect(mes(page)).toHaveText(/outubro de 2026/i);
  await expect(formulario.getByLabel('Data')).toHaveValue('2026-10-01');
  await anterior.click();
  await expect(mes(page)).toHaveText(/setembro de 2026/i);
  await expect(formulario.getByLabel('Data')).toHaveValue('2026-09-20'); // no mês de hoje, é hoje
});

test('"Cancelar edição" volta o formulário a "Novo lançamento" sem mudar o lançamento', async ({ page }) => {
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  const formulario = page.locator('#tx-form');
  const cancelar = page.getByRole('button', { name: 'Cancelar edição' });
  await expect(cancelar).toBeHidden();

  await page.getByRole('button', { name: /Editar.*Padaria/ }).click();
  await expect(page.locator('#form-title')).toHaveText('Editar lançamento');
  await expect(formulario.getByLabel('Valor (R$)')).toHaveValue('50,00');
  await expect(cancelar).toBeVisible();

  await cancelar.click();
  await expect(page.locator('#form-title')).toHaveText('Novo lançamento');
  await expect(page.locator('#tx-submit')).toHaveText('Salvar');
  await expect(formulario.getByLabel('Valor (R$)')).toHaveValue('');
  await expect(cancelar).toBeHidden();
  await expect(page.locator('.tx').filter({ hasText: 'Padaria' })).toContainText(/R\$\s50,00/); // continua igual
});

test('"Trazer fixos do mês anterior" copia o fixo uma vez e não duplica na segunda vez', async ({ page }) => {
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  const trazer = page.getByRole('button', { name: 'Trazer fixos do mês anterior' });
  const streaming = page.locator('.tx').filter({ hasText: 'Streaming' });
  await expect(streaming).toHaveCount(0);

  await trazer.click();
  await expect(page.getByRole('status')).toContainText('1 lançamento(s) fixo(s) copiados.');
  await expect(streaming).toHaveCount(1);
  await expect(streaming).toContainText(/R\$\s44,90/);

  await trazer.click();
  await expect(page.getByRole('status')).toContainText('Nenhum lançamento fixo novo para trazer do mês anterior.');
  await expect(streaming).toHaveCount(1);
});
