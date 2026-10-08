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
