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
- [x] `css/styles.css`: visual base (cores, tipografia, botões, campos, cartões e Painel),
      celular primeiro, com testes de acessibilidade (`tests/css.test.js`) e auditoria axe-core
- [x] Visual da tela Lançamentos: formulário para o polegar e lista por dia
- [ ] Visual das telas Orçamento (envelopes), Metas e Método
- [ ] Tema escuro (segue a configuração do celular)
- [ ] Sugestão: barra de navegação fixa embaixo no celular. As 5 abas não cabem na largura de
      390px (Metas e Método ficam escondidas à direita) e o polegar alcança melhor o rodapé
- [ ] Sugestão: `scrollIntoView` em `app.js` ignora "reduzir movimento"; trocar por `behavior: auto`
      quando `prefers-reduced-motion: reduce`
- [ ] Teste manual no navegador de cada tela (Painel, Lançamentos, Orçamento, Metas, Método)
- [x] Teste no navegador na CI (Playwright): abrir o app, lançar uma despesa e ver no Painel
- [x] Teste no navegador: receita e despesa continuam lá depois de recarregar a página

## Parte 5 — Publicar
- [ ] README com o método e como usar
- [x] Revisão de segurança antes de publicar: nenhum segredo ou dado pessoal no repositório;
      testes no navegador provam que texto malicioso (digitado ou vindo de backup) aparece
      como texto e não executa, e que o app não faz nenhuma requisição de rede
- [x] Workflow `publicar.yml` pronto (publicação manual, só `index.html`, `css/` e `js/`,
      depois de lint e testes)
- [ ] Isaac: trocar o branch padrão para `main` (Settings > General) e ligar o Pages
      (Settings > Pages > Source: GitHub Actions)
- [ ] Disparar a primeira publicação e conferir o link; depois publicar sozinho a cada push
      em `main` com a CI verde
- [ ] Sugestão: Content-Security-Policy no `index.html` (`connect-src 'none'`) para o próprio
      navegador impedir qualquer envio de dados, mesmo que um bug futuro tente

## Achados do teste como usuário leigo (30/09/2026)
Feito por mim, sozinho, como alguém que não entende de finanças nem do app (celular 390px e PC
1280px, teclado, zoom 200%, axe-core, leitor de tela via árvore de acessibilidade). Cada item
tem que virar teste no navegador antes da correção.

Prioridade alta
- [x] "Lançar minha renda" (tela de boas-vindas) abre o formulário em Receita / Salário
      (antes abria em Despesa / Moradia e a pessoa registrava o salário como gasto).
      Sobra: a rolagem deixa o topo fixo cobrindo o título "Novo lançamento"
- [x] **Foco some** (volta ao início da página) depois de: digitar um limite no Orçamento,
      marcar item da revisão semanal, "Guardar valor" numa meta, excluir lançamento e trocar
      o tipo de renda. Corrigido: o redesenho devolve o foco ao mesmo controle, ao vizinho
      ou ao título do bloco (`guardarFoco` em `app.js`), com 8 testes em `foco.spec.js`
- [ ] Dois jeitos de "guardar" que não se conversam: guardar R$ 300 na meta de reserva e o
      Painel continua "Futuro R$ 0,00 · 0% da renda"
- [ ] Mensagens que se contradizem no Painel: "Você guardou R$ 0,00… faça o aporte" junto com
      "Excelente! Sua taxa de poupança está em 48%" (a sobra do mês é contada como poupança)

Prioridade média
- [ ] Botões "Editar" e "Excluir" repetidos (17× cada) sem dizer de qual lançamento; o leitor
      de tela não distingue. Incluir descrição e valor no nome acessível
- [ ] Abas: setas do teclado não trocam de aba, as 5 são paradas de Tab, sem `aria-controls`
      e painéis sem nome; sem link "pular para o conteúdo" (8 paradas até o primeiro campo);
      página sem título principal (h1); abas fora de uma região identificada (axe)
- [ ] Lista de categorias: cada opção começa com emoji, então digitar "Mer" não escolhe
      "Mercado" (provado: sem emoji funciona)
- [ ] Limite do Orçamento salva sem nenhum aviso de "salvo"
- [ ] Palavras de finanças sem explicação no Painel e no Orçamento: baldes, envelopes, taxa de
      poupança, "orçamento base zero", fixa/variável. Explicar em linguagem simples
- [ ] Metas e Método escondidas à direita no celular (ver barra de navegação fixa abaixo)

Prioridade baixa
- [ ] Etiqueta "variavel" sem acento (aparece na tela do Orçamento)
- [ ] "para os próximos 1 dia" (singular) no "Você pode gastar hoje"
- [ ] Tela vazia mostra três selos "Sem renda" que só fazem ruído até existir renda
- [ ] "Guardar valor" usa janela nativa `prompt()` e excluir usa `confirm()`; funciona, mas
      destoa do app e não há "desfazer" ao excluir
- [ ] Títulos dos grupos do Orçamento colados na lista anterior (visual ainda não feito)

Verificado e funcionando: lançar, editar, excluir, parcelar, lançamentos fixos (sem duplicar),
backup e restauração, "Apagar tudo", CSV, teclado (tecla N, Enter para salvar), zoom 200% e
320px sem rolagem horizontal, alvos de toque de 44px em todas as telas, contraste e leitura
do formulário, sem erros de JavaScript.
Não testado: leitor de tela real, Safari/iOS, Firefox, pessoas de verdade.

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
