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

## Parte 3 — Revisão do método financeiro
- [ ] Revisar juntos as regras: 50/30/20, categorias padrão, fixa vs. variável, reserva de 6 meses
- [ ] Ajustar `core.js` e testes conforme as decisões

## Parte 4 — Visual e primeira versão utilizável
- [ ] `css/styles.css`: layout responsivo (celular primeiro), tema claro/escuro
- [ ] Teste manual no navegador de cada tela (Painel, Lançamentos, Orçamento, Metas, Método)
- [ ] Teste de fumaça automatizado da interface (Playwright: abrir, lançar, ver no painel)

## Parte 5 — Publicar
- [ ] README com o método e como usar
- [ ] Publicar no GitHub Pages (deploy automático pela CI)

## Refatorações (avisos do ESLint)
- [ ] `insights` (complexidade 29): quebrar em uma função por tipo de alerta
- [ ] `handleAction` (complexidade 24, 70 linhas): trocar `switch` por mapa de ações
- [ ] `parseAmount` (complexidade 19): separar detecção de separador decimal
- [ ] `normalizeData` (complexidade 18): um normalizador por coleção

## Ideias futuras (não priorizadas)
- Importar extrato do banco (OFX/CSV)
- Parcelamentos no cartão de crédito
- Categorias personalizadas pela interface
- Funcionar offline como app instalável (PWA)
