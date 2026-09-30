const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Cada balde tem um teto (a parte da renda que o plano reserva para ele). Os limites por categoria
// são opcionais: as categorias sem limite gastam do que sobra do teto. A tela mostra teto,
// distribuído e sobra, e avisa o tamanho do excesso em vez de cortar sozinha.
// Renda R$ 3.000, sem histórico (plano 50/30/20): tetos de R$ 1.500, R$ 900 e R$ 600.

async function abrir(page, dados) {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript((d) => localStorage.setItem('finan:data', JSON.stringify(d)), dados);
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Orçamento' }).click();
}

const grupo = (page, nome) => page.locator('.budget-group').filter({ has: page.getByRole('heading', { name: nome, exact: true }) });

const COM_RENDA = {
  version: 1,
  transactions: [
    { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' },
    { id: 'g1', type: 'expense', categoryId: 'compras', amount: 12000, date: '2026-09-10', description: '' },
    { id: 'g2', type: 'expense', categoryId: 'lazer', amount: 20000, date: '2026-09-11', description: '' },
  ],
  budgets: { moradia: 100000, mercado: 60000, lazer: 30000 },
};

test('cada balde mostra o teto, o distribuído e o que sobra para as categorias sem limite', async ({ page }) => {
  await abrir(page, COM_RENDA);
  const estilo = grupo(page, 'Estilo de vida');
  await expect(estilo.locator('.budget-sum')).toContainText(/Teto do balde: R\$\s900,00 \(30% da renda\)/);
  await expect(estilo.locator('.budget-room')).toContainText(/Distribuído nos limites: R\$\s300,00 · sobram R\$\s600,00 para as categorias sem limite \(elas já gastaram R\$\s120,00\)/);

  const futuro = grupo(page, 'Futuro');
  await expect(futuro.locator('.budget-room')).toContainText(/Distribuído nos limites: R\$\s0,00 · sobram R\$\s600,00 para as categorias sem limite/);
});

test('limites que passam do teto do balde avisam o tamanho do excesso, com texto', async ({ page }) => {
  await abrir(page, COM_RENDA);
  const essenciais = grupo(page, 'Essenciais');
  await expect(essenciais.locator('.budget-sum')).toContainText(/Teto do balde: R\$\s1\.500,00 \(50% da renda\)/);
  await expect(essenciais.locator('.budget-room')).toContainText(/Distribuído nos limites: R\$\s1\.600,00 · passa do teto em R\$\s100,00/);
  await expect(essenciais.locator('.budget-room')).toHaveClass(/danger/);
});

test('teto totalmente distribuído é avisado como tal', async ({ page }) => {
  await abrir(page, { ...COM_RENDA, budgets: { lazer: 90000 } });
  await expect(grupo(page, 'Estilo de vida').locator('.budget-room')).toContainText(/o teto está todo distribuído/);
});

test('sem renda no mês não há teto: a tela pede a renda e mantém o que foi distribuído', async ({ page }) => {
  await abrir(page, { version: 1, budgets: { moradia: 100000 } });
  const essenciais = grupo(page, 'Essenciais');
  await expect(essenciais.locator('.budget-sum')).toContainText('Lance a renda do mês para ver o teto deste balde');
  await expect(essenciais.locator('.budget-room')).toContainText(/Distribuído nos limites: R\$\s1\.000,00/);
});

test('mudar um limite atualiza o que sobra do teto', async ({ page }) => {
  await abrir(page, COM_RENDA);
  await page.getByRole('button', { name: 'Adicionar item em Estilo de vida' }).click();
  await page.locator('.add-panel .add-item', { hasText: 'Restaurantes e delivery' }).click();
  await page.getByLabel('Limite para Restaurantes e delivery').fill('200');
  await page.getByLabel('Limite para Restaurantes e delivery').blur();
  await expect(grupo(page, 'Estilo de vida').locator('.budget-room')).toContainText(/Distribuído nos limites: R\$\s500,00 · sobram R\$\s400,00/);
});

test('a tela explica o que é o teto do balde', async ({ page }) => {
  await abrir(page, COM_RENDA);
  await expect(page.locator('#tab-orcamento')).toContainText('Cada balde tem um teto: a parte da sua renda que o plano reserva para ele');
  await expect(page.locator('#tab-orcamento')).toContainText('as que ficam sem limite gastam do que sobra do teto');
});
