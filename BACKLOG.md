# Backlog

Histórias pequenas, na ordem de prioridade. Cada uma = um ou poucos commits, com teste
quando houver regra de negócio. Marque `[x]` ao concluir.

## Parte 1 — Rascunho (spike) ✅
- [x] Núcleo do método em `js/core.js` com 14 testes
- [x] Estrutura das telas (`index.html`, `js/app.js`)

## Parte 2 — Base de XP ✅
- [x] `CLAUDE.md` com as regras do projeto
- [x] CI no GitHub Actions: ESLint, `npm audit`, testes
- [x] Este backlog
- [x] Fluxo GitHub: commits direto no `main` com CI, Dependabot, modelo de PR, licença MIT
- [x] Atualizações do Dependabot: ESLint 10, actions/checkout v7, actions/setup-node v7
- [x] Guia do método Akita em `docs/` e `CLAUDE.md` no modelo do guia (TDD vermelho → verde,
      checklist antes de cada commit, problemas já resolvidos)
- [x] Trava de commit: `.githooks/pre-commit` bloqueia commit com lint ou teste falhando

## Parte 3 — Revisão do método financeiro ✅
- [x] Baldes adaptativos: 50/30/20 quando cabe; acima de 50% em essenciais o plano se adapta
      (ex.: 60/25/15) e volta ao 50/30/20 sozinho; acima de 80% vira alerta de custo fixo
- [x] Reserva de emergência pelo tipo de renda: 6 meses (estável) ou 12 meses (variável)
- [x] Novas categorias: Impostos e taxas, Cuidados pessoais, Presentes e doações
- [x] Compras parceladas: entram no mês da compra, uma parcela por mês, com aviso do
      quanto do futuro já está comprometido

## Parte 4 — Visual e primeira versão utilizável
- [ ] `css/styles.css`: layout responsivo (celular primeiro), tema claro/escuro
- [ ] Teste manual no navegador de cada tela (Painel, Lançamentos, Orçamento, Metas, Método)
- [ ] Teste de fumaça automatizado da interface (Playwright: abrir, lançar, ver no painel)

## Parte 5 — Publicar
- [ ] README com o método e como usar
- [ ] Publicar no GitHub Pages (deploy automático pela CI)

## Refatorações (avisos do ESLint)
- [ ] `insights` (complexidade 34): quebrar em uma função por tipo de alerta
- [ ] `handleAction` (complexidade 24, 72 linhas): trocar `switch` por mapa de ações
- [ ] `parseAmount` (complexidade 19): separar detecção de separador decimal
- [ ] `normalizeData` (complexidade 22): um normalizador por coleção

## Ideias futuras (não priorizadas)
- Importar extrato do banco (OFX/CSV)
- Controle por cartão de crédito (fatura, limite, dia de fechamento)
- Plano adaptativo editável manualmente
- Categorias personalizadas pela interface
- Funcionar offline como app instalável (PWA)
