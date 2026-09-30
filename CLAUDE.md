# Sobre o projeto
- **O que é:** Finan, um app web para controlar gastos pessoais com o **Método Finan**
  (baldes adaptativos, envelopes, pague-se primeiro, reserva de emergência, revisão semanal).
  Roda 100% no navegador, sem build e sem servidor.
- **Para quem:** pessoas que querem controlar os próprios gastos, sem precisar entender
  de finanças nem de tecnologia.
- **Como trabalhamos:** método Akita (XP + IA). Guia completo em
  [`docs/guia-metodo-akita.md`](docs/guia-metodo-akita.md). A regra de ouro: **a IA escreve
  o código, mas quem manda no projeto é o Isaac.** Ele decide o quê e o porquê; a IA faz o
  como, os testes e o trabalho repetitivo.

# Regras de trabalho
- **Uma tarefa por vez**, do tamanho de um commit que se revisa em poucos minutos. Não
  adicione nada que não foi pedido; ideias extras vão para o `BACKLOG.md` como sugestão.
- **Planeje antes de codar:** explique o quê e o porquê, e espere aprovação.
- **Sempre escreva o teste ANTES da implementação** e rode para vê-lo falhar (fase
  vermelha). Depois implemente o mínimo para passar (fase verde). Por fim, refatore.
- **Nunca altere um teste existente para fazê-lo passar.** O teste é a regra; quem muda a
  regra é o Isaac.
- Todo bug corrigido ganha um teste de regressão (o teste que falha antes da correção).
- **Prefira a solução mais simples que funcione.**
- **Rode `npm run check` (lint + testes) ao final de cada tarefa** e antes de todo commit.
  Faça o commit só se o comando terminar com sucesso (código de saída 0).
- **Explique em português o que mudou e por quê** ao final de cada tarefa.
- Ao terminar uma história, marque-a no `BACKLOG.md`.
- **Fluxo Git:** commits pequenos direto no `main`, em português, no imperativo. Se a CI
  falhar no GitHub, corrigir é a prioridade. PRs só para contribuições externas e Dependabot.

## Antes de cada commit
Só faça o commit quando todas as respostas forem "sim":
- [ ] `npm run check` passou (código de saída 0)?
- [ ] O que mudou foi explicado e entendido?
- [ ] Foi feito só o que foi pedido?
- [ ] Nenhum teste existente foi alterado sem decisão do Isaac?
- [ ] Não há dados reais, senhas ou credenciais no código?

# Regras do negócio
- **Dinheiro é inteiro em centavos.** Nunca some ou compare reais em ponto flutuante.
  Entrada com `parseAmount` (aceita `1.234,56`), saída com `formatBRL` (`R$ 1.234,56`).
- **Datas são strings locais `AAAA-MM-DD`.** Não use `new Date('AAAA-MM-DD')` (vira UTC).
- **Três baldes:** Essenciais, Estilo de vida e Futuro (reserva, investimentos, dívidas).
- **Baldes adaptativos:** o plano olha a parcela da renda gasta com Essenciais nos 3 meses
  anteriores (sem o mês corrente):
  - até 50% → 50/30/20;
  - de 50% a 80% → Essenciais reais (arredondados para cima de 5 em 5); do resto, 40% vai
    para o Futuro (mínimo 5%) e 60% para Estilo de vida. Ex.: 60% → 60/25/15;
  - acima de 80% → Futuro de 5% e alerta para cortar custos fixos ou aumentar a renda;
  - sem histórico → 50/30/20.
- **Envelopes:** cada categoria pode ter um limite mensal. Categorias `fixa` (aluguel,
  assinaturas) não entram na projeção de fim de mês; `variavel` (mercado, delivery) entram,
  e também no "pode gastar hoje".
- **Orçamento base zero:** a soma dos envelopes sugeridos bate exatamente com a renda.
- **Reserva de emergência:** média dos gastos essenciais × 6 meses (renda estável: CLT,
  servidor, aposentadoria) ou × 12 meses (renda variável: autônomo, freelancer, empresário).
- **Compras parceladas:** entram no mês da compra; uma parcela por mês nos seguintes; os
  centavos da divisão ficam nas primeiras parcelas; máximo de 48 parcelas.
- **Lançamentos fixos** (recorrentes) podem ser copiados do mês anterior sem duplicar.

# Arquitetura
- `js/core.js` — regras de negócio **puras** (sem DOM, sem `localStorage`). Toda conta mora aqui.
- `js/app.js` — interface: lê o estado, chama o núcleo, desenha a tela. Não faz contas de negócio.
- `tests/*.test.js` — testes com `node --test`, focados no núcleo.
- `index.html` + `css/` — estrutura e visual. Sem frameworks, sem etapa de build.
- Scripts clássicos (não ES modules) para o app abrir com duplo clique (`file://`).

## Regras de código
- **Nomes do domínio em português** (`orcamento`, `envelope`, `balde`), código em inglês
  simples onde já é assim; siga o padrão do arquivo que está editando.
- Funções pequenas com uma responsabilidade. O ESLint avisa acima de 60 linhas ou
  complexidade 15: trate o aviso como pedido de refatoração.
- Sem duplicação: se a mesma conta aparece duas vezes, ela vai para `core.js`.

## Regras de visual e acessibilidade (conferidas por `tests/css.test.js`)
- Celular primeiro; o app precisa permitir lançar e consultar rápido, com uma mão.
- Cores só pelas variáveis do `:root` em `css/styles.css`. Contraste mínimo WCAG AA: 4,5:1
  para texto e 3:1 para bordas, foco e barras. Cor nova entra no teste de pares.
- Alvos de toque com pelo menos 44px (`--tap`), inclusive botões "pequenos".
- Nunca remover o `outline` do foco; nunca informar só por cor (status sempre com texto).
- Campos com fonte de pelo menos 16px (senão o celular dá zoom ao digitar).
- Respeitar `prefers-reduced-motion` e o atributo `hidden`.
- Ao mudar o visual ou o comportamento de uma tela, rodar `npm run test:e2e` (navegador de
  celular de verdade) e olhar a captura.

# Segurança e privacidade (inegociável)
- Os dados **nunca saem do navegador**: nada de APIs externas, analytics, CDNs com rastreio
  ou envio de dados. Persistência só em `localStorage` e backups baixados pelo usuário.
- **Nunca coloque dados reais no projeto** (nomes, CPFs, contas, valores reais). Nos testes e
  no exemplo, só dados inventados. Nunca cole senhas ou credenciais no chat nem no código.
- **Todo texto vindo do usuário ou de backup passa por `esc()` antes de ir para `innerHTML`.**
- Dados importados passam por `normalizeData` (valida e descarta o que for inválido).
- CSV exportado neutraliza fórmulas (`=`, `+`, `-`, `@`).
- Antes de publicar, faça uma revisão de segurança do código. `tests/e2e/seguranca.spec.js`
  garante que HTML digitado ou vindo de backup nunca executa e que o app não faz requisição
  de rede. Mudou como algo é desenhado na tela? Esses testes têm que continuar passando.
- Publicação (GitHub Pages): `.github/workflows/publicar.yml` publica só `index.html`,
  `css/` e `js/`. Arquivo novo que o app precise em produção tem que entrar nesse `cp`.

# Problemas já resolvidos
- **Arredondamento dos envelopes passava da renda** (ex.: renda R$ 3.333 virava R$ 3.340 de
  envelopes). Solução: `allocate` com o método do maior resto, entre baldes e dentro de cada
  balde. Testes de regressão em `suggestBudgets`.
- **Ponto flutuante no plano adaptativo:** `0.6 * 100` dá `60.00000000000001`, e arredondar
  para cima levaria a 65%. Solução: subtrair um epsilon antes do `Math.ceil` e fazer o resto
  das contas com inteiros. Teste cobre o caso 0.6.
- **Commit feito com teste falhando:** o comando encadeava `npm run check | grep ... && git
  commit`, e o `grep` "passava" mesmo com falha. Solução: conferir o código de saída do
  próprio `npm run check` antes do commit. Depois, a trava `.githooks/pre-commit` passou a
  bloquear automaticamente qualquer commit com lint ou teste falhando.
- **ESLint acusando o invólucro do módulo** (`core.js`) como função de 387 linhas. Solução:
  `eslint-disable-next-line` só nessa linha, com justificativa.
- **Dependabot abrindo PRs para o branch errado:** ele usa o branch padrão do repositório.
  Solução: o branch padrão deve ser o `main` (Settings → General → Default branch).

- **Teste de CSS reprovando CSS correto:** o leitor do teste tratava o comentário antes da
  regra como parte do seletor. Solução: o teste remove comentários antes de ler. A exigência
  (`.btn` com `min-height: var(--tap)`) não mudou.

- **"Lançar minha renda" abria o formulário como Despesa:** o botão da tela de boas-vindas e o
  "+ Lançar" do topo compartilhavam a mesma ação. Solução: o botão ganhou `data-type="income"`
  e a ação `quick-add` aplica o tipo antes de desenhar o formulário. O "+ Lançar" continua
  abrindo como Despesa. Testes em `tests/e2e/lancar-renda.spec.js`.

# Comandos
- `npm install` — instala as dependências e ativa a trava de commit (`.githooks/pre-commit`),
  que roda `npm run check` e bloqueia o commit se algo falhar. Não use `--no-verify`.
- `npm run check` — lint + testes (o mesmo que a CI roda, além do `npm audit`)
- `npm test` — só os testes rápidos (contas e CSS)
- `npm run test:e2e` — testes no navegador (Playwright, celular Pixel 7): abrem o app de
  verdade e usam como o usuário usa. Precisa do Chromium (`npx playwright install chromium`).
  Não entram na trava de commit por serem mais lentos; a CI roda em todo push.
- `npm start` — servidor local em http://localhost:8080 (ou abra `index.html` direto)
