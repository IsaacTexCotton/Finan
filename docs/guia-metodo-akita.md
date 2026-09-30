# Guia rápido: programar com IA pelo método Akita

Sep 29, 2026 · @Isaac

## A regra de ouro

**A IA escreve o código, mas quem manda no projeto é você.** Se você não entende o que ela fez, não aceite.

A IA não é uma máquina de gerar sistemas prontos. Ela é sua dupla de trabalho: você conduz, ela executa, e os dois revisam.

| Você decide | A IA faz |
| --- | --- |
| **O quê** construir | **Como** escrever o código |
| **Por quê** construir | Os testes e os casos difíceis |
| As regras do negócio | O trabalho repetitivo |
| Quando simplificar ou parar | As pesquisas rápidas |
| O que é certo ou errado | Seguir os padrões combinados |

Se você inverter os papéis e ditar o código linha por linha, o resultado piora. Se deixar a IA decidir o quê e o porquê, ela resolve o problema errado.

## Antes de começar

Confira estes quatro pontos antes de pedir qualquer coisa à IA.

- [ ] **O projeto está no Git?** O Git guarda cada versão e deixa você desfazer qualquer estrago. Sem ele, não comece.
- [ ] **Existe um arquivo de regras (CLAUDE.md)?** Ele diz à IA como o projeto funciona. Veja o modelo mais abaixo.
- [ ] **Meu pedido é pequeno?** Uma coisa só por vez. "Faça o app inteiro" é grande demais; "crie a função que soma os gastos de uma categoria" é o tamanho certo.
- [ ] **Eu sei explicar o que quero?** Se você não consegue dizer em uma frase o que a funcionalidade deve fazer, pense mais antes de pedir.

Teste do tamanho certo: se a tarefa não cabe em um commit que você consegue revisar em poucos minutos, divida em partes menores.

## O ciclo que se repete

Toda funcionalidade passa pelos mesmos 6 passos. Repita quantas vezes for preciso, sempre em pedaços pequenos.

1. **Peça uma coisa só.** Explique o quê e o porquê.
   - *"Quero uma função que diga quanto ainda resta em cada categoria do orçamento. Isso serve para eu saber se posso gastar mais."*
2. **Peça os testes primeiro.** Os testes descrevem o que é "certo". Leia cada um: essa parte é sua.
   - *"Antes de implementar, escreva os testes. Cubra o caso normal, o caso de valor zero e o caso de limite estourado."*
3. **Rode os testes e veja falhar.** É a fase vermelha: prova que o teste funciona, porque ainda não existe código.
   - *"Rode os testes e me mostre que eles falham."*
4. **A IA implementa até passar.** É a fase verde.
   - *"Agora implemente o mínimo necessário para os testes passarem. Não altere os testes."*
5. **Revise o que mudou.** Leia as alterações e pergunte tudo que não entender.
   - *"Explique em português o que você mudou e por quê."*
   - *"O que faz a linha 12?"*
6. **Faça o commit e depois refatore.** Salve no Git. Com os testes passando, peça para deixar o código mais limpo.
   - *"Faça o commit com uma mensagem clara."*
   - *"Deixe esse código mais simples e legível, sem mudar o comportamento. Rode os testes no final."*

Depois do passo 6, volte ao passo 1 com o próximo pedaço.

## Sinais de alerta

A IA nunca diz "não". Ela faz qualquer coisa com o mesmo entusiasmo, então o freio é você.

| Se você perceber isto | Faça isto |
| --- | --- |
| A solução ficou complicada demais para um problema simples | *"Para. Simplifica. Qual o jeito mais simples de resolver isso?"* |
| A IA mudou um teste para ele passar | Recuse. O teste é a regra; quem muda a regra é você. |
| Você não entende o que o código faz | Não faça o commit. Pergunte até entender. |
| Um arquivo está ficando enorme | *"Separe isso em partes menores, sem mudar o comportamento."* |
| A IA fez mais do que você pediu | *"Desfaça o que eu não pedi. Só a tarefa combinada."* |
| A IA inventou uma regra do seu negócio | Corrija e anote a regra certa no CLAUDE.md. |
| Algo quebrou e você não sabe o quê | Volte ao último commit que funcionava. |

## Segurança e dados

Segurança é um hábito de todo commit, não uma etapa final.

- **Nunca coloque dados reais no projeto.** Nada de nomes de clientes, CPFs, contas bancárias ou valores reais. Nos testes, use dados inventados.
- **Nunca cole senhas ou credenciais** no chat nem no código, incluindo acessos a sistemas da empresa.
- **Só dê autonomia à IA com o projeto no Git.** Se ela apagar ou estragar algo, você volta atrás.
- **Peça revisão de segurança antes de publicar.** *"Revise este código procurando falhas de segurança."* A IA raramente sugere proteções que você não pediu.
- **Tenha backup** do que for importante, fora do computador.

## Modelo de CLAUDE.md

Copie este arquivo para a pasta principal de cada projeto e ajuste. Ele cresce com o projeto: sempre que a IA errar algo do seu negócio, anote a regra certa aqui.

```markdown
# Sobre o projeto
- O que é: [uma frase sobre o que o app faz]
- Para quem: [quem vai usar]

# Regras de trabalho
- Sempre escreva o teste ANTES da implementação.
- Nunca altere um teste existente para fazê-lo passar.
- Faça uma tarefa por vez; não adicione nada que eu não pedi.
- Prefira a solução mais simples que funcione.
- Rode todos os testes ao final de cada tarefa.
- Explique em português o que mudou e por quê.

# Regras do negócio
- [ex.: valores em reais, formato 1.234,56]
- [ex.: o orçamento do mês soma o salário líquido]

# Problemas já resolvidos
- [anote aqui cada erro que já aconteceu e a solução]
```

## Antes de cada commit

Só salve quando todas as respostas forem "sim".

- [ ] Todos os testes passaram?
- [ ] Eu li e entendi o que mudou?
- [ ] A IA fez só o que eu pedi?
- [ ] Nenhum teste foi alterado sem minha decisão?
- [ ] Não há dados reais, senhas ou credenciais no código?

## Glossário

| Termo | O que significa |
| --- | --- |
| **Commit** | Um "salvar" com nome no Git. Dá para voltar a qualquer um deles. |
| **Git** | O programa que guarda o histórico de todas as versões do projeto. |
| **Teste** | Um pequeno programa que confere se o código faz o que deveria. |
| **TDD** | Escrever o teste antes do código. |
| **Fase vermelha** | O teste existe, mas falha, porque o código ainda não foi feito. |
| **Fase verde** | O código foi feito e o teste passa. |
| **Refatorar** | Deixar o código mais limpo sem mudar o que ele faz. |
| **CLAUDE.md** | O arquivo de regras que a IA lê antes de trabalhar no projeto. |
| **Integração contínua (CI)** | Rodar os testes automaticamente a cada commit. |
| **Vibe coding** | Deixar a IA programar sem testes nem revisão. É o que o método evita. |
