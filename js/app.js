/* Finan — interface. Depende de FinanCore (js/core.js). */
(function () {
  'use strict';

  const F = window.FinanCore;
  const STORAGE_KEY = 'finan:data';
  const TAB_KEY = 'finan:tab';
  const TABS = ['painel', 'lancamentos', 'orcamento', 'metas', 'metodo'];

  const REVIEW_ITEMS = [
    { id: 'registrar', text: 'Conferi se todos os gastos da semana foram lançados (extrato e cartão).' },
    { id: 'envelopes', text: 'Olhei os envelopes em risco e decidi onde vou segurar os gastos.' },
    { id: 'futuro', text: 'O aporte do balde Futuro deste mês já foi feito.' },
    { id: 'contas', text: 'Verifiquei as contas que vencem na próxima semana.' },
    { id: 'assinaturas', text: 'Cancelei alguma assinatura ou gasto que não uso mais (ou confirmei que todas valem a pena).' },
    { id: 'metas', text: 'Atualizei o valor guardado nas minhas metas.' },
  ];

  const TIPO_DA_CATEGORIA = { fixa: 'fixa', variavel: 'variável' };

  const STATUS_LABEL = {
    ok: 'No plano',
    atencao: 'Atenção',
    risco: 'Vai estourar',
    estourado: 'Estourado',
    acima: 'Acima da meta',
    abaixo: 'Abaixo da meta',
    'sem-renda': 'Sem renda',
  };

  // ---------- Estado e armazenamento ----------

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? F.normalizeData(JSON.parse(raw)) : F.emptyData();
    } catch (e) {
      return F.emptyData();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    } catch (e) {
      toast('Não foi possível salvar neste navegador. Faça um backup.');
    }
  }

  function loadTab() {
    try {
      const tab = localStorage.getItem(TAB_KEY);
      return TABS.includes(tab) ? tab : 'painel';
    } catch (e) {
      return 'painel';
    }
  }

  const state = {
    data: loadData(),
    month: F.monthKey(F.todayISO()),
    tab: loadTab(),
    editingId: null,
    filterText: '',
    filterCategory: '',
  };

  function newId() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const visivel = (el) => Boolean(el) && el.offsetParent !== null;

  /**
   * A tela é redesenhada com innerHTML, o que apaga o controle em que a pessoa estava e joga o
   * foco para o início da página. Quem usa teclado ou leitor de tela perderia o lugar a cada ação.
   * Guarda onde o foco está e devolve uma função que o restaura depois do redesenho: no mesmo
   * controle; se ele sumiu, no que ocupou o lugar dele (ex.: o próximo "Excluir"); e, se não
   * houver, no título do bloco onde a pessoa estava.
   */
  function guardarFoco() {
    const atual = document.activeElement;
    if (!atual || !$('main').contains(atual)) return () => {};
    const tag = atual.tagName.toLowerCase();
    const atributos = ['data-category', 'data-review', 'data-action', 'data-id'].filter((n) => atual.hasAttribute(n));
    const dosAtributos = atributos.map((n) => `[${n}="${CSS.escape(atual.getAttribute(n))}"]`).join('');
    const seletor = atual.id ? `#${CSS.escape(atual.id)}` : atributos.length ? tag + dosAtributos : null;
    const mesmaAcao = atual.dataset.action ? `${tag}[data-action="${CSS.escape(atual.dataset.action)}"]` : null;
    const posicao = mesmaAcao ? $$(mesmaAcao).filter(visivel).indexOf(atual) : -1;
    const aba = atual.closest('.tab-panel');
    const bloco = aba ? $$('.panel', aba).indexOf(atual.closest('.panel')) : -1;

    return () => {
      const agora = document.activeElement;
      if (agora && agora !== document.body && $('main').contains(agora)) return;
      let alvo = seletor && $$(seletor).find(visivel);
      if (!alvo && mesmaAcao) {
        const irmaos = $$(mesmaAcao).filter(visivel);
        alvo = irmaos[Math.min(posicao, irmaos.length - 1)];
      }
      if (!alvo && aba && bloco >= 0) alvo = $$('.panel', aba)[bloco]?.querySelector('h2');
      if (!alvo) return;
      if (!alvo.matches('button, input, select, a[href]')) alvo.tabIndex = -1;
      alvo.focus();
    };
  }

  function redesenhar() {
    const devolverFoco = guardarFoco();
    render();
    devolverFoco();
  }

  function commit(message) {
    saveData();
    redesenhar();
    if (message) toast(message);
  }

  // ---------- Utilidades de interface ----------

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function money(cents) {
    return esc(F.formatBRL(cents));
  }

  function centsToInput(cents) {
    return (cents / 100).toFixed(2).replace('.', ',');
  }

  let toastTimer;
  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function formatDay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  /** Nome falado pelos botões de um lançamento: distingue um de outro para o leitor de tela. */
  function nomeDoLancamento(t, cat) {
    const parcela = t.installment ? `, parcela ${F.installmentLabel(t)}` : '';
    return `${t.description || cat.name}${parcela}, ${F.formatBRL(t.amount)}`;
  }

  function bar(ratio, status, markerRatio) {
    const width = Math.max(0, Math.min(ratio, 1)) * 100;
    const marker = markerRatio != null ? `<span class="bar-marker" style="left:${Math.min(markerRatio, 1) * 100}%"></span>` : '';
    return `<div class="bar"><span class="bar-fill status-${esc(status)}" style="width:${width}%"></span>${marker}</div>`;
  }

  function expenseCategories() {
    return state.data.categories.filter((c) => c.type === 'expense');
  }

  // ---------- Cálculos do mês selecionado ----------

  function monthContext() {
    const today = F.todayISO();
    const cats = state.data.categories;
    const txs = F.transactionsOfMonth(state.data.transactions, state.month);
    const summary = F.summarize(txs, cats);
    const previousTx = F.transactionsOfMonth(state.data.transactions, F.shiftMonth(state.month, -1));
    const previousSummary = previousTx.length ? F.summarize(previousTx, cats) : null;
    const plan = F.adaptivePlan(F.essentialShare(state.data.transactions, cats, state.month));
    const buckets = F.bucketAnalysis(summary, plan);
    const budgetRows = F.budgetStatus(state.data.budgets, summary, cats, state.month, today);
    const commitments = F.installmentCommitments(state.data.transactions, state.month);
    return { today, txs, summary, previousSummary, plan, buckets, budgetRows, commitments };
  }

  // ---------- Renderização ----------

  function render() {
    $('#month-label').textContent = F.monthLabel(state.month);
    $$('.tabs [data-tab]').forEach((b) => {
      const active = b.dataset.tab === state.tab;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1; // só a aba atual é parada do Tab; as setas trocam de aba
    });
    TABS.forEach((t) => { $(`#tab-${t}`).hidden = t !== state.tab; });

    const ctx = monthContext();
    renderDashboard(ctx);
    renderTransactions(ctx);
    renderBudget(ctx);
    renderGoals(ctx);
    renderReview();
  }

  /** Só vale até o próximo pagamento para renda estável com o dia útil informado; senão, até o fim do mês. */
  function renderAllowance(ctx) {
    const { incomeProfile, paydayBusinessDay } = state.data.settings;
    const byPayday = incomeProfile === 'estavel' && paydayBusinessDay > 0 && state.month === F.monthKey(ctx.today);
    const allowance = byPayday
      ? F.allowanceUntilPayday(state.data.transactions, state.data.categories, state.data.budgets, ctx.today, paydayBusinessDay)
      : F.dailyAllowance(ctx.budgetRows, state.month, ctx.today);
    if (!allowance) return '';
    const dias = `${allowance.daysLeft} ${allowance.daysLeft === 1 ? 'dia' : 'dias'}`;
    const ate = byPayday ? `, até o próximo pagamento (${allowance.nextPayday.slice(8, 10)}/${allowance.nextPayday.slice(5, 7)})` : '';
    return `
      <div class="allowance">
        <div>
          <span class="card-label">Você pode gastar hoje</span>
          <span class="allowance-value">${money(allowance.perDay)}</span>
        </div>
        <p>Nesta semana, até domingo (${allowance.weekDays} ${allowance.weekDays === 1 ? 'dia' : 'dias'}): <strong>${money(allowance.perWeek)}</strong>.</p>
        <p>${money(allowance.remaining)} livres nos envelopes variáveis para os próximos ${dias}${ate}.</p>
      </div>`;
  }

  function renderDashboard(ctx) {
    const { summary, buckets, budgetRows, previousSummary, commitments, plan } = ctx;
    const hasData = state.data.transactions.length > 0;

    $('#onboarding').innerHTML = hasData ? '' : `
      <article class="panel welcome">
        <h2>Bem-vindo ao Finan 👋</h2>
        <p>Comece em 3 minutos:</p>
        <ol>
          <li>Lance sua <strong>renda do mês</strong> (salário, extras).</li>
          <li>Na aba <strong>Orçamento</strong>, clique em <em>Sugerir pelo meu plano</em> e ajuste os limites.</li>
          <li>Registre cada gasto no momento em que ele acontece.</li>
        </ol>
        <div class="actions">
          <button type="button" class="btn primary" data-action="quick-add" data-type="income">Lançar minha renda</button>
          <button type="button" class="btn" data-action="load-demo">Ver com dados de exemplo</button>
        </div>
      </article>`;

    renderCards(summary, plan);

    $('#allowance').innerHTML = renderAllowance(ctx);

    renderBuckets(summary, buckets, plan);

    const list = F.insights({ summary, buckets, budgetRows, previousSummary, commitments, plan, categories: state.data.categories });
    $('#insights').innerHTML = list.map((i) => `<li class="insight level-${esc(i.level)}">${esc(i.text)}</li>`).join('');

    const cats = F.indexCategories(state.data.categories);
    const entries = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 0;
    $('#top-categories').innerHTML = entries.length ? entries.map(([id, value]) => {
      const cat = cats[id] || { name: id, icon: '•' };
      return `
        <div class="cat-row">
          <span class="cat-name">${esc(cat.icon)} ${esc(cat.name)}</span>
          <div class="bar"><span class="bar-fill bucket-${esc(cat.bucket || 'estilo')}" style="width:${(value / max) * 100}%"></span></div>
          <span class="cat-value">${money(value)}</span>
        </div>`;
    }).join('') : '<p class="muted">Nenhuma despesa neste mês ainda.</p>';
  }

  /** Quatro números que somam a renda: Receitas = Gastos + Guardado + Sobrou. */
  function renderCards(summary, plan) {
    const temRenda = summary.income > 0;
    const sobrouClasse = summary.balance < 0 ? 'negative' : 'positive';
    const guardadoClasse = temRenda && summary.savingsRate >= plan.futuro / 100 ? 'positive' : '';
    const taxa = temRenda ? `${esc(F.formatPercent(summary.savingsRate))} da renda` : 'sem renda ainda';
    $('#summary-cards').innerHTML = `
      <div class="card"><span class="card-label">Receitas</span><span class="card-value">${money(summary.income)}</span></div>
      <div class="card"><span class="card-label">Gastos</span><span class="card-value">${money(summary.consumption)}</span><span class="card-hint">essenciais + estilo de vida</span></div>
      <div class="card"><span class="card-label">Guardado</span><span class="card-value ${guardadoClasse}">${money(summary.saved)}</span><span class="card-hint">${taxa} · meta: ${plan.futuro}% ou mais</span></div>
      <div class="card"><span class="card-label">Sobrou</span><span class="card-value ${sobrouClasse}">${money(summary.balance)}</span><span class="card-hint">renda menos o que gastou e guardou</span></div>`;
  }

  function renderBuckets(summary, buckets, plan) {
    const profile = F.PLAN_PROFILES[plan.profile];
    $('#plan-info').innerHTML = `
      <span class="badge plan-${esc(plan.profile)}">${esc(profile.label)}</span>
      <strong>${plan.essencial}/${plan.estilo}/${plan.futuro}</strong>
      <span class="muted small">essenciais / estilo de vida / futuro</span>
      <span class="muted">${esc(profile.description)}${plan.essentialShare != null ? ` Essenciais nos últimos 3 meses: ${esc(F.formatPercent(plan.essentialShare))} da renda.` : ''}</span>`;
    $('#buckets').innerHTML = buckets.map((b) => `
      <div class="bucket">
        <div class="bucket-head">
          <strong>${esc(b.label)}</strong>
          <span class="badge status-${esc(b.status)}">${esc(STATUS_LABEL[b.status])}</span>
        </div>
        ${bar(summary.income > 0 ? b.share : 0, b.status, b.targetRatio)}
        <div class="bucket-foot muted">
          <span>${money(b.actual)} · ${summary.income > 0 ? esc(F.formatPercent(b.share)) : '—'} da renda</span>
          <span>${b.id === 'futuro' ? 'mín.' : 'máx.'} ${esc(F.formatPercent(b.targetRatio))}${summary.income > 0 ? ` (${money(b.target)})` : ''}</span>
        </div>
      </div>`).join('');
  }

  function renderCategoryOptions() {
    const form = $('#tx-form');
    const type = form.elements.type.value;
    const select = form.elements.categoryId;
    const current = select.value;
    const cats = state.data.categories.filter((c) => c.type === type);
    const groups = type === 'income'
      ? [['Receitas', cats]]
      : Object.keys(F.BUCKETS).map((b) => [F.BUCKETS[b].label, cats.filter((c) => c.bucket === b)]);
    select.innerHTML = groups.map(([label, list]) => `<optgroup label="${esc(label)}">${list.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} ${esc(c.icon)}</option>`).join('')}</optgroup>`).join('');
    if (cats.some((c) => c.id === current)) select.value = current;
    // Parcelamento só para despesas novas; editar muda apenas a parcela escolhida.
    $('#installments-field').hidden = type !== 'expense' || Boolean(state.editingId);
  }

  function renderTransactions(ctx) {
    renderCategoryOptions();
    const filterSelect = $('#filter-category');
    const selected = state.filterCategory;
    filterSelect.innerHTML = `<option value="">Todas as categorias</option>` +
      state.data.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} ${esc(c.icon)}</option>`).join('');
    filterSelect.value = selected;

    const cats = F.indexCategories(state.data.categories);
    const text = state.filterText.trim().toLowerCase();
    const list = F.sortTransactions(ctx.txs).filter((t) =>
      (!state.filterCategory || t.categoryId === state.filterCategory) &&
      (!text || (t.description || '').toLowerCase().includes(text) || (cats[t.categoryId] && cats[t.categoryId].name.toLowerCase().includes(text))));

    if (!list.length) {
      $('#tx-list').innerHTML = `<p class="muted">${ctx.txs.length ? 'Nenhum lançamento encontrado com esse filtro.' : 'Nenhum lançamento neste mês.'}</p>`;
      return;
    }

    let html = '';
    let lastDate = null;
    for (const t of list) {
      if (t.date !== lastDate) {
        if (lastDate) html += '</ul>';
        html += `<h3 class="day">${esc(formatDay(t.date))}</h3><ul class="tx-list">`;
        lastDate = t.date;
      }
      const cat = cats[t.categoryId] || { name: t.categoryId, icon: '•' };
      const nome = esc(nomeDoLancamento(t, cat));
      html += `
        <li class="tx">
          <span class="tx-icon" aria-hidden="true">${esc(cat.icon)}</span>
          <span class="tx-main">
            <span class="tx-desc">${esc(t.description || cat.name)}${t.recurring ? ' <span class="tag">fixo</span>' : ''}${t.installment ? ` <span class="tag">${esc(F.installmentLabel(t))}</span>` : ''}</span>
            <span class="tx-cat muted">${esc(cat.name)}</span>
          </span>
          <span class="tx-amount ${t.type === 'income' ? 'positive' : ''}">${t.type === 'income' ? '+' : '−'} ${money(t.amount)}</span>
          <span class="tx-actions">
            <button type="button" class="icon-btn" data-action="edit-tx" data-id="${esc(t.id)}" aria-label="Editar ${nome}">✎</button>
            <button type="button" class="icon-btn" data-action="delete-tx" data-id="${esc(t.id)}" aria-label="Excluir ${nome}">🗑</button>
          </span>
        </li>`;
    }
    $('#tx-list').innerHTML = html + '</ul>';
  }

  function renderBudget(ctx) {
    const { summary, budgetRows, plan } = ctx;
    const rows = Object.fromEntries(budgetRows.map((r) => [r.categoryId, r]));
    const totalBudget = expenseCategories().reduce((sum, c) => sum + (state.data.budgets[c.id] || 0), 0);
    const unassigned = summary.income - totalBudget;

    let zb;
    if (summary.income <= 0) zb = '<div class="notice">Lance a renda deste mês para comparar com o orçamento.</div>';
    else if (unassigned > 0) zb = `<div class="notice warn">Faltam <strong>${money(unassigned)}</strong> sem destino. Distribua nos envelopes (de preferência para o Futuro: reserva, investimentos ou dívidas).</div>`;
    else if (unassigned < 0) zb = `<div class="notice danger">Seu orçamento passa a renda em <strong>${money(-unassigned)}</strong>. Reduza algum envelope.</div>`;
    else zb = '<div class="notice ok">Tudo certo: cada real da renda tem um destino. 🎯</div>';
    $('#zero-based').innerHTML = zb;

    $('#budget-table').innerHTML = Object.keys(F.BUCKETS).map((bucketId) => {
      const cats = expenseCategories().filter((c) => c.bucket === bucketId);
      const bucketBudget = cats.reduce((sum, c) => sum + (state.data.budgets[c.id] || 0), 0);
      const share = summary.income > 0 ? ` · ${F.formatPercent(bucketBudget / summary.income)} da renda` : '';
      return `
        <div class="budget-group">
          <h3>${esc(F.BUCKETS[bucketId].label)} <span class="muted">${money(bucketBudget)}${esc(share)} (meta ${plan[bucketId]}%)</span></h3>
          ${cats.map((c) => {
            const r = rows[c.id];
            const limit = state.data.budgets[c.id] || 0;
            const spent = summary.byCategory[c.id] || 0;
            const detail = r
              ? `${money(r.spent)} de ${money(r.limit)} · ${r.remaining >= 0 ? `restam ${money(r.remaining)}` : `passou ${money(-r.remaining)}`}${r.status === 'risco' ? ` · projeção ${money(r.projected)}` : ''}`
              : (spent ? `${money(spent)} gastos · sem limite definido` : 'sem limite definido');
            return `
              <div class="budget-row">
                <div class="budget-info">
                  <span class="cat-name">${esc(c.icon)} ${esc(c.name)} <span class="tag">${esc(TIPO_DA_CATEGORIA[c.kind] || c.kind)}</span></span>
                  ${r ? bar(r.ratio, r.status) : ''}
                  <span class="muted small">${detail}</span>
                </div>
                <div class="budget-side">
                  ${r ? `<span class="badge status-${esc(r.status)}">${esc(STATUS_LABEL[r.status])}</span>` : ''}
                  <input class="budget-input" data-category="${esc(c.id)}" inputmode="decimal" aria-label="Limite para ${esc(c.name)}" placeholder="Limite" value="${limit ? esc(centsToInput(limit)) : ''}">
                </div>
              </div>`;
          }).join('')}
        </div>`;
    }).join('');
  }

  function renderPayday(profileId) {
    if (profileId !== 'estavel') return '<p class="muted small">Com renda variável, o "Você pode gastar hoje" do Painel conta até o fim do mês.</p>';
    const atual = state.data.settings.paydayBusinessDay;
    const opcoes = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${atual === i + 1 ? 'selected' : ''}>${i + 1}º dia útil</option>`).join('');
    return `
      <label>Em que dia útil você recebe?
        <select id="payday">
          <option value="0" ${atual ? '' : 'selected'}>Não informar (contar até o fim do mês)</option>
          ${opcoes}
        </select>
      </label>
      <p class="muted small">Com o dia informado, o "Você pode gastar hoje" do Painel passa a durar até o seu próximo pagamento. Só sábado e domingo contam como folga; feriados não.</p>`;
  }

  function renderGoals(ctx) {
    const profileId = state.data.settings.incomeProfile;
    const months = F.INCOME_PROFILES[profileId].months;
    const target = F.emergencyFundTarget(state.data.transactions, state.data.categories, state.month, profileId);
    const saved = state.data.goals.find((g) => /reserva/i.test(g.name));
    let goalAction = '';
    if (target > 0 && !saved) goalAction = `<button type="button" class="btn primary" data-action="create-emergency" data-target="${target}">Criar meta de reserva</button>`;
    else if (target > 0 && saved.target !== target) goalAction = `<button type="button" class="btn" data-action="update-emergency" data-id="${esc(saved.id)}" data-target="${target}">Atualizar minha meta para ${money(target)}</button>`;
    $('#emergency').innerHTML = `
      <article class="panel emergency">
        <h2>🛟 Reserva de emergência</h2>
        <label>Seu tipo de renda
          <select id="income-profile">
            ${Object.entries(F.INCOME_PROFILES).map(([id, p]) => `<option value="${esc(id)}" ${id === profileId ? 'selected' : ''}>${esc(p.label)} — ${p.months} meses</option>`).join('')}
          </select>
        </label>
        ${renderPayday(profileId)}
        ${target > 0 ? `
          <p>Com base nos seus gastos essenciais, sua reserva ideal é de <strong>${money(target)}</strong> (${months} meses de custo de vida).</p>
          ${goalAction}`
        : `<p class="muted">Registre seus gastos essenciais (moradia, mercado, contas…) para calcularmos o valor ideal da sua reserva: ${months} meses de custo de vida.</p>`}
        <p class="muted small">Deixe a reserva em um investimento seguro e com resgate imediato. Ela é o que impede um imprevisto de virar dívida.</p>
      </article>`;

    if (!state.data.goals.length) {
      $('#goal-list').innerHTML = '<p class="muted">Nenhuma meta ainda. Metas com valor e prazo dão motivo para cada real economizado.</p>';
      return;
    }
    $('#goal-list').innerHTML = state.data.goals.map((g) => {
      const p = F.goalProgress(g, ctx.today, state.data.transactions);
      return `
        <div class="goal">
          <div class="goal-head">
            <strong>${esc(g.name)}</strong>
            <span>${money(F.goalSaved(g, state.data.transactions))} de ${money(g.target)}</span>
          </div>
          ${bar(p.ratio, p.done ? 'ok' : 'progresso')}
          <div class="goal-foot muted small">
            <span>${p.done ? 'Meta concluída! 🎉' : `${esc(F.formatPercent(p.ratio))} · faltam ${money(p.remaining)}`}${!p.done && p.monthly ? ` · guarde ${money(p.monthly)}/mês por ${p.monthsLeft} ${p.monthsLeft === 1 ? 'mês' : 'meses'}` : ''}</span>
            <span class="actions">
              ${p.done ? '' : `<button type="button" class="btn small" data-action="deposit-goal" data-id="${esc(g.id)}" aria-label="Guardar valor na meta ${esc(g.name)}">Guardar valor</button>`}
              <button type="button" class="icon-btn" data-action="delete-goal" data-id="${esc(g.id)}" aria-label="Excluir meta ${esc(g.name)}">🗑</button>
            </span>
          </div>
        </div>`;
    }).join('');
  }

  function renderReview() {
    const week = F.weekKey(F.todayISO());
    const done = new Set(state.data.reviews[week] || []);
    $('#week-label').textContent = `· semana ${week.split('-W')[1]}`;
    $('#review-list').innerHTML = REVIEW_ITEMS.map((item) => `
      <li><label class="check"><input type="checkbox" data-review="${esc(item.id)}" ${done.has(item.id) ? 'checked' : ''}> ${esc(item.text)}</label></li>`).join('') +
      (done.size === REVIEW_ITEMS.length ? '<li class="insight level-bom">Revisão da semana concluída. Você está no controle! 💪</li>' : '');
  }

  // ---------- Formulário de lançamentos ----------

  function resetTxForm() {
    const form = $('#tx-form');
    form.reset();
    state.editingId = null;
    form.elements.date.value = defaultDate();
    $('#form-title').textContent = 'Novo lançamento';
    $('#tx-submit').textContent = 'Salvar';
    $('[data-action="cancel-edit"]').hidden = true;
    $('#tx-error').textContent = '';
    renderCategoryOptions();
  }

  function defaultDate() {
    const today = F.todayISO();
    return F.monthKey(today) === state.month ? today : `${state.month}-01`;
  }

  function startEdit(id) {
    const t = state.data.transactions.find((x) => x.id === id);
    if (!t) return;
    const form = $('#tx-form');
    state.editingId = id;
    form.elements.type.value = t.type;
    renderCategoryOptions();
    form.elements.amount.value = centsToInput(t.amount);
    form.elements.categoryId.value = t.categoryId;
    form.elements.date.value = t.date;
    form.elements.description.value = t.description;
    form.elements.recurring.checked = t.recurring;
    $('#form-title').textContent = 'Editar lançamento';
    $('#tx-submit').textContent = 'Salvar alterações';
    $('[data-action="cancel-edit"]').hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.elements.amount.focus();
  }

  function submitTx(event) {
    event.preventDefault();
    const form = event.target;
    const amount = F.parseAmount(form.elements.amount.value);
    const date = form.elements.date.value;
    const error = $('#tx-error');
    if (!(amount > 0)) {
      error.textContent = 'Informe um valor maior que zero, por exemplo 25,90.';
      form.elements.amount.focus();
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      error.textContent = 'Informe uma data válida.';
      return;
    }
    const entry = {
      type: form.elements.type.value,
      amount,
      date,
      categoryId: form.elements.categoryId.value,
      description: form.elements.description.value.trim().slice(0, 120),
      recurring: form.elements.recurring.checked,
    };
    const installments = entry.type === 'expense' ? Number(form.elements.installments.value) || 1 : 1;
    const doMes = installments > 1 ? Math.ceil(amount / installments) : amount; // o que cai no mês da compra
    if (!state.editingId && guardaDinheiro(entry) && !confirmarGuardar(doMes, F.monthKey(date))) return;
    let message;
    if (state.editingId) {
      const idx = state.data.transactions.findIndex((t) => t.id === state.editingId);
      if (idx > -1) {
        const current = state.data.transactions[idx];
        state.data.transactions[idx] = { ...current, ...entry, recurring: current.installment ? false : entry.recurring };
      }
      message = 'Lançamento atualizado.';
    } else if (installments > 1) {
      const parcels = F.createInstallments(entry, installments, newId);
      state.data.transactions.push(...parcels);
      message = `Compra de ${F.formatBRL(amount)} em ${parcels.length}x de ${F.formatBRL(parcels[0].amount)} lançada.`;
    } else {
      state.data.transactions.push({ id: newId(), createdAt: Date.now(), ...entry });
      message = `${entry.type === 'income' ? 'Receita' : 'Despesa'} de ${F.formatBRL(amount)} lançada.`;
    }
    const keepType = entry.type;
    const keepDate = entry.date;
    const movedMonth = F.monthKey(date) !== state.month;
    if (movedMonth) state.month = F.monthKey(date);
    resetTxForm();
    form.elements.type.value = keepType;
    form.elements.date.value = keepDate;
    commit(message);
    form.elements.amount.focus();
  }

  // ---------- Ações ----------

  function deleteTransaction(id) {
    const t = state.data.transactions.find((x) => x.id === id);
    if (!t) return;
    let ids = [id];
    if (t.installment && confirm(`Esta compra foi parcelada em ${t.installment.of}x. Excluir todas as parcelas?`)) {
      ids = state.data.transactions.filter((x) => x.installment && x.installment.group === t.installment.group).map((x) => x.id);
    } else if (!confirm(t.installment ? 'Excluir só esta parcela?' : 'Excluir este lançamento?')) {
      return;
    }
    const remove = new Set(ids);
    state.data.transactions = state.data.transactions.filter((x) => !remove.has(x.id));
    if (remove.has(state.editingId)) resetTxForm();
    commit(ids.length > 1 ? `${ids.length} parcelas excluídas.` : 'Lançamento excluído.');
  }

  function copyRecurring() {
    const from = F.shiftMonth(state.month, -1);
    const copies = F.recurringForMonth(state.data.transactions, from, state.month, newId);
    if (!copies.length) {
      toast('Nenhum lançamento fixo novo para trazer do mês anterior.');
      return;
    }
    state.data.transactions.push(...copies);
    commit(`${copies.length} lançamento(s) fixo(s) copiados.`);
  }

  function suggestBudget() {
    const summary = F.summarize(F.transactionsOfMonth(state.data.transactions, state.month), state.data.categories);
    let income = summary.income;
    let history = summary.byCategory;
    if (!(income > 0)) {
      const prev = F.summarize(F.transactionsOfMonth(state.data.transactions, F.shiftMonth(state.month, -1)), state.data.categories);
      income = prev.income;
      history = prev.byCategory;
    }
    if (!(income > 0)) {
      toast('Lance sua renda primeiro para receber uma sugestão.');
      return;
    }
    const hasBudget = Object.keys(state.data.budgets).length > 0;
    const { plan } = monthContext();
    if (hasBudget && !confirm(`Substituir os limites atuais pela sugestão do seu plano (${plan.essencial}/${plan.estilo}/${plan.futuro})?`)) return;
    state.data.budgets = F.suggestBudgets(income, state.data.categories, history, plan);
    commit('Orçamento sugerido. Ajuste os valores à sua realidade.');
  }

  /** Avisa antes de guardar mais do que sobrou no mês. Devolve false se a pessoa desistir. */
  function confirmarGuardar(valor, mes) {
    const resumo = F.summarize(F.transactionsOfMonth(state.data.transactions, mes), state.data.categories);
    const depois = F.leftAfterSaving(resumo, valor);
    if (depois === null || depois >= 0) return true;
    return confirm(`Guardar ${F.formatBRL(valor)} deixa ${F.monthLabel(mes)} no vermelho: depois de guardar, faltariam ${F.formatBRL(-depois)}. Quer guardar mesmo assim?`);
  }

  function guardaDinheiro(entry) {
    const categoria = F.indexCategories(state.data.categories)[entry.categoryId];
    return entry.type === 'expense' && Boolean(categoria) && categoria.bucket === 'futuro';
  }

  function depositGoal(id) {
    const goal = state.data.goals.find((g) => g.id === id);
    if (!goal) return;
    const input = prompt(`Quanto você guardou para "${goal.name}"? (R$)`);
    if (input == null) return;
    const amount = F.parseAmount(input);
    if (!(amount > 0)) {
      toast('Valor inválido.');
      return;
    }
    if (!confirmarGuardar(amount, F.monthKey(F.todayISO()))) return;
    // Guardar numa meta é guardar: vira um lançamento do Futuro, ligado à meta, que conta no Painel.
    state.data.transactions.push(F.createGoalDeposit(goal, amount, F.todayISO(), newId()));
    commit(`${F.formatBRL(amount)} adicionados à meta.`);
  }

  function submitGoal(event) {
    event.preventDefault();
    const form = event.target;
    const target = F.parseAmount(form.elements.target.value);
    const saved = form.elements.saved.value ? F.parseAmount(form.elements.saved.value) : 0;
    const error = $('#goal-error');
    if (!(target > 0)) {
      error.textContent = 'Informe o valor total da meta.';
      return;
    }
    if (!(saved >= 0)) {
      error.textContent = 'Valor guardado inválido.';
      return;
    }
    const month = form.elements.deadline.value;
    state.data.goals.push({
      id: newId(),
      name: form.elements.name.value.trim().slice(0, 60) || 'Meta',
      target,
      saved,
      deadline: month ? `${month}-01` : '',
    });
    form.reset();
    error.textContent = '';
    commit('Meta criada.');
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = F.normalizeData(JSON.parse(reader.result));
        if (!confirm(`Restaurar backup com ${data.transactions.length} lançamento(s)? Os dados atuais serão substituídos.`)) return;
        state.data = data;
        commit('Backup restaurado.');
      } catch (e) {
        toast('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  }

  function demoData() {
    const data = F.emptyData();
    const today = F.todayISO();
    const current = F.monthKey(today);
    const todayDay = Number(today.slice(8, 10));
    const add = (month, day, type, categoryId, reais, description, recurring = false) => {
      const d = Math.min(day, F.daysInMonth(month));
      if (month === current && d > todayDay) return;
      data.transactions.push({ id: newId(), type, categoryId, amount: Math.round(reais * 100), date: `${month}-${String(d).padStart(2, '0')}`, description, recurring, createdAt: Date.now() });
    };
    for (let i = 2; i >= 0; i--) {
      const m = F.shiftMonth(current, -i);
      const k = 1 + (2 - i) * 0.08;
      add(m, 1, 'income', 'salario', 5200, 'Salário', true);
      add(m, 1, 'expense', 'investimentos', 600, 'Aporte mensal', true);
      add(m, 1, 'expense', 'reserva', 300, 'Reserva', true);
      add(m, 5, 'expense', 'moradia', 1500, 'Aluguel', true);
      add(m, 8, 'expense', 'contas', 280, 'Luz, água e internet', true);
      add(m, 10, 'expense', 'assinaturas', 55.9, 'Streaming e música', true);
      add(m, 3, 'expense', 'mercado', 320 * k, 'Mercado do mês');
      add(m, 12, 'expense', 'mercado', 180 * k, 'Feira e hortifrúti');
      add(m, 20, 'expense', 'mercado', 210, 'Reposição');
      add(m, 2, 'expense', 'transporte', 150, 'Recarga do transporte');
      add(m, 15, 'expense', 'transporte', 90, 'Aplicativo de corrida');
      add(m, 6, 'expense', 'restaurantes', 85 * k, 'Pizza');
      add(m, 9, 'expense', 'restaurantes', 62 * k, 'Almoço fora');
      add(m, 13, 'expense', 'restaurantes', 110 * k, 'Delivery');
      add(m, 18, 'expense', 'lazer', 120, 'Cinema e passeio');
      add(m, 22, 'expense', 'compras', 199.9, 'Roupa');
      add(m, 25, 'expense', 'saude', 75, 'Farmácia');
    }
    data.budgets = {
      moradia: 150000, contas: 30000, mercado: 75000, transporte: 25000, saude: 15000,
      restaurantes: 35000, lazer: 25000, compras: 30000, assinaturas: 6000, outros: 10000,
      reserva: 30000, investimentos: 60000,
    };
    data.goals = [
      { id: newId(), name: 'Reserva de emergência', target: 1800000, saved: 450000, deadline: '' },
      { id: newId(), name: 'Viagem de férias', target: 600000, saved: 120000, deadline: `${F.shiftMonth(current, 10)}-01` },
    ];
    return data;
  }

  function handleAction(action, el) {
    switch (action) {
      case 'prev-month':
      case 'next-month':
        state.month = F.shiftMonth(state.month, action === 'prev-month' ? -1 : 1);
        if (!state.editingId) $('#tx-form').elements.date.value = defaultDate();
        render();
        break;
      case 'quick-add':
        state.tab = 'lancamentos';
        if (el && el.dataset.type) $('#tx-form').elements.type.value = el.dataset.type;
        render();
        $('#tx-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('#tx-form').elements.amount.focus();
        break;
      case 'cancel-edit':
        resetTxForm();
        break;
      case 'edit-tx':
        startEdit(el.dataset.id);
        break;
      case 'delete-tx':
        deleteTransaction(el.dataset.id);
        break;
      case 'copy-recurring':
        copyRecurring();
        break;
      case 'export-csv':
        download(`finan-${state.month}.csv`, '﻿' + F.toCSV(F.transactionsOfMonth(state.data.transactions, state.month), state.data.categories), 'text/csv;charset=utf-8');
        break;
      case 'suggest-budget':
        suggestBudget();
        break;
      case 'create-emergency':
        state.data.goals.unshift({ id: newId(), name: 'Reserva de emergência', target: Number(el.dataset.target), saved: 0, deadline: '' });
        commit('Meta de reserva criada.');
        break;
      case 'update-emergency': {
        const goal = state.data.goals.find((g) => g.id === el.dataset.id);
        if (goal) goal.target = Number(el.dataset.target);
        commit('Meta de reserva atualizada.');
        break;
      }
      case 'deposit-goal':
        depositGoal(el.dataset.id);
        break;
      case 'delete-goal':
        if (confirm('Excluir esta meta?')) {
          state.data.goals = state.data.goals.filter((g) => g.id !== el.dataset.id);
          commit('Meta excluída.');
        }
        break;
      case 'export-json':
        download(`finan-backup-${F.todayISO()}.json`, JSON.stringify(state.data, null, 2), 'application/json');
        break;
      case 'load-demo':
        if (state.data.transactions.length && !confirm('Substituir seus dados pelos dados de exemplo?')) return;
        state.data = demoData();
        state.month = F.monthKey(F.todayISO());
        state.tab = 'painel';
        commit('Dados de exemplo carregados. Use "Apagar tudo" para começar do zero.');
        break;
      case 'reset':
        if (confirm('Apagar TODOS os lançamentos, orçamentos e metas deste navegador? Não dá para desfazer.')) {
          state.data = F.emptyData();
          resetTxForm();
          commit('Dados apagados.');
        }
        break;
      default:
        break;
    }
  }

  // ---------- Eventos ----------

  function abrirAba(tab) {
    state.tab = tab;
    try { localStorage.setItem(TAB_KEY, state.tab); } catch (e) { /* preferência opcional */ }
    render();
  }

  // Padrão de abas do teclado: setas, Home e End trocam de aba e levam o foco junto.
  $('[role="tablist"]').addEventListener('keydown', (event) => {
    const atual = TABS.indexOf(state.tab);
    const destino = { ArrowRight: (atual + 1) % TABS.length, ArrowLeft: (atual + TABS.length - 1) % TABS.length, Home: 0, End: TABS.length - 1 }[event.key];
    if (destino === undefined) return;
    event.preventDefault();
    abrirAba(TABS[destino]);
    $(`[data-tab="${TABS[destino]}"]`).focus();
  });

  document.addEventListener('click', (event) => {
    const tabBtn = event.target.closest('[data-tab]');
    if (tabBtn) {
      abrirAba(tabBtn.dataset.tab);
      return;
    }
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) handleAction(actionEl.dataset.action, actionEl);
  });

  $('#tx-form').addEventListener('submit', submitTx);
  $('#tx-form').addEventListener('change', (event) => {
    if (event.target.name === 'type') renderCategoryOptions();
  });
  $('#goal-form').addEventListener('submit', submitGoal);
  $('#emergency').addEventListener('change', (event) => {
    if (event.target.id === 'payday') {
      state.data.settings.paydayBusinessDay = Number(event.target.value);
      commit('Dia de pagamento atualizado.');
    } else if (event.target.id === 'income-profile') {
      state.data.settings.incomeProfile = event.target.value;
      commit('Tipo de renda atualizado.');
    }
  });

  $('#filter-text').addEventListener('input', (event) => {
    state.filterText = event.target.value;
    renderTransactions(monthContext());
  });
  $('#filter-category').addEventListener('change', (event) => {
    state.filterCategory = event.target.value;
    renderTransactions(monthContext());
  });

  $('#budget-table').addEventListener('change', (event) => {
    const input = event.target.closest('.budget-input');
    if (!input) return;
    const id = input.dataset.category;
    const value = input.value.trim() ? F.parseAmount(input.value) : 0;
    if (Number.isNaN(value) || value < 0) {
      toast('Limite inválido.');
      input.value = state.data.budgets[id] ? centsToInput(state.data.budgets[id]) : '';
      return;
    }
    if (value > 0) state.data.budgets[id] = value;
    else delete state.data.budgets[id];
    saveData();
    const categoria = F.indexCategories(state.data.categories)[id];
    const nome = categoria ? categoria.name : id;
    toast(value > 0 ? `Limite de ${nome} salvo: ${F.formatBRL(value)}.` : `Limite de ${nome} removido.`);
    // Adia o redesenho: com Tab, o foco ainda está chegando ao campo seguinte quando o "change" dispara.
    setTimeout(redesenhar, 0);
  });

  $('#review-list').addEventListener('change', (event) => {
    const box = event.target.closest('[data-review]');
    if (!box) return;
    const week = F.weekKey(F.todayISO());
    const done = new Set(state.data.reviews[week] || []);
    if (box.checked) done.add(box.dataset.review);
    else done.delete(box.dataset.review);
    state.data.reviews[week] = Array.from(done);
    commit();
  });

  $('#import-file').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) importBackup(file);
    event.target.value = '';
  });

  // Atalho: tecla "n" abre um novo lançamento.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      event.preventDefault();
      handleAction('quick-add');
    }
  });

  resetTxForm();
  render();
})();
