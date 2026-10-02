const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// O Orçamento começa enxuto (só o essencial) e a pessoa monta o resto aos poucos: cada balde tem um
// botão "Adicionar" que lista os itens do catálogo que ainda não estão no orçamento e permite "Criar"
// um item novo, que entra no balde e no catálogo.

async function abrir(page, dados) {
  await page.setViewportSize({ width: 390, height: 844 });
  if (dados) await page.addInitScript((d) => { if (!localStorage.getItem('finan:data')) localStorage.setItem('finan:data', JSON.stringify(d)); }, dados);
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Orçamento' }).click();
}

const grupo = (page, nome) => page.locator('.budget-group').filter({ has: page.getByRole('heading', { name: nome, exact: true }) });
const limite = (page, nome) => page.getByLabel(`Limite para ${nome}`);
const adicionar = (page, balde) => page.getByRole('button', { name: `Adicionar item em ${balde}` });
const itensDaLista = (page) => page.locator('.add-panel .add-item');

test('primeira abertura: só o essencial, e os três baldes presentes', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('.budget-group h3')).toHaveText(['Essenciais', 'Estilo de vida', 'Futuro']);
  for (const nome of ['Moradia', 'Contas da casa', 'Mercado', 'Transporte', 'Saúde', 'Reserva de emergência']) {
    await expect(limite(page, nome), nome).toHaveCount(1);
  }
  for (const nome of ['Educação', 'Impostos e taxas', 'Restaurantes e delivery', 'Lazer', 'Compras', 'Assinaturas', 'Investimentos', 'Metas', 'Quitação de dívidas']) {
    await expect(limite(page, nome), nome).toHaveCount(0);
  }
  await expect(grupo(page, 'Estilo de vida').locator('.budget-row')).toHaveCount(0);
  for (const balde of ['Essenciais', 'Estilo de vida', 'Futuro']) await expect(adicionar(page, balde)).toBeVisible();
});

test('"Adicionar" lista só os itens ainda não adicionados do balde tocado', async ({ page }) => {
  await abrir(page);
  await adicionar(page, 'Estilo de vida').click();
  await expect(itensDaLista(page)).toHaveCount(7);
  await expect(page.locator('.add-panel')).toContainText('Restaurantes e delivery');
  await expect(page.locator('.add-panel')).not.toContainText('Moradia');

  await page.getByRole('button', { name: 'Fechar' }).click();
  await adicionar(page, 'Essenciais').click();
  await expect(itensDaLista(page)).toHaveCount(3);
  await expect(page.locator('.add-panel')).toContainText('Educação');
  await expect(page.locator('.add-panel')).toContainText('Impostos e taxas');
  await expect(page.locator('.add-panel')).toContainText('Quitação de dívidas'); // dívida é Essenciais desde 02/10/2026
});

test('escolher um item o move para o balde, o tira da lista e leva o foco ao limite dele', async ({ page }) => {
  await abrir(page);
  await adicionar(page, 'Estilo de vida').click();
  await itensDaLista(page).filter({ hasText: 'Lazer' }).click();

  await expect(page.getByRole('status')).toContainText('Lazer adicionado ao orçamento');
  await expect(grupo(page, 'Estilo de vida').locator('.budget-row')).toHaveCount(1);
  await expect(limite(page, 'Lazer')).toBeFocused();
  await expect(page.locator('.add-panel')).toHaveCount(0); // a lista fecha

  await adicionar(page, 'Estilo de vida').click();
  await expect(itensDaLista(page)).toHaveCount(6);
  await expect(page.locator('.add-panel')).not.toContainText('Lazer');
});

test('os itens adicionados continuam lá ao reabrir o app', async ({ page }) => {
  await abrir(page);
  await adicionar(page, 'Essenciais').click();
  await itensDaLista(page).filter({ hasText: 'Educação' }).click();
  await page.reload();
  await page.getByRole('tab', { name: 'Orçamento' }).click();
  await expect(limite(page, 'Educação')).toHaveCount(1);
  await adicionar(page, 'Essenciais').click();
  await expect(itensDaLista(page)).toHaveCount(2); // sobraram Impostos e taxas e Quitação de dívidas
});

test('quem já tem limite definido continua vendo o item, e ele não aparece na lista de adicionar', async ({ page }) => {
  await abrir(page, { version: 1, budgets: { lazer: 25000 } });
  await expect(limite(page, 'Lazer')).toHaveValue('250,00');
  await adicionar(page, 'Estilo de vida').click();
  await expect(itensDaLista(page)).toHaveCount(6);
  await expect(page.locator('.add-panel')).not.toContainText('Lazer');
});

test('"Criar" com nome válido adiciona ao balde e ao catálogo, e fica salvo', async ({ page }) => {
  await abrir(page);
  await adicionar(page, 'Estilo de vida').click();
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(page.getByLabel('Nome do novo item')).toBeFocused();
  await page.getByLabel('Nome do novo item').fill('  Pets ');
  await page.getByRole('button', { name: 'Criar e adicionar' }).click();

  await expect(page.getByRole('status')).toContainText('Pets adicionado ao orçamento');
  await expect(grupo(page, 'Estilo de vida').locator('.budget-row')).toHaveCount(1);
  await expect(limite(page, 'Pets')).toBeFocused();

  // entrou no catálogo: aparece no formulário de lançamento, no balde Estilo de vida
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await expect(page.locator('#tx-form').getByLabel('Categoria').locator('optgroup[label="Estilo de vida"] option', { hasText: 'Pets' })).toHaveCount(1);

  // não volta para a lista de adicionar
  await page.getByRole('tab', { name: 'Orçamento' }).click();
  await adicionar(page, 'Estilo de vida').click();
  await expect(page.locator('.add-panel')).not.toContainText('Pets');

  // e continua lá depois de reabrir o app
  await page.reload();
  await page.getByRole('tab', { name: 'Orçamento' }).click();
  await expect(limite(page, 'Pets')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await expect(page.locator('#tx-form').getByLabel('Categoria').locator('option', { hasText: 'Pets' })).toHaveCount(1);
});

test('"Criar" bloqueia nome vazio e nome repetido (em qualquer balde, sem diferenciar maiúsculas e acentos)', async ({ page }) => {
  await abrir(page);
  await adicionar(page, 'Estilo de vida').click();
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  const campo = page.getByLabel('Nome do novo item');
  const erro = page.locator('#create-error');

  await page.getByRole('button', { name: 'Criar e adicionar' }).click();
  await expect(erro).toContainText('Dê um nome ao item');
  await campo.fill('    ');
  await page.getByRole('button', { name: 'Criar e adicionar' }).click();
  await expect(erro).toContainText('Dê um nome ao item');

  for (const repetido of ['Lazer', ' lazer ', 'SAUDE', 'mercado']) { // Lazer ainda não foi adicionado; Saúde e Mercado são de outro balde
    await campo.fill(repetido);
    await page.getByRole('button', { name: 'Criar e adicionar' }).click();
    await expect(erro, repetido).toContainText('Já existe um item chamado');
    await expect(campo).toBeFocused();
  }
  await expect(grupo(page, 'Estilo de vida').locator('.budget-row')).toHaveCount(0);
  await expect(page.locator('.add-panel')).toBeVisible(); // continua aberto para corrigir
});

test('"Cancelar" e "Fechar" voltam o foco e não mudam o orçamento', async ({ page }) => {
  await abrir(page);
  await adicionar(page, 'Futuro').click();
  await expect(page.locator('.add-panel').getByRole('heading', { name: 'Adicionar em Futuro' })).toBeFocused();
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await page.getByLabel('Nome do novo item').fill('Previdência');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('button', { name: 'Criar', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.locator('.add-panel')).toHaveCount(0);
  await expect(adicionar(page, 'Futuro')).toBeFocused();
  await expect(grupo(page, 'Futuro').locator('.budget-row')).toHaveCount(1); // só a reserva
});

test('os botões têm área de toque e nada rola para o lado em 320px', async ({ page }) => {
  await abrir(page);
  await page.setViewportSize({ width: 320, height: 700 });
  expect((await adicionar(page, 'Estilo de vida').boundingBox()).height).toBeGreaterThanOrEqual(44);
  await adicionar(page, 'Estilo de vida').click();
  for (const item of await itensDaLista(page).all()) expect((await item.boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect((await page.getByRole('button', { name: 'Criar', exact: true }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  expect((await page.getByLabel('Nome do novo item').boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
