/*
 * Finan — núcleo de regras do Método Finan.
 * Funções puras (sem DOM, sem armazenamento), usadas pelo app e pelos testes.
 * Valores monetários são sempre inteiros em centavos para evitar erros de arredondamento.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FinanCore = api;
  // eslint-disable-next-line max-lines-per-function -- invólucro do módulo, não é uma função de negócio
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DATA_VERSION = 1;

  // Os três baldes do 50/30/20.
  const BUCKETS = {
    essencial: { label: 'Essenciais', target: 0.5, description: 'O que você precisa para viver: moradia, mercado, contas, transporte, saúde.' },
    estilo: { label: 'Estilo de vida', target: 0.3, description: 'O que deixa a vida boa, mas é opcional: lazer, delivery, compras, assinaturas.' },
    futuro: { label: 'Futuro', target: 0.2, description: 'Pague-se primeiro: reserva de emergência, investimentos e quitação de dívidas.' },
  };

  // Metas padrão dos baldes, em pontos percentuais da renda.
  const DEFAULT_TARGETS = { essencial: 50, estilo: 30, futuro: 20 };

  const PLAN_PROFILES = {
    'sem-historico': { label: 'Começando', description: 'Ainda sem histórico: o plano começa no 50/30/20, ou seja, até 50% da renda para Essenciais, até 30% para Estilo de vida e pelo menos 20% para o Futuro.' },
    confortavel: { label: 'Confortável', description: 'Os essenciais cabem em até 50% da renda: siga o 50/30/20.' },
    ajustando: { label: 'Ajustando', description: 'Os essenciais passam de 50% da renda: o plano se adapta e volta ao 50/30/20 conforme eles caem.' },
    critico: { label: 'Crítico', description: 'Os essenciais passam de 80% da renda: o foco é cortar custos fixos ou aumentar a renda.' },
  };

  // kind: 'fixa' (valor previsível, pago de uma vez) ou 'variavel' (gasto ao longo do mês).
  const DEFAULT_CATEGORIES = [
    { id: 'salario', name: 'Salário', type: 'income', icon: '💼' },
    { id: 'renda-extra', name: 'Renda extra', type: 'income', icon: '✨' },
    { id: 'outras-receitas', name: 'Outras receitas', type: 'income', icon: '➕' },

    { id: 'moradia', name: 'Moradia', type: 'expense', bucket: 'essencial', kind: 'fixa', icon: '🏠' },
    { id: 'contas', name: 'Contas da casa', type: 'expense', bucket: 'essencial', kind: 'fixa', icon: '💡' },
    { id: 'mercado', name: 'Mercado', type: 'expense', bucket: 'essencial', kind: 'variavel', icon: '🛒' },
    { id: 'transporte', name: 'Transporte', type: 'expense', bucket: 'essencial', kind: 'variavel', icon: '🚌' },
    { id: 'saude', name: 'Saúde', type: 'expense', bucket: 'essencial', kind: 'variavel', icon: '🩺' },
    { id: 'educacao', name: 'Educação', type: 'expense', bucket: 'essencial', kind: 'fixa', icon: '📚' },
    { id: 'impostos', name: 'Impostos e taxas', type: 'expense', bucket: 'essencial', kind: 'fixa', icon: '🧾' },

    { id: 'restaurantes', name: 'Restaurantes e delivery', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🍔' },
    { id: 'lazer', name: 'Lazer', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🎬' },
    { id: 'compras', name: 'Compras', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🛍️' },
    { id: 'assinaturas', name: 'Assinaturas', type: 'expense', bucket: 'estilo', kind: 'fixa', icon: '📺' },
    { id: 'cuidados', name: 'Cuidados pessoais', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '💇' },
    { id: 'presentes', name: 'Presentes e doações', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🎁' },
    { id: 'outros', name: 'Outros gastos', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '📦' },

    { id: 'reserva', name: 'Reserva de emergência', type: 'expense', bucket: 'futuro', kind: 'fixa', icon: '🛟' },
    { id: 'investimentos', name: 'Investimentos', type: 'expense', bucket: 'futuro', kind: 'fixa', icon: '📈' },
    { id: 'dividas', name: 'Quitação de dívidas', type: 'expense', bucket: 'futuro', kind: 'fixa', icon: '⛓️' },
  ];

  // Meses de gastos essenciais que a reserva de emergência deve cobrir, por tipo de renda.
  const INCOME_PROFILES = {
    estavel: { label: 'Renda estável (CLT, servidor público, aposentadoria)', months: 6 },
    variavel: { label: 'Renda variável (autônomo, freelancer, empresário)', months: 12 },
  };

  const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  // ---------- Dinheiro ----------

  /**
   * Converte texto digitado ("1.234,56", "R$ 12,5", "1234.56", 10) em centavos.
   * Retorna NaN quando o texto não é um valor válido.
   */
  function parseAmount(input) {
    if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : NaN;
    let s = String(input == null ? '' : input).replace(/R\$|\s/g, '');
    if (!s) return NaN;
    let negative = false;
    if (s[0] === '-') {
      negative = true;
      s = s.slice(1);
    }
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > -1 && lastDot > -1) {
      // O separador que aparece por último é o decimal.
      s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (lastComma > -1) {
      const parts = s.split(',');
      s = parts.length > 2 ? parts.join('') : s.replace(',', '.');
    } else if (lastDot > -1) {
      const parts = s.split('.');
      // Padrão brasileiro: "1.234" e "1.234.567" são separadores de milhar.
      if (parts.length > 2 || parts[1].length === 3) s = parts.join('');
    }
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    const [intPart, decPart = ''] = s.split('.');
    let cents = Number(intPart) * 100 + Number((decPart + '00').slice(0, 2));
    if (decPart.length > 2 && Number(decPart[2]) >= 5) cents += 1;
    return negative ? -cents : cents;
  }

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function formatBRL(cents) {
    return brl.format((cents || 0) / 100);
  }

  function formatPercent(ratio, digits = 0) {
    if (!Number.isFinite(ratio)) return '—';
    return (ratio * 100).toFixed(digits).replace('.', ',') + '%';
  }

  // ---------- Datas (sempre strings locais AAAA-MM-DD, sem fuso) ----------

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function todayISO(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function monthKey(isoDate) {
    return String(isoDate).slice(0, 7);
  }

  function shiftMonth(key, delta) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }

  function daysInMonth(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }

  function monthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} de ${y}`;
  }

  /** Dias do mês já "vividos" em relação a hoje: 0 (futuro), dia atual, ou o mês todo (passado). */
  function elapsedDays(key, today) {
    const current = monthKey(today);
    if (key < current) return daysInMonth(key);
    if (key > current) return 0;
    return Number(today.slice(8, 10));
  }

  /** Chave da semana ISO 8601, ex.: "2026-W40". */
  function weekKey(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${pad(week)}`;
  }

  // ---------- Consultas ----------

  function indexCategories(categories) {
    const map = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }

  function transactionsOfMonth(transactions, key) {
    return transactions.filter((t) => monthKey(t.date) === key);
  }

  function sortTransactions(transactions) {
    return [...transactions].sort((a, b) => (a.date === b.date ? (b.createdAt || 0) - (a.createdAt || 0) : a.date < b.date ? 1 : -1));
  }

  /** Totais do conjunto de lançamentos (normalmente de um mês). */
  function summarize(transactions, categories) {
    const cats = indexCategories(categories);
    const byCategory = {};
    const byBucket = { essencial: 0, estilo: 0, futuro: 0 };
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === 'income') {
        income += t.amount;
        continue;
      }
      expense += t.amount;
      byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
      const bucket = (cats[t.categoryId] && cats[t.categoryId].bucket) || 'estilo';
      byBucket[bucket] += t.amount;
    }
    const consumption = byBucket.essencial + byBucket.estilo; // Gastos: o que foi consumido
    const saved = byBucket.futuro; // Guardado: reserva, investimentos e dívidas
    const balance = income - expense;
    // Taxa de poupança: só o que foi guardado (Futuro) sobre a renda. A sobra do mês não conta:
    // dinheiro parado na conta ainda não foi guardado.
    const savingsRate = income > 0 ? saved / income : 0;
    return { income, expense, balance, consumption, saved, savingsRate, byCategory, byBucket };
  }

  /**
   * Parcela da renda gasta com essenciais nos meses anteriores (padrão: 3), sem contar o mês
   * corrente, que ainda está incompleto. Retorna null quando não há renda registrada.
   */
  function essentialShare(transactions, categories, key, months = 3) {
    let income = 0;
    let essential = 0;
    for (let i = 1; i <= months; i++) {
      const s = summarize(transactionsOfMonth(transactions, shiftMonth(key, -i)), categories);
      if (s.income <= 0) continue;
      income += s.income;
      essential += s.byBucket.essencial;
    }
    return income > 0 ? essential / income : null;
  }

  /**
   * Plano adaptativo dos baldes, conforme a situação da pessoa:
   *  - até 50% em essenciais → 50/30/20;
   *  - de 50% a 80% → essenciais reais (arredondados para cima de 5 em 5), e do resto
   *    40% vai para o Futuro (mínimo 5%) e 60% para o Estilo de vida;
   *  - acima de 80% → Futuro de 5% e foco em reduzir custos.
   */
  function adaptivePlan(share) {
    if (share == null) return { profile: 'sem-historico', essentialShare: null, ...DEFAULT_TARGETS };
    const essencial = Math.min(Math.ceil((share * 100) / 5 - 1e-9) * 5, 100);
    if (essencial <= 50) return { profile: 'confortavel', essentialShare: share, ...DEFAULT_TARGETS };
    const rest = 100 - essencial;
    if (essencial <= 80) {
      const futuro = Math.max(5, Math.floor((rest * 2) / 25) * 5);
      return { profile: 'ajustando', essentialShare: share, essencial, estilo: rest - futuro, futuro };
    }
    const futuro = Math.min(5, rest);
    return { profile: 'critico', essentialShare: share, essencial, estilo: rest - futuro, futuro };
  }

  /** Compara o realizado de cada balde com a meta do plano (padrão 50/30/20). */
  function bucketAnalysis(summary, targets = DEFAULT_TARGETS) {
    return Object.keys(BUCKETS).map((id) => {
      const b = { label: BUCKETS[id].label, target: targets[id] / 100 };
      const actual = summary.byBucket[id] || 0;
      const target = Math.round(summary.income * b.target);
      const share = summary.income > 0 ? actual / summary.income : 0;
      let status;
      if (summary.income <= 0) status = 'sem-renda';
      else if (id === 'futuro') status = actual >= target ? 'ok' : actual >= target / 2 ? 'atencao' : 'abaixo';
      else status = actual <= target ? 'ok' : actual <= target * 1.1 ? 'atencao' : 'acima';
      return { id, label: b.label, targetRatio: b.target, target, actual, share, status };
    });
  }

  /**
   * Situação de cada envelope (limite por categoria) no mês.
   * Categorias variáveis ganham projeção de fim de mês pelo ritmo atual de gasto.
   */
  function budgetStatus(budgets, summary, categories, key, today) {
    const days = daysInMonth(key);
    const elapsed = elapsedDays(key, today);
    return categories
      .filter((c) => c.type === 'expense' && (budgets[c.id] || 0) > 0)
      .map((c) => {
        const limit = budgets[c.id];
        const spent = summary.byCategory[c.id] || 0;
        const remaining = limit - spent;
        const ratio = spent / limit;
        let projected = spent;
        if (c.kind === 'variavel' && elapsed > 0 && elapsed < days) projected = Math.round((spent / elapsed) * days);
        let status = 'ok';
        if (spent > limit) status = 'estourado';
        else if (projected > limit) status = 'risco';
        else if (ratio >= 0.8 && c.kind === 'variavel') status = 'atencao';
        return { categoryId: c.id, name: c.name, icon: c.icon, bucket: c.bucket, kind: c.kind, limit, spent, remaining, ratio, projected, status };
      });
  }

  /**
   * Quanto dá para gastar por dia, até o fim do mês, nas categorias variáveis
   * sem estourar nenhum envelope. Retorna null fora do mês corrente.
   */
  function dailyAllowance(budgetRows, key, today) {
    if (monthKey(today) !== key) return null;
    const variable = budgetRows.filter((r) => r.kind === 'variavel');
    if (!variable.length) return null;
    const daysLeft = daysInMonth(key) - Number(today.slice(8, 10)) + 1;
    const remaining = variable.reduce((sum, r) => sum + Math.max(r.remaining, 0), 0);
    return { perDay: Math.floor(remaining / daysLeft), remaining, daysLeft };
  }

  /** Arredonda centavos para múltiplos de R$ step (padrão R$ 10). */
  function roundTo(cents, step = 1000) {
    return Math.round(cents / step) * step;
  }

  /**
   * Sugere limites por categoria distribuindo a renda pelo 50/30/20.
   * Dentro de cada balde, o peso de cada categoria segue o histórico (ou divide igualmente).
   */
  function suggestBudgets(income, categories, history = {}, targets = DEFAULT_TARGETS) {
    const result = {};
    if (!(income > 0)) return result;
    const bucketIds = Object.keys(BUCKETS);
    const bucketTotals = allocate(roundTo(income), bucketIds.map((id) => targets[id] / 100));
    bucketIds.forEach((bucketId, b) => {
      const cats = categories.filter((c) => c.type === 'expense' && c.bucket === bucketId);
      if (!cats.length) return;
      const weights = cats.map((c) => history[c.id] || 0);
      const weightSum = weights.reduce((a, b) => a + b, 0);
      const shares = cats.map((c, i) => (weightSum > 0 ? weights[i] / weightSum : 1 / cats.length));
      const values = allocate(bucketTotals[b], shares);
      cats.forEach((c, i) => {
        if (values[i] > 0) result[c.id] = values[i];
      });
    });
    return result;
  }

  /**
   * Divide um total (múltiplo de step) entre partes proporcionais, em múltiplos de step,
   * garantindo que a soma bata exatamente com o total (método do maior resto).
   */
  function allocate(total, shares, step = 1000) {
    const units = Math.round(total / step);
    const raw = shares.map((s) => s * units);
    const result = raw.map(Math.floor);
    let left = units - result.reduce((a, b) => a + b, 0);
    const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
    for (let k = 0; left > 0; k++, left--) result[order[k % order.length][1]] += 1;
    return result.map((u) => u * step);
  }

  /** Média mensal de gastos essenciais nos últimos meses com registros (antes do mês informado). */
  function averageEssential(transactions, categories, key, months = 3) {
    const totals = [];
    for (let i = 1; i <= months; i++) {
      const monthTx = transactionsOfMonth(transactions, shiftMonth(key, -i));
      if (!monthTx.length) continue;
      totals.push(summarize(monthTx, categories).byBucket.essencial);
    }
    if (!totals.length) {
      const current = summarize(transactionsOfMonth(transactions, key), categories).byBucket.essencial;
      return current;
    }
    return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
  }

  /** Reserva de emergência recomendada: 6 (renda estável) ou 12 (renda variável) meses de custos essenciais. */
  function emergencyFundTarget(transactions, categories, key, incomeProfile = 'estavel') {
    const profile = INCOME_PROFILES[incomeProfile] || INCOME_PROFILES.estavel;
    return averageEssential(transactions, categories, key) * profile.months;
  }

  function monthsBetween(fromISO, toISO) {
    const [fy, fm] = fromISO.split('-').map(Number);
    const [ty, tm] = toISO.split('-').map(Number);
    return (ty - fy) * 12 + (tm - fm);
  }

  /** Progresso de uma meta e o aporte mensal necessário para cumprir o prazo. */
  function goalProgress(goal, today) {
    const remaining = Math.max(goal.target - goal.saved, 0);
    const ratio = goal.target > 0 ? Math.min(goal.saved / goal.target, 1) : 0;
    let monthsLeft = null;
    let monthly = null;
    if (goal.deadline) {
      monthsLeft = Math.max(monthsBetween(today, goal.deadline), 1);
      monthly = Math.ceil(remaining / monthsLeft);
    }
    return { remaining, ratio, monthsLeft, monthly, done: remaining === 0 };
  }

  /**
   * Gera cópias dos lançamentos fixos (recurring) de um mês para outro,
   * ignorando os que já existem no mês de destino.
   */
  function recurringForMonth(transactions, fromKey, toKey, makeId) {
    const target = transactionsOfMonth(transactions, toKey);
    const signature = (t) => `${t.type}|${t.categoryId}|${t.amount}|${(t.description || '').trim().toLowerCase()}`;
    const existing = new Set(target.map(signature));
    const lastDay = daysInMonth(toKey);
    return transactionsOfMonth(transactions, fromKey)
      .filter((t) => t.recurring && !existing.has(signature(t)))
      .map((t) => ({
        ...t,
        id: makeId(),
        date: `${toKey}-${pad(Math.min(Number(t.date.slice(8, 10)), lastDay))}`,
        createdAt: Date.now(),
      }));
  }

  const MAX_INSTALLMENTS = 48;

  /**
   * Divide uma compra parcelada em um lançamento por mês, começando no mês da compra.
   * Centavos que sobram da divisão vão para as primeiras parcelas (a soma bate com o total).
   */
  function createInstallments(entry, count, makeId) {
    const n = Math.max(1, Math.min(Math.floor(count) || 1, MAX_INSTALLMENTS));
    const base = Math.floor(entry.amount / n);
    const remainder = entry.amount - base * n;
    const group = makeId();
    const day = Number(entry.date.slice(8, 10));
    const firstMonth = monthKey(entry.date);
    return Array.from({ length: n }, (_, i) => {
      const key = shiftMonth(firstMonth, i);
      return {
        ...entry,
        id: makeId(),
        amount: base + (i < remainder ? 1 : 0),
        date: `${key}-${pad(Math.min(day, daysInMonth(key)))}`,
        recurring: false,
        installment: { group, n: i + 1, of: n },
        createdAt: Date.now(),
      };
    });
  }

  /** Parcelas já assumidas para depois do mês informado: o futuro que já está comprometido. */
  function installmentCommitments(transactions, key) {
    const byMonth = {};
    let total = 0;
    for (const t of transactions) {
      if (!t.installment || t.type !== 'expense' || monthKey(t.date) <= key) continue;
      const m = monthKey(t.date);
      byMonth[m] = (byMonth[m] || 0) + t.amount;
      total += t.amount;
    }
    const months = Object.keys(byMonth).sort();
    return { total, byMonth, months: months.length, lastMonth: months[months.length - 1] || null };
  }

  function installmentLabel(t) {
    return t.installment ? `${t.installment.n}/${t.installment.of}` : '';
  }

  /** Mensagens práticas sobre o mês, da mais urgente para a mais positiva. */
  /** Explica por que o plano não está no 50/30/20 (só quando ele se adaptou). */
  function planInsight(plan) {
    if (!plan || (plan.profile !== 'ajustando' && plan.profile !== 'critico')) return null;
    const pct = formatPercent(plan.essentialShare);
    const split = `${plan.essencial}/${plan.estilo}/${plan.futuro}`;
    if (plan.profile === 'critico') {
      return { level: 'alerta', text: `Os essenciais consomem ${pct} da sua renda. Prioridade: reduzir custos fixos (moradia, contas, transporte) ou aumentar a renda. Seu plano agora é ${split}.` };
    }
    return { level: 'info', text: `Seu plano está em ${split} porque os essenciais somaram ${pct} da renda nos últimos meses. Conforme eles caírem, o plano volta sozinho para 50/30/20.` };
  }

  function insights({ summary, buckets, budgetRows, previousSummary, categories, commitments, plan }) {
    const list = [];
    const cats = indexCategories(categories);
    if (summary.income <= 0) {
      list.push({ level: 'info', text: 'Registre sua renda do mês para ativar a análise dos baldes.' });
    }
    if (summary.income > 0 && summary.consumption > summary.income) {
      list.push({ level: 'perigo', text: `Você gastou ${formatBRL(summary.consumption - summary.income)} a mais do que ganhou este mês. Corte primeiro no balde Estilo de vida.` });
    } else if (summary.income > 0 && summary.balance < 0) {
      list.push({ level: 'alerta', text: `Gastos mais o que você guardou passam da renda em ${formatBRL(-summary.balance)}. Reveja quanto guardar neste mês.` });
    }
    for (const row of budgetRows) {
      if (row.status === 'estourado') list.push({ level: 'perigo', text: `${row.name}: envelope estourado em ${formatBRL(-row.remaining)}.` });
    }
    for (const row of budgetRows) {
      if (row.status === 'risco') list.push({ level: 'alerta', text: `${row.name}: no ritmo atual você vai gastar ${formatBRL(row.projected)} (limite ${formatBRL(row.limit)}). Desacelere.` });
    }
    for (const b of buckets) {
      if (b.status === 'acima') list.push({ level: 'alerta', text: `${b.label} consomem ${formatPercent(b.share)} da renda (meta: até ${formatPercent(b.targetRatio)}).` });
      if (b.status === 'abaixo' || b.status === 'atencao') {
        if (b.id === 'futuro') list.push({ level: 'alerta', text: `Você guardou ${formatBRL(b.actual)} para o futuro. A meta é ${formatBRL(b.target)} — faça o aporte logo que a renda cair.` });
      }
    }
    if (previousSummary && previousSummary.expense > 0) {
      let worst = null;
      for (const id of Object.keys(summary.byCategory)) {
        const cat = cats[id];
        if (!cat || cat.bucket === 'futuro') continue;
        const diff = summary.byCategory[id] - (previousSummary.byCategory[id] || 0);
        const base = previousSummary.byCategory[id] || 0;
        if (diff > 5000 && (base === 0 || diff / base > 0.2) && (!worst || diff > worst.diff)) worst = { id, diff };
      }
      if (worst) list.push({ level: 'info', text: `${cats[worst.id].name} subiu ${formatBRL(worst.diff)} em relação ao mês passado.` });
    }
    if (commitments && commitments.total > 0) {
      list.push({ level: 'info', text: `Você já tem ${formatBRL(commitments.total)} em parcelas nos próximos ${commitments.months} ${commitments.months === 1 ? 'mês' : 'meses'} (até ${monthLabel(commitments.lastMonth)}).` });
    }
    const planMessage = planInsight(plan);
    if (planMessage) list.push(planMessage);
    const savingsGoal = (plan ? plan.futuro : DEFAULT_TARGETS.futuro) / 100;
    if (summary.income > 0 && summary.savingsRate >= savingsGoal) {
      list.push({ level: 'bom', text: `Excelente! Você guardou ${formatPercent(summary.savingsRate)} da renda.` });
    }
    if (!list.length) list.push({ level: 'bom', text: 'Tudo dentro do plano. Continue registrando cada gasto.' });
    return list;
  }

  // ---------- Importação / exportação ----------

  function emptyData() {
    return { version: DATA_VERSION, categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), transactions: [], budgets: {}, goals: [], reviews: {}, settings: { incomeProfile: 'estavel' } };
  }

  function isISODate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  }

  /** Valida e limpa dados vindos do armazenamento ou de um backup importado. */
  function normalizeData(raw) {
    const data = emptyData();
    if (!raw || typeof raw !== 'object') return data;
    if (Array.isArray(raw.categories) && raw.categories.length) {
      data.categories = raw.categories
        .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && (c.type === 'income' || c.type === 'expense'))
        .map((c) => ({
          id: c.id,
          name: c.name.slice(0, 60),
          type: c.type,
          icon: typeof c.icon === 'string' ? c.icon.slice(0, 4) : '•',
          ...(c.type === 'expense' ? { bucket: BUCKETS[c.bucket] ? c.bucket : 'estilo', kind: c.kind === 'fixa' ? 'fixa' : 'variavel' } : {}),
        }));
      // Categorias padrão criadas depois do backup também passam a existir.
      const known = new Set(data.categories.map((c) => c.id));
      for (const c of DEFAULT_CATEGORIES) if (!known.has(c.id)) data.categories.push({ ...c });
    }
    const catIds = new Set(data.categories.map((c) => c.id));
    if (Array.isArray(raw.transactions)) {
      data.transactions = raw.transactions
        .filter((t) => t && typeof t.id === 'string' && (t.type === 'income' || t.type === 'expense') && Number.isInteger(t.amount) && t.amount > 0 && isISODate(t.date) && catIds.has(t.categoryId))
        .map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          date: t.date,
          categoryId: t.categoryId,
          description: typeof t.description === 'string' ? t.description.slice(0, 120) : '',
          recurring: Boolean(t.recurring),
          createdAt: Number.isFinite(t.createdAt) ? t.createdAt : 0,
          ...(validInstallment(t.installment) ? { installment: { group: t.installment.group, n: t.installment.n, of: t.installment.of } } : {}),
        }));
    }
    if (raw.budgets && typeof raw.budgets === 'object') {
      for (const [id, value] of Object.entries(raw.budgets)) {
        if (catIds.has(id) && Number.isInteger(value) && value > 0) data.budgets[id] = value;
      }
    }
    if (Array.isArray(raw.goals)) {
      data.goals = raw.goals
        .filter((g) => g && typeof g.id === 'string' && typeof g.name === 'string' && Number.isInteger(g.target) && g.target > 0)
        .map((g) => ({
          id: g.id,
          name: g.name.slice(0, 60),
          target: g.target,
          saved: Number.isInteger(g.saved) && g.saved > 0 ? g.saved : 0,
          deadline: isISODate(g.deadline) ? g.deadline : '',
        }));
    }
    if (raw.reviews && typeof raw.reviews === 'object') {
      for (const [week, items] of Object.entries(raw.reviews)) {
        if (/^\d{4}-W\d{2}$/.test(week) && Array.isArray(items)) data.reviews[week] = items.filter((i) => typeof i === 'string');
      }
    }
    if (raw.settings && INCOME_PROFILES[raw.settings.incomeProfile]) data.settings.incomeProfile = raw.settings.incomeProfile;
    return data;
  }

  function validInstallment(i) {
    return Boolean(i) && typeof i.group === 'string' && Number.isInteger(i.of) && i.of >= 2 && i.of <= MAX_INSTALLMENTS && Number.isInteger(i.n) && i.n >= 1 && i.n <= i.of;
  }

  function csvCell(value) {
    let s = String(value == null ? '' : value);
    // Evita injeção de fórmulas ao abrir no Excel/Planilhas.
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) s = `'${s}`;
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  /** CSV com ";" e vírgula decimal, compatível com Excel em português. */
  function toCSV(transactions, categories) {
    const cats = indexCategories(categories);
    const rows = [['Data', 'Tipo', 'Categoria', 'Balde', 'Descrição', 'Valor', 'Fixo']];
    for (const t of sortTransactions(transactions)) {
      const cat = cats[t.categoryId] || {};
      rows.push([
        t.date,
        t.type === 'income' ? 'Receita' : 'Despesa',
        cat.name || t.categoryId,
        cat.bucket ? BUCKETS[cat.bucket].label : '',
        t.installment ? `${t.description} (${installmentLabel(t)})`.trim() : t.description,
        ((t.type === 'income' ? 1 : -1) * t.amount / 100).toFixed(2).replace('.', ','),
        t.recurring ? 'Sim' : 'Não',
      ]);
    }
    return rows.map((r) => r.map(csvCell).join(';')).join('\n');
  }

  return {
    DATA_VERSION,
    BUCKETS,
    DEFAULT_TARGETS,
    PLAN_PROFILES,
    essentialShare,
    adaptivePlan,
    INCOME_PROFILES,
    DEFAULT_CATEGORIES,
    parseAmount,
    formatBRL,
    formatPercent,
    todayISO,
    monthKey,
    shiftMonth,
    daysInMonth,
    monthLabel,
    elapsedDays,
    weekKey,
    indexCategories,
    transactionsOfMonth,
    sortTransactions,
    summarize,
    bucketAnalysis,
    budgetStatus,
    dailyAllowance,
    suggestBudgets,
    averageEssential,
    emergencyFundTarget,
    goalProgress,
    recurringForMonth,
    MAX_INSTALLMENTS,
    createInstallments,
    installmentCommitments,
    installmentLabel,
    insights,
    emptyData,
    normalizeData,
    toCSV,
  };
});
