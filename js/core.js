/*
 * Finan — núcleo de regras do Método Finan.
 * Funções puras (sem DOM, sem armazenamento), usadas pelo app e pelos testes.
 * Valores monetários são sempre inteiros em centavos para evitar erros de arredondamento.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FinanCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DATA_VERSION = 1;

  // Os três baldes do 50/30/20.
  const BUCKETS = {
    essencial: { label: 'Essenciais', target: 0.5, description: 'O que você precisa para viver: moradia, mercado, contas, transporte, saúde.' },
    estilo: { label: 'Estilo de vida', target: 0.3, description: 'O que deixa a vida boa, mas é opcional: lazer, delivery, compras, assinaturas.' },
    futuro: { label: 'Futuro', target: 0.2, description: 'Pague-se primeiro: reserva de emergência, investimentos e quitação de dívidas.' },
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

    { id: 'restaurantes', name: 'Restaurantes e delivery', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🍔' },
    { id: 'lazer', name: 'Lazer', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🎬' },
    { id: 'compras', name: 'Compras', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🛍️' },
    { id: 'assinaturas', name: 'Assinaturas', type: 'expense', bucket: 'estilo', kind: 'fixa', icon: '📺' },
    { id: 'outros', name: 'Outros gastos', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '📦' },

    { id: 'reserva', name: 'Reserva de emergência', type: 'expense', bucket: 'futuro', kind: 'fixa', icon: '🛟' },
    { id: 'investimentos', name: 'Investimentos', type: 'expense', bucket: 'futuro', kind: 'fixa', icon: '📈' },
    { id: 'dividas', name: 'Quitação de dívidas', type: 'expense', bucket: 'futuro', kind: 'fixa', icon: '⛓️' },
  ];

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
    const consumption = byBucket.essencial + byBucket.estilo;
    const balance = income - expense;
    // Taxa de poupança: tudo o que não foi consumido (aportes no "Futuro" + sobra).
    const savingsRate = income > 0 ? (income - consumption) / income : 0;
    return { income, expense, balance, consumption, savingsRate, byCategory, byBucket };
  }

  /** Compara o realizado de cada balde com a meta 50/30/20. */
  function bucketAnalysis(summary, buckets = BUCKETS) {
    return Object.keys(buckets).map((id) => {
      const b = buckets[id];
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
  function suggestBudgets(income, categories, history = {}) {
    const result = {};
    if (!(income > 0)) return result;
    for (const bucketId of Object.keys(BUCKETS)) {
      const cats = categories.filter((c) => c.type === 'expense' && c.bucket === bucketId);
      if (!cats.length) continue;
      const total = income * BUCKETS[bucketId].target;
      const weights = cats.map((c) => history[c.id] || 0);
      const weightSum = weights.reduce((a, b) => a + b, 0);
      cats.forEach((c, i) => {
        const share = weightSum > 0 ? weights[i] / weightSum : 1 / cats.length;
        const value = roundTo(total * share);
        if (value > 0) result[c.id] = value;
      });
    }
    return result;
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

  /** Reserva de emergência recomendada: 6 meses de custos essenciais. */
  function emergencyFundTarget(transactions, categories, key, multiplier = 6) {
    return averageEssential(transactions, categories, key) * multiplier;
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

  /** Mensagens práticas sobre o mês, da mais urgente para a mais positiva. */
  function insights({ summary, buckets, budgetRows, previousSummary, categories }) {
    const list = [];
    const cats = indexCategories(categories);
    if (summary.income <= 0) {
      list.push({ level: 'info', text: 'Registre sua renda do mês para ativar a análise 50/30/20.' });
    }
    if (summary.income > 0 && summary.balance < 0) {
      list.push({ level: 'perigo', text: `Você gastou ${formatBRL(-summary.balance)} a mais do que ganhou este mês. Corte primeiro no balde Estilo de vida.` });
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
    if (summary.income > 0 && summary.savingsRate >= 0.2) {
      list.push({ level: 'bom', text: `Excelente! Sua taxa de poupança está em ${formatPercent(summary.savingsRate)}.` });
    }
    if (!list.length) list.push({ level: 'bom', text: 'Tudo dentro do plano. Continue registrando cada gasto.' });
    return list;
  }

  // ---------- Importação / exportação ----------

  function emptyData() {
    return { version: DATA_VERSION, categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), transactions: [], budgets: {}, goals: [], reviews: {} };
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
    return data;
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
        t.description,
        ((t.type === 'income' ? 1 : -1) * t.amount / 100).toFixed(2).replace('.', ','),
        t.recurring ? 'Sim' : 'Não',
      ]);
    }
    return rows.map((r) => r.map(csvCell).join(';')).join('\n');
  }

  return {
    DATA_VERSION,
    BUCKETS,
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
    insights,
    emptyData,
    normalizeData,
    toCSV,
  };
});
