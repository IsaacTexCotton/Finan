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
  assert.equal(F.emergencyFundTarget(list, cats, '2026-09', 'estavel'), 900000);
  assert.equal(F.emergencyFundTarget(list, cats, '2026-09', 'variavel'), 1800000);
  assert.equal(F.emergencyFundTarget(list, cats, '2026-09', 'invalido'), 900000);
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

test('perfil de renda é salvo e validado', () => {
  assert.equal(F.emptyData().settings.incomeProfile, 'estavel');
  assert.equal(F.normalizeData({ settings: { incomeProfile: 'variavel' } }).settings.incomeProfile, 'variavel');
  assert.equal(F.normalizeData({ settings: { incomeProfile: 'hacker' } }).settings.incomeProfile, 'estavel');
});

test('createInstallments divide a compra mês a mês, somando o total exato', () => {
  let n = 0;
  const parcelas = F.createInstallments({ type: 'expense', categoryId: 'compras', amount: 100000, date: '2026-01-31', description: 'Notebook' }, 3, () => `id${++n}`);
  assert.equal(parcelas.length, 3);
  assert.deepEqual(parcelas.map((p) => p.amount), [33334, 33333, 33333]);
  assert.equal(parcelas.reduce((a, p) => a + p.amount, 0), 100000);
  assert.deepEqual(parcelas.map((p) => p.date), ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.deepEqual(parcelas.map((p) => F.installmentLabel(p)), ['1/3', '2/3', '3/3']);
  assert.ok(parcelas.every((p) => p.installment.group === parcelas[0].installment.group && !p.recurring));
  assert.equal(new Set(parcelas.map((p) => p.id)).size, 3);
  assert.equal(F.createInstallments({ amount: 100, date: '2026-01-01' }, 999, () => 'x').length, F.MAX_INSTALLMENTS);
});

test('installmentCommitments soma só parcelas dos meses seguintes', () => {
  let n = 0;
  const parcelas = F.createInstallments({ type: 'expense', categoryId: 'compras', amount: 120000, date: '2026-09-10', description: 'TV' }, 4, () => `p${++n}`);
  const list = [...parcelas, tx('expense', 'mercado', 5000, '2026-10-01')];
  const c = F.installmentCommitments(list, '2026-09');
  assert.equal(c.total, 90000);
  assert.equal(c.months, 3);
  assert.equal(c.lastMonth, '2026-12');
  assert.equal(F.installmentCommitments(list, '2026-12').total, 0);

  const s = F.summarize([], cats);
  const msgs = F.insights({ summary: s, buckets: F.bucketAnalysis(s), budgetRows: [], previousSummary: null, categories: cats, commitments: c });
  assert.ok(msgs.some((m) => m.text.includes('parcelas') && m.text.includes('dezembro de 2026')));
});

test('normalizeData preserva parcelas válidas e descarta inválidas', () => {
  const base = tx('expense', 'compras', 1000, '2026-09-01');
  const data = F.normalizeData({ transactions: [
    { ...base, id: 'a', installment: { group: 'g', n: 2, of: 5 } },
    { ...base, id: 'b', installment: { group: 'g', n: 6, of: 5 } },
  ] });
  assert.deepEqual(data.transactions[0].installment, { group: 'g', n: 2, of: 5 });
  assert.equal(data.transactions[1].installment, undefined);
});

test('adaptivePlan segue a regra aprovada (exemplos da Parte 3)', () => {
  const split = (p) => `${p.essencial}/${p.estilo}/${p.futuro}`;
  assert.equal(split(F.adaptivePlan(null)), '50/30/20');
  assert.equal(F.adaptivePlan(null).profile, 'sem-historico');
  assert.equal(split(F.adaptivePlan(0.45)), '50/30/20');
  assert.equal(F.adaptivePlan(0.45).profile, 'confortavel');
  assert.equal(split(F.adaptivePlan(0.50)), '50/30/20');
  assert.equal(split(F.adaptivePlan(0.55)), '55/30/15');
  assert.equal(split(F.adaptivePlan(0.6)), '60/25/15'); // 0.6 * 100 não pode virar 65 por erro de ponto flutuante
  assert.equal(split(F.adaptivePlan(0.57)), '60/25/15');
  assert.equal(split(F.adaptivePlan(0.70)), '70/20/10');
  assert.equal(split(F.adaptivePlan(0.80)), '80/15/5');
  assert.equal(F.adaptivePlan(0.80).profile, 'ajustando');
  assert.equal(split(F.adaptivePlan(0.85)), '85/10/5');
  assert.equal(F.adaptivePlan(0.85).profile, 'critico');
  assert.equal(split(F.adaptivePlan(0.97)), '100/0/0');
  assert.equal(split(F.adaptivePlan(1.3)), '100/0/0');
  for (let s = 0; s <= 1.2; s += 0.01) {
    const p = F.adaptivePlan(s);
    assert.equal(p.essencial + p.estilo + p.futuro, 100, `share ${s}`);
  }
});

test('essentialShare usa os 3 meses anteriores com renda, sem o mês corrente', () => {
  const list = [
    tx('income', 'salario', 100000, '2026-05-01'),
    tx('expense', 'moradia', 90000, '2026-05-02'), // 4 meses atrás: fora da janela
    tx('income', 'salario', 100000, '2026-07-01'),
    tx('expense', 'moradia', 60000, '2026-07-02'),
    tx('income', 'salario', 100000, '2026-08-01'),
    tx('expense', 'moradia', 70000, '2026-08-02'),
    tx('expense', 'lazer', 20000, '2026-08-03'),
    tx('expense', 'moradia', 100000, '2026-09-02'), // mês corrente: ignorado
  ];
  assert.equal(F.essentialShare(list, cats, '2026-09'), 0.65);
  assert.equal(F.essentialShare([], cats, '2026-09'), null);
});

test('plano adaptativo muda as metas dos baldes, os envelopes sugeridos e as mensagens', () => {
  const plan = F.adaptivePlan(0.6);
  const s = F.summarize([tx('income', 'salario', 100000, '2026-09-01'), tx('expense', 'moradia', 58000, '2026-09-02'), tx('expense', 'investimentos', 15000, '2026-09-02')], cats);
  const byId = Object.fromEntries(F.bucketAnalysis(s, plan).map((b) => [b.id, b]));
  assert.equal(byId.essencial.target, 60000);
  assert.equal(byId.essencial.status, 'ok'); // acima de 50%, mas dentro do plano adaptado
  assert.equal(byId.futuro.target, 15000);
  assert.equal(byId.futuro.status, 'ok');

  const sug = F.suggestBudgets(100000, cats, {}, plan);
  const futuro = cats.filter((c) => c.bucket === 'futuro').reduce((a, c) => a + (sug[c.id] || 0), 0);
  assert.equal(futuro, 15000);

  const msgs = F.insights({ summary: s, buckets: F.bucketAnalysis(s, plan), budgetRows: [], previousSummary: null, categories: cats, plan });
  assert.ok(msgs.some((m) => m.text.includes('60/25/15')));
  assert.ok(msgs.some((m) => m.level === 'bom')); // poupou 42% ≥ meta de 15%

  const critico = F.insights({ summary: s, buckets: [], budgetRows: [], previousSummary: null, categories: cats, plan: F.adaptivePlan(0.9) });
  assert.ok(critico.some((m) => m.level === 'alerta' && m.text.includes('reduzir custos fixos')));
});
