# Estratégia de UX/UI do Finan

Registro vivo do exercício de design feito com o Isaac (equipe completa de UX/UI simulada: Head
de Design, UX Researcher, Product/UX Designer, UX Writer, UI Designer, Design System Designer,
Motion Designer, Especialista em Acessibilidade, Design Ops). Segue as 7 etapas do processo:
Descoberta, Definição, Ideação, Design Visual, Validação, Handoff, Medição.

As telas de alta fidelidade e o sistema de design visual (Etapa 4) ficam num Artifact de Design
("Claude Design"), não aqui — este arquivo é só a parte de texto/estratégia.

Nada aqui é implementado sozinho: cada etapa espera aprovação do Isaac antes de virar código,
como o resto do projeto.

## Restrições inegociáveis (valem para toda decisão de design)

- 100% no navegador, sem servidor, sem etapa de build, custo zero.
- Dados nunca saem do dispositivo.
- Mobile-first; acessibilidade (WCAG 2.2 AA) não é opcional.

## Etapa 1 — Descoberta (resumo)

- Público: pessoas que querem controlar os próprios gastos, sem entender de finanças nem de
  tecnologia.
- Maturidade de design hoje: CSS puro, tokens de espaçamento/fonte já no `:root`, acessibilidade
  cobrada por teste automatizado. Sem sistema de design documentado fora do código.
- Validação até hoje: só o próprio Isaac simulando personas; nenhuma pesquisa com usuário real.

## Etapa 2 — Definição

### Persona (hipótese a validar — ainda sem pesquisa real)

> **Marcos, 29 anos, CLT, salário R$ 3.450.** Já tentou planilha duas vezes e desistiu. Não é
> "ruim com números" — ninguém tornou isso simples pra ele. Quer confiança ("estou indo bem?"),
> não relatório.

### Métricas de sucesso (definidas pelo Isaac)

1. **Retenção:** continuar lançando gastos depois de 1 mês.
2. **Ativação:** completar o cadastro de uma meta sem desistir.
3. **Confiança:** sensação de confiança com o próprio dinheiro.

### Priorização (MoSCoW)

**Must have** (bloqueiam confiança/ativação — antes de cobrar):
1. Trocar `prompt()`/`confirm()` nativos nos fluxos de dinheiro por formulário na própria tela.
2. Ícone e identidade visual definitivos (hoje é um "F" provisório).
3. Trava de entrada no app (PIN ou biometria do aparelho).
4. Onboarding real de 2–3 telas antes da pessoa decidir usar.

**Should have:** ícones próprios (sem emoji), sistema de design documentado, microinterações,
tema escuro.

**Could have:** campo de valor com máscara monetária.

**Won't have agora:** sincronizar entre aparelhos, app de loja (decisões já tomadas pelo Isaac).

## Etapa 3 — Ideação

### Mapa do app (sitemap) — sem mudança estrutural, só adições

```
Abertura
 └─ (1ª vez) Onboarding — 3 telas — "Pular" sempre visível
      └─ Painel ──────────┐
 └─ (demais vezes) PIN (se ativado) │
      └─ Painel            ├─ Lançamentos
                            ├─ Orçamento
                            └─ Mais
                                 ├─ Metas
                                 └─ Método
```

A navegação inferior (Painel/Lançamentos/Orçamento/Mais) não muda — já está validada por teste e
não há motivo de negócio para alterá-la agora.

---

### Fluxo A — Guardar / Transferir / Tirar, sem `prompt()` nativo (Must-have nº 1)

**Problema:** hoje são 3 botões por meta (Guardar valor, Transferir, Tirar) + Excluir, cada um
abrindo uma janela nativa do navegador em sequência (às vezes 2 diálogos encadeados). Isso é
ruído visual (Lei de Hick: mais opções visíveis = decisão mais lenta) e quebra a confiança (Lei
de Jakob: ninguém espera isso num app de dinheiro).

**Proposta:** um único botão por meta, **"Movimentar"**, que abre um painel na própria tela
(bottom sheet — um painel que sobe de baixo, comum em apps de banco) com as 3 opções dentro.
Reduz de 4 para 2 botões por cartão de meta (Movimentar, Excluir).

```
┌───────────────────────────────┐
│  Movimentar "Viagem de férias"   │ ← título com o nome da meta
├───────────────────────────────┤
│  O que você quer fazer?          │
│  ( ) Guardar mais                │
│  ( ) Transferir para outra meta  │
│  ( ) Tirar e usar em outra coisa │
├───────────────────────────────┤
│  [ campo de valor, conforme a    │
│    escolha acima ]               │
│  Disponível: R$ 1.200,00         │ ← ajuda a não errar (Nielsen: prevenção de erro)
├───────────────────────────────┤
│  [Cancelar]        [Confirmar]   │
└───────────────────────────────┘
```

- **"Transferir"** mostra uma lista de seleção (`<select>`) de verdade com o nome das outras
  metas — nunca mais "digite o número 1".
- **Estado de erro:** aparece embaixo do campo, no mesmo painel ("Essa meta só tem
  R$ 1.200,00 guardado"), não depois, num toast.
- **Estado de aviso (esvaziar a reserva):** uma faixa amarela aparece dentro do painel quando o
  valor digitado passaria do ideal, com uma caixa "Entendo, quero continuar assim" que precisa
  ser marcada para o botão Confirmar liberar — substitui o `confirm()` bloqueante por um aviso
  visível que a pessoa lê no próprio ritmo.
- **Estado vazio:** com só 1 meta, a opção "Transferir" aparece desabilitada com o texto "Crie
  outra meta para poder transferir."
- **Estado de sucesso:** o painel fecha, a mensagem de confirmação aparece como hoje.
- **Teclado/acessibilidade:** campo de valor com `inputmode="decimal"` (teclado numérico no
  celular); painel focável por teclado, Esc fecha e devolve o foco ao botão "Movimentar".

### Fluxo B — Onboarding (Must-have nº 4)

3 telas, só na primeira abertura, sempre com "Pular" visível (Nielsen: controle e liberdade do
usuário):

```
┌─────────────────┐
│                   │
│     [ícone]        │
│                   │
│  Seu dinheiro em    │
│  três baldes simples │
│                   │
│  texto de apoio      │
│  (1–2 linhas)         │
│                   │
│   ●  ○  ○            │ ← indicador de progresso
│                   │
│ [Pular]    [Próximo] │
└─────────────────┘
```

1. "Seu dinheiro em três baldes simples" (Essenciais/Estilo de vida/Futuro).
2. "Seus dados nunca saem do seu celular" (ponto de confiança, privacidade).
3. "Vamos lançar seu primeiro gasto?" → leva direto ao formulário (ativação imediata). Ao lado,
   um link menor "ou veja com dados de exemplo" continua existindo.

### Fluxo C — Trava de entrada do app (Must-have nº 3)

Problema real a decidir, com 3 caminhos possíveis:

| Opção | Prós | Contras |
|---|---|---|
| **A. PIN de 4 dígitos** (recomendada para 1ª versão) | Simples, funciona 100% offline, sem serviço novo | Esquecer o PIN = perder o acesso (sem servidor para recuperar senha) |
| B. Biometria do navegador (Face ID/Touch ID via WebAuthn) | Mais forte, familiar (já usam no banco) | Suporte inconsistente entre navegadores, mais complexo, pode falhar silenciosamente em alguns aparelhos |
| C. Sem trava própria; só "toque para revelar" nos valores | Zero risco de perder acesso aos próprios dados | É mais fraco — não impede abrir o app, só esconde o número à primeira vista |

**Risco que precisa de decisão do Isaac antes de qualquer código:** nas opções A e B, esquecer o
PIN ou não ter biometria configurada **sem um backup baixado** significa perder o acesso aos
próprios dados — não existe servidor para redefinir a senha. Isso precisa de um aviso bem claro
na hora de ativar a trava.

---

### Decisões tomadas nesta etapa
- Consolidar 3 botões de meta em 1 ("Movimentar"), com um painel na própria tela em vez de
  `prompt()`/`confirm()` nativos.
- Onboarding de 3 telas, sempre puláveis, sem bloquear quem já conhece o app.
- Trava de entrada ainda **sem decisão final** — são 3 caminhos, cada um com um risco diferente.

### Riscos
- O painel "Movimentar" precisa caber em 320px sem cortar texto (testar como os outros `details`
  do app).
- Qualquer trava de entrada sem servidor carrega o risco de "perdi meus dados porque esqueci a
  senha" — decisão de produto, não só de design.

### Pontos a validar
- Testar o painel "Movimentar" com alguém que nunca usou o app, cronometrando quanto tempo leva
  para guardar um valor numa meta (hoje vs. proposta).

### Próximo passo recomendado
Ir para a **Etapa 4: Design Visual** — telas de alta fidelidade do painel "Movimentar" e das 3
telas de onboarding, feitas no Artifact de Design, para o Isaac ver e aprovar antes de qualquer
linha de código.

## Etapa 4 — Design Visual (resumo)

- **Design System do Finan** (Artifact "Design System"): tokens reais extraídos de `css/styles.css`
  (23 cores, 5 estilos de texto, escala de espaçamento, raio, toque de 44px). Só tema claro; o
  tema escuro segue no backlog.
- **Telas de alta fidelidade** (Artifact "Design"): painel "Movimentar" da meta e as 3 telas de
  onboarding, clicáveis.
- Decisões: opções do painel viraram pílulas cheias com marca de check (nunca só cor); o botão
  "Confirmar" tem 2 estados (cinza e "Preencha o valor" até o valor ser válido; verde quando
  pronto) e é o único momento de cor de recompensa; a tela 3 do onboarding oferece "Lançar um
  gasto" e "Lançar minha renda" (quem acabou de instalar muitas vezes começa pela renda).
- Ícones das telas são formas simples provisórias (ainda sem conjunto de ícones próprio).

## Etapa 5 — Validação: roteiro de teste de usabilidade

**Função atuando:** UX Researcher, com o Head de Design. Nada aqui é resultado: são hipóteses e um
roteiro para aplicar. Quem aplica é o Isaac, com pessoas reais.

### 1. Objetivo
Saber se as telas novas (onboarding e painel "Movimentar") ajudam as três métricas do Isaac:
**ativação** (completar a primeira ação sem desistir), **retenção** (querer voltar) e
**confiança** (sentir que o dinheiro está seguro e sob controle).

### 2. Hipóteses (todas a validar)
- H1: com o painel "Movimentar", a pessoa guarda um valor numa meta sem ajuda e em menos tempo do
  que com as janelas nativas do app de hoje.
- H2: o botão "Confirmar" cinza/verde diminui erro (enviar sem valor) e passa mais segurança.
- H3: o onboarding de 3 telas ajuda a entender "balde" sem a pessoa precisar perguntar.
- H4: a frase "seus dados nunca saem do seu celular" aumenta a confiança (e não gera dúvida do tipo
  "e se eu perder o celular?").
- H5: quem acabou de chegar entende que pode começar pela renda.

### 3. Quem convidar
- **3 a 5 pessoas** (para achar os problemas grandes, não para estatística).
- Brasileiros comuns, que **não** trabalham com finanças nem tecnologia; idealmente 1 ou 2 que já
  tentaram planilha ou outro app e largaram (o perfil do Marcos).
- Não convidar quem já viu o app ou ajudou a fazê-lo. Mesmo que sejam conhecidos, eles contam.
- Combinar antes: o teste é do app, não da pessoa; pode parar a qualquer momento.

### 4. Como preparar (10 minutos)
- Celular com o Artifact das telas aberto (modo interativo/Play), tela cheia, sem notificações.
- Para a comparação (H1), o app de hoje aberto no outro celular ou outra aba, com dados de exemplo
  carregados e uma meta "Viagem de férias" com R$ 1.200,00 guardados.
- Cronômetro, caneta e a ficha de observação (seção 8). Gravar só com a permissão da pessoa; sem
  gravar, anotar à mão.
- **Dados:** usar só números inventados. Nada de dado real da pessoa.

### 5. Roteiro da conversa (cerca de 25 minutos)
**Abertura (2 min).** Ler em voz alta: "Vou te mostrar um aplicativo de controlar gastos que ainda
está sendo criado. Não existe resposta certa nem errada: se algo confundir, o problema é do
aplicativo, não seu. Vá falando em voz alta o que você está pensando. Posso anotar?"

**Perguntas rápidas antes (3 min).**
1. Hoje, como você controla seus gastos? (nada, caderno, planilha, aplicativo, o banco)
2. Já tentou usar algum aplicativo ou planilha? Por que parou?
3. O que te deixaria desconfortável em colocar seus gastos num aplicativo?

**Tarefa 1 — Primeira abertura (5 min).** Mostrar as 3 telas do onboarding, na ordem, sem explicar.
- Dizer: "Você acabou de instalar o aplicativo. Fique à vontade e diga o que está entendendo."
- Observar: lê o texto ou pula? Onde hesita? Toca em "Pular"?
- Perguntar depois: "Com suas palavras, o que é esse aplicativo?" e "O que são os três baldes?"
  e "O que você acha da frase sobre os dados ficarem no celular?"
- Na tela 3: "Se fosse usar agora, o que você tocaria primeiro?" (H5)

**Tarefa 2 — Guardar dinheiro numa meta, versão nova (5 min).** Abrir o painel "Movimentar" já
aberto sobre a meta.
- Dizer: "Você quer guardar R$ 300 nessa meta de viagem. Mostre o que faria."
- Observar: escolhe "Guardar mais" sozinha? Digita o valor com facilidade? Repara que o botão
  muda de cinza para verde? Tenta tocar em "Confirmar" vazio?
- Cronometrar do primeiro toque até confirmar. Não ajudar antes de 60 segundos.

**Tarefa 3 — Tirar dinheiro de uma meta (4 min).**
- Dizer: "Agora você precisa de R$ 500 dessa meta para um conserto. Como faria?"
- Observar: acha "Tirar e usar em outra coisa"? Lê o aviso amarelo? Entende que precisa marcar a
  caixa antes de confirmar?
- Perguntar: "O que esse aviso está te dizendo?"

**Tarefa 4 — Comparação com o app de hoje (4 min, só H1).** No app atual, pedir a mesma coisa
(guardar R$ 300). Cronometrar. Perguntar: "Qual dos dois foi mais fácil? Por quê?" Para não
viciar, **alternar a ordem** entre as pessoas (uma começa pelo novo, a próxima pelo antigo).

**Fechamento (2 min).**
1. Em uma palavra, como você descreveria esse aplicativo?
2. Você confiaria nele para guardar seus gastos? O que faltaria?
3. Se pudesse mudar uma coisa, qual seria?
Agradecer. Não vender nem prometer nada.

### 6. Regras para quem conduz
- Falar pouco. Não explicar a tela, não dizer "é só tocar ali".
- Se a pessoa travar, esperar. Depois de 60 segundos, perguntar "o que você esperava que
  acontecesse?" antes de ajudar. Anotar que precisou de ajuda.
- Não defender o design. Se disserem que está ruim, anotar e agradecer.
- Perguntas abertas ("o que você achou?"), nunca "você gostou?".

### 7. Critérios de sucesso (definidos antes, para não torcer o resultado)
| Hipótese | Funcionou se... | Preciso mudar se... |
|---|---|---|
| H1 | 4 de 5 guardam sem ajuda e mais rápido que no app de hoje | 2 ou mais precisam de ajuda ou são mais lentos |
| H2 | Ninguém toca em "Confirmar" vazio sem entender por que está cinza | 2 ou mais tentam e não entendem a mensagem |
| H3 | 4 de 5 explicam "baldes" com palavras próprias, mesmo que simples | 3 ou mais não conseguem explicar |
| H4 | Nenhuma dúvida séria sobre perder dados, ou a dúvida surge e a pessoa a resolve sozinha | 2 ou mais perguntam "e se eu perder o celular?" e ficam inseguras (sinal para priorizar backup/aviso) |
| H5 | 3 de 5 tocam em "Lançar minha renda" ou entendem que é válido começar por ela | A maioria acha que precisa ter gasto para começar |

Com 3 a 5 pessoas, **o mesmo problema visto por 2 pessoas já merece correção**. Não calcular
porcentagem.

### 8. Ficha de observação (uma por pessoa)
- Nome ou código (P1, P2…), data, perfil (como controla hoje), ordem do teste (novo/antigo primeiro).
- Para cada tarefa: concluiu? (sim, com ajuda, não) · tempo · onde hesitou · frase exata que
  falou em voz alta · erro cometido.
- Respostas às perguntas finais, palavra a palavra.
- Uma linha: "o momento que mais me chamou atenção".

### 9. Como analisar
1. Copiar cada observação numa lista única, com o código da pessoa.
2. Agrupar iguais ("não viu o botão Movimentar", "não entendeu 'balde'").
3. Dar nota ao problema: **grave** (impediu a tarefa), **médio** (atrasou ou confundiu),
   **leve** (comentário).
4. Priorizar: grave visto por 2 ou mais pessoas vem primeiro.
5. Escrever o que muda no design e voltar à Etapa 4. Só depois pedir ao Isaac para aprovar
   a implementação em código.

### 10. O que este teste **não** mede
- Retenção (precisa de semanas de uso real, ver Etapa 7).
- Se a pessoa pagaria pelo app.
- Leitor de tela, Safari/iPhone e outras condições: precisam de teste separado.
- Qualquer coisa com amostra de 3 a 5 pessoas não vale como estatística.

### Decisões tomadas nesta etapa
- Testar com 3 a 5 pessoas comuns, no celular, com dados inventados.
- Critérios de sucesso escritos antes do teste.
- Comparar com o app de hoje alternando a ordem, para não favorecer nenhum.

### Riscos
- Conhecidos do Isaac podem ser gentis demais; peça para serem sinceros e valorize a crítica.
- O protótipo é uma imagem clicável: o botão de verdade e o teclado numérico do celular podem
  se comportar diferente depois de implementados.

### Pontos a validar
- Se 3 a 5 pessoas conseguem ser recrutadas na semana; se não, começar com 2 e já corrigir o óbvio.

### Próximo passo recomendado
O Isaac aplica o roteiro; traz as fichas; fazemos a análise (seção 9) e voltamos ao design. Em
paralelo, a **Etapa 6: Handoff** (especificações para implementar) só deve começar depois do teste,
para não especificar o que o teste pode derrubar.
