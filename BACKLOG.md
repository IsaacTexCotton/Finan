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
- [x] Visual da tela Orçamento (envelopes)
- [ ] Visual das telas Metas e Método
- [ ] Tema escuro (segue a configuração do celular)
- [ ] Sugestão (opcional): barra de navegação fixa embaixo no celular, que o polegar alcança
      melhor. As abas em duas linhas já resolvem o problema de ficarem escondidas
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
- [x] Isaac: trocar o branch padrão para `main` (Settings > General) e ligar o Pages
      (Settings > Pages > Source: GitHub Actions)
- [x] Primeira publicação disparada e no ar (https://isaactexcotton.github.io/Finan/)
- [x] Publicar sozinho depois que a CI passar no `main`
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
- [x] Dois jeitos de "guardar" que não se conversavam: guardar R$ 300 na meta de reserva e o
      Painel continuava "Futuro R$ 0,00". Agora "Guardar valor" cria um lançamento do Futuro
      ligado à meta (`goalId`), que conta no Guardado e no balde Futuro. O valor da meta é o
      valor inicial mais os depósitos; excluir o depósito na lista desfaz tudo
- [x] Mensagens que se contradiziam no Painel ("Você guardou R$ 0,00" junto com "Excelente!
      taxa de poupança 48%"). O Painel agora mostra Receitas, Gastos, Guardado e Sobrou, que
      somam a renda; a taxa de poupança conta só o guardado (Futuro), sem a sobra

Prioridade média
- [x] Botões "Editar" e "Excluir" repetidos (17× cada) sem dizer de qual lançamento; o leitor
      de tela não distingue. Agora o nome inclui descrição, parcela e valor; os botões das
      metas dizem de qual meta são
- [x] Abas: setas, Home e End trocam de aba; só a aba atual é parada do Tab; `aria-controls`
      e painéis com nome; link "Pular para o conteúdo"; título principal (h1); abas dentro de
      uma região de navegação. `acessibilidade.spec.js` roda o axe-core em todas as telas
      (celular e PC) e exige zero violações, inclusive boas práticas
- [x] Lista de categorias: cada opção começava com emoji, então digitar "Mer" não escolhia
      "Mercado". Agora o nome vem primeiro e o emoji depois ("Mercado 🛒")
- [x] Limite do Orçamento salvava sem aviso. Agora diz "Limite de Mercado salvo: R$ 500,00" (ou "removido")
- [x] Palavras de finanças sem explicação no Painel e no Orçamento: baldes, 50/30/20,
      envelopes, fixa/variável e "orçamento base zero" (agora "dar um destino a cada real").
      "Taxa de poupança" deixou de aparecer: agora é "Você guardou X% da renda"
- [x] Metas e Método escondidas à direita no celular. Agora as 5 abas aparecem inteiras: duas
      linhas (3 + 2) no celular e uma linha a partir de 480px; `abas-visiveis.spec.js` confere
      de 320 a 1280px. Uma barra fixa embaixo não coube em 320px ("Lançamentos")

Prioridade baixa
- [x] Etiqueta "variavel" sem acento (aparece na tela do Orçamento)
- [ ] "para os próximos 1 dia" (singular) no "Você pode gastar hoje"
- [ ] Tela vazia mostra três selos "Sem renda" que só fazem ruído até existir renda
- [ ] "Guardar valor" usa janela nativa `prompt()` e excluir usa `confirm()`; funciona, mas
      destoa do app e não há "desfazer" ao excluir
- [x] Títulos dos grupos do Orçamento colados na lista anterior (resolvido no visual do Orçamento)

Verificado e funcionando: lançar, editar, excluir, parcelar, lançamentos fixos (sem duplicar),
backup e restauração, "Apagar tudo", CSV, teclado (tecla N, Enter para salvar), zoom 200% e
320px sem rolagem horizontal, alvos de toque de 44px em todas as telas, contraste e leitura
do formulário, sem erros de JavaScript.
Não testado: leitor de tela real, Safari/iOS, Firefox, pessoas de verdade.

Decisões do Isaac aplicadas (30/09/2026)
- [x] Sobrou pode ficar negativo, mas o app avisa antes de deixar guardar mais do que sobrou
      (formulário e "Guardar valor" nas metas); a pessoa escolhe se guarda mesmo assim
- [ ] Sugestão: o aviso também ao editar um lançamento do Futuro para um valor maior

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

## Dia de pagamento
- [x] "Você pode gastar hoje" até o próximo pagamento, pelo N-ésimo dia útil (renda estável)
- [x] "Pode gastar hoje" também mostra quanto dá para gastar até domingo
- [ ] Sugestão: feriados nacionais na conta do dia útil
- [ ] Sugestão: Painel e limites por ciclo do salário, não por mês de calendário
- [x] Formulário de lançamento: categoria "Metas" abre a lista das metas (só aparece com metas)
- [ ] Sugestão: limite do envelope Metas sugerido pela soma dos valores mensais das metas
- [x] Revisão semanal no dia escolhido (padrão domingo), com lembrete no Painel
- [ ] Visual: a lista da revisão semanal (`.checklist`) mostra marcadores soltos ao lado das caixas de marcar; falta estilo (achado ao conferir a captura)
- [x] "Pode gastar" limitado ao que sobrou no período (guardar numa meta baixa o valor)
- [ ] Sugestão: reservar também o que a pessoa ainda pretende guardar no mês (envelope Metas com limite)

## Orçamento pelo que a pessoa realmente gasta (reformulação, 30/09/2026)
Decisão do Isaac: a sugestão atual inventa números (porcentagem repartida à força entre
categorias). Novo princípio: o orçamento parte da realidade; a porcentagem do plano vira teto
do balde e comparação. Uma parte por vez:
- [x] Parte 1: teto do balde, o que já foi distribuído e o que sobra, com aviso de excesso
- [x] Parte 2: o botão "Sugerir pelos meus gastos" sugere a média dos últimos 3 meses por
      categoria (nas fixas, o valor que a pessoa de fato paga), só para categorias com gasto; o
      balde Futuro vem do percentual do plano (`suggestFromHistory`)
- [ ] Sugestão: retirar `suggestBudgets` do núcleo quando os testes antigos dele puderem ser
      trocados (hoje ele só divide o balde Futuro por dentro de `suggestFromHistory`)
- [ ] Parte 3: questionário simples (aluguel, mercado, transporte…) para quem não tem histórico
- [ ] Sugestão: cada valor sugerido mostra o motivo ("média dos últimos 3 meses: R$ 290")
