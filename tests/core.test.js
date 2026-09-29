const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/core.js');

const cats = F.DEFAULT_CATEGORIES;
let seq = 0;
const tx = (type, categoryId, amount, date, extra = {}) => ({ id: `t${++seq}`, type, categoryId, amount, date, description: '', recurring: false, createdAt: seq, ...extra });

test('parseAmount entende formatos brasileiros e internacionais', () => {
  assert.equal(F.parseAmount('1.234,56'), 123456);
  assert.equal(F.parseAmount('R$ 12,5'), 1250);
  assert.equal(F.parseAmount('1234.56'), 123456);
  assert.equal(F.parseAmount('1,234.56'), 123456);
  assert.equal(F.parseAmount('1.234'), 123400);
  assert.equal(F.parseAmount('1.234.567'), 123456700);
  assert.equal(F.parseAmount('0,29'), 29);
  assert.equal(F.parseAmount('10,005'), 1001);
  assert.equal(F.parseAmount(10), 1000);
  assert.equal(F.parseAmount('-5'), -500);
  assert.ok(Number.isNaN(F.parseAmount('')));
  assert.ok(Number.isNaN(F.parseAmount('abc')));
  assert.ok(Number.isNaN(F.parseAmount('1,2,3a')));
});

test('formatBRL formata em reais', () => {
  assert.equal(F.formatBRL(123456).replace(/\s/g, ' '), 'R$ 1.234,56');
});

test('datas: meses, dias e semanas', () => {
  assert.equal(F.shiftMonth('2026-01', -1), '2025-12');
  assert.equal(F.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(F.daysInMonth('2028-02'), 29);
  assert.equal(F.monthLabel('2026-09'), 'setembro de 2026');
  assert.equal(F.elapsedDays('2026-09', '2026-09-15'), 15);
  assert.equal(F.elapsedDays('2026-08', '2026-09-15'), 31);
  assert.equal(F.elapsedDays('2026-10', '2026-09-15'), 0);
  assert.equal(F.weekKey('2026-09-29'), '2026-W40');
  assert.equal(F.weekKey('2027-01-01'), '2026-W53');
});

test('summarize separa receitas, despesas e baldes', () => {
  const list = [
    tx('income', 'salario', 500000, '2026-09-05'),
    tx('expense', 'moradia', 150000, '2026-09-05'),
    tx('expense', 'mercado', 80000, '2026-09-10'),
    tx('expense', 'lazer', 50000, '2026-09-12'),
    tx('expense', 'investimentos', 100000, '2026-09-06'),
  ];
  const s = F.summarize(list, cats);
  assert.equal(s.income, 500000);
  assert.equal(s.expense, 380000);
  assert.equal(s.balance, 120000);
  assert.deepEqual(s.byBucket, { essencial: 230000, estilo: 50000, futuro: 100000 });
  assert.equal(s.savingsRate, 0.44);

  const b = F.bucketAnalysis(s);
  assert.deepEqual(b.map((x) => x.status), ['ok', 'ok', 'ok']);
  assert.equal(b[0].target, 250000);
});

test('bucketAnalysis sinaliza baldes acima da meta e futuro abaixo', () => {
  const s = F.summarize([
    tx('income', 'salario', 100000, '2026-09-01'),
    tx('expense', 'moradia', 60000, '2026-09-01'),
    tx('expense', 'lazer', 31000, '2026-09-01'),
  ], cats);
  const byId = Object.fromEntries(F.bucketAnalysis(s).map((b) => [b.id, b.status]));
  assert.equal(byId.essencial, 'acima');
  assert.equal(byId.estilo, 'atencao');
  assert.equal(byId.futuro, 'abaixo');
});

test('budgetStatus projeta só categorias variáveis e calcula o gasto diário', () => {
  const list = [
    tx('expense', 'moradia', 150000, '2026-09-05'),
    tx('expense', 'restaurantes', 30000, '2026-09-08'),
    tx('expense', 'mercado', 20000, '2026-09-08'),
  ];
  const s = F.summarize(list, cats);
  const budgets = { moradia: 150000, restaurantes: 60000, mercado: 100000 };
  const rows = F.budgetStatus(budgets, s, cats, '2026-09', '2026-09-10');
  const byId = Object.fromEntries(rows.map((r) => [r.categoryId, r]));
  assert.equal(byId.moradia.status, 'ok'); // fixa: pagar o aluguel não é "risco"
  assert.equal(byId.restaurantes.projected, 90000);
  assert.equal(byId.restaurantes.status, 'risco');
  assert.equal(byId.mercado.status, 'ok');

  const daily = F.dailyAllowance(rows, '2026-09', '2026-09-10');
  assert.equal(daily.daysLeft, 21);
  assert.equal(daily.remaining, 110000);
  assert.equal(daily.perDay, Math.floor(110000 / 21));
  assert.equal(F.dailyAllowance(rows, '2026-08', '2026-09-10'), null);
});

test('budgetStatus marca envelope estourado', () => {
  const s = F.summarize([tx('expense', 'lazer', 70000, '2026-09-02')], cats);
  const [row] = F.budgetStatus({ lazer: 50000 }, s, cats, '2026-09', '2026-09-30');
  assert.equal(row.status, 'estourado');
  assert.equal(row.remaining, -20000);
});

test('suggestBudgets distribui a renda pelo 50/30/20 respeitando o histórico', () => {
  const sug = F.suggestBudgets(1000000, cats, { moradia: 300000, mercado: 100000 });
  assert.equal(sug.moradia, 375000);
  assert.equal(sug.mercado, 125000);
  assert.equal(sug.transporte, undefined);
  const estilo = cats.filter((c) => c.bucket === 'estilo').reduce((sum, c) => sum + (sug[c.id] || 0), 0);
  assert.equal(estilo, 300000);
  assert.deepEqual(F.suggestBudgets(0, cats), {});
});

test('reserva de emergência usa a média dos meses anteriores', () => {
  const list = [
    tx('expense', 'moradia', 100000, '2026-07-05'),
    tx('expense', 'moradia', 200000, '2026-08-05'),
    tx('expense', 'lazer', 999999, '2026-08-06'),
  ];
  assert.equal(F.averageEssential(list, cats, '2026-09'), 150000);
  assert.equal(F.emergencyFundTarget(list, cats, '2026-09'), 900000);
});

test('goalProgress calcula aporte mensal', () => {
  const p = F.goalProgress({ target: 1200000, saved: 200000, deadline: '2027-07-01' }, '2026-09-29');
  assert.equal(p.monthsLeft, 10);
  assert.equal(p.monthly, 100000);
  assert.equal(p.ratio, 200000 / 1200000);
  assert.equal(F.goalProgress({ target: 100, saved: 150 }, '2026-09-29').done, true);
});

test('recurringForMonth copia fixos sem duplicar e ajusta o dia', () => {
  const list = [
    tx('expense', 'moradia', 150000, '2026-01-31', { recurring: true, description: 'Aluguel' }),
    tx('expense', 'assinaturas', 3990, '2026-01-10', { recurring: true, description: 'Streaming' }),
    tx('expense', 'lazer', 5000, '2026-01-10'),
    tx('expense', 'assinaturas', 3990, '2026-02-10', { recurring: true, description: 'streaming ' }),
  ];
  let n = 0;
  const copies = F.recurringForMonth(list, '2026-01', '2026-02', () => `new${++n}`);
  assert.equal(copies.length, 1);
  assert.equal(copies[0].date, '2026-02-28');
  assert.equal(copies[0].id, 'new1');
});

test('insights priorizam problemas e elogiam boa poupança', () => {
  const s = F.summarize([tx('income', 'salario', 100000, '2026-09-01'), tx('expense', 'lazer', 120000, '2026-09-02')], cats);
  const list = F.insights({ summary: s, buckets: F.bucketAnalysis(s), budgetRows: [], previousSummary: null, categories: cats });
  assert.equal(list[0].level, 'perigo');

  const good = F.summarize([tx('income', 'salario', 100000, '2026-09-01'), tx('expense', 'investimentos', 30000, '2026-09-02')], cats);
  const ok = F.insights({ summary: good, buckets: F.bucketAnalysis(good), budgetRows: [], previousSummary: null, categories: cats });
  assert.ok(ok.some((i) => i.level === 'bom'));
});

test('normalizeData descarta dados inválidos de um backup', () => {
  const data = F.normalizeData({
    transactions: [
      tx('expense', 'mercado', 1000, '2026-09-01'),
      tx('expense', 'inexistente', 1000, '2026-09-01'),
      tx('expense', 'mercado', -5, '2026-09-01'),
      tx('expense', 'mercado', 10.5, '2026-09-01'),
      { id: 'x', type: 'expense', categoryId: 'mercado', amount: 100, date: '01/09/2026' },
    ],
    budgets: { mercado: 50000, lazer: 'muito', fantasma: 100 },
    goals: [{ id: 'g', name: 'Viagem', target: 500000, saved: 1000 }, { id: 'h', name: 'x', target: 0 }],
    reviews: { '2026-W40': ['registrar', 3], bad: [] },
  });
  assert.equal(data.transactions.length, 1);
  assert.deepEqual(data.budgets, { mercado: 50000 });
  assert.equal(data.goals.length, 1);
  assert.deepEqual(data.reviews, { '2026-W40': ['registrar'] });
  assert.equal(F.normalizeData(null).categories.length, cats.length);
});

test('toCSV usa ponto e vírgula e neutraliza fórmulas', () => {
  const csv = F.toCSV([tx('expense', 'mercado', 12345, '2026-09-01', { description: '=HYPERLINK("x")' })], cats);
  const [header, line] = csv.split('\n');
  assert.equal(header, 'Data;Tipo;Categoria;Balde;Descrição;Valor;Fixo');
  assert.equal(line, '2026-09-01;Despesa;Mercado;Essenciais;"\'=HYPERLINK(""x"")";-123,45;Não');
});

test('categorias padrão incluem as novas e chegam a quem já tem dados salvos', () => {
  const ids = cats.map((c) => c.id);
  for (const id of ['impostos', 'cuidados', 'presentes']) assert.ok(ids.includes(id), id);
  const byId = F.indexCategories(cats);
  assert.equal(byId.impostos.bucket, 'essencial');
  assert.equal(byId.cuidados.bucket, 'estilo');
  assert.equal(byId.presentes.bucket, 'estilo');

  const antigo = F.normalizeData({ categories: [{ id: 'mercado', name: 'Supermercado', type: 'expense', bucket: 'essencial', kind: 'variavel' }] });
  const nomes = F.indexCategories(antigo.categories);
  assert.equal(nomes.mercado.name, 'Supermercado'); // personalização preservada
  assert.ok(nomes.impostos && nomes.presentes && nomes.salario);
});

test('suggestBudgets: soma dos envelopes bate exatamente com a renda (sem sobra de arredondamento)', () => {
  for (const income of [1000000, 333300, 517000]) {
    const sug = F.suggestBudgets(income, cats);
    const total = Object.values(sug).reduce((a, b) => a + b, 0);
    assert.equal(total, Math.round(income / 1000) * 1000, `renda ${income}`);
  }
});
