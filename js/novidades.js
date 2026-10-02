// GERADO por tools/gerar-novidades.js a partir do CHANGELOG.md. Não edite à mão: rode "node tools/gerar-novidades.js".
window.FINAN_NOVIDADES = [
  {
    "versao": "0.2.0",
    "rotulo": null,
    "data": "2026-10-02",
    "secoes": [
      {
        "nome": "Adicionado",
        "itens": [
          "\"Desfazer\" também depois de \"Restaurar backup\" e de \"Carregar exemplo\" por cima dos seus dados (10 segundos)",
          "Ao salvar um gasto, a mensagem diz quanto você ainda pode gastar hoje (o mesmo número do cartão do Painel)",
          "Painel mais calmo: só os 3 avisos mais importantes ficam à vista; os outros ficam num botão \"Ver mais N avisos\", sem perder nenhum",
          "Lembrete de backup no Painel: quando você tem 5 lançamentos ou mais e nunca baixou um backup (ou o último tem 30 dias ou mais), o Painel avisa e já traz o botão \"Baixar backup\"",
          "Desfazer ao excluir: depois de excluir um lançamento (ou todas as parcelas de uma compra), uma meta ou todos os dados, a mensagem ganha um botão \"Desfazer\" por 10 segundos"
        ]
      },
      {
        "nome": "Alterado",
        "itens": [
          "Excluir um lançamento ou uma meta não pergunta mais \"tem certeza?\": apaga na hora e o botão \"Desfazer\" (10 segundos) devolve. Compra parcelada, \"Apagar tudo\" e \"Restaurar backup\" continuam perguntando"
        ]
      },
      {
        "nome": "Corrigido",
        "itens": [
          "Um backup com dados corrompidos, com nomes especiais no lugar do tipo de renda ou do balde, não faz mais a tela Metas mostrar \"undefined meses\" nem esconde gastos dos totais"
        ]
      }
    ]
  },
  {
    "versao": "0.1.0",
    "rotulo": null,
    "data": "2026-10-01",
    "secoes": [
      {
        "nome": "Adicionado",
        "itens": [
          "App instalável no celular, com ícone na tela inicial, que abre mesmo sem internet",
          "Dados protegidos: o app pede ao navegador para não apagar os dados sozinho, e \"Seus dados\" diz com honestidade o que foi conseguido",
          "Barra de navegação embaixo da tela, com Painel, Lançamentos, Orçamento e Mais (Metas e Método ficam no Mais)",
          "Botão \"+ Lançar\" flutuante, sempre no mesmo canto",
          "Lançar mais rápido: valor, categoria e Salvar à vista; data, descrição, parcelas e lançamento fixo ficam em \"Mais detalhes\"",
          "Visual novo nas telas Metas e Método e na revisão semanal, com itens fáceis de tocar",
          "Este histórico de atualizações, escondido: 5 toques seguidos na barra verde do topo (fora das setinhas de mês) abrem a janela \"Novidades\", com a versão em uso"
        ]
      },
      {
        "nome": "Alterado",
        "itens": [
          "Tamanhos de letra e espaços padronizados em todas as telas",
          "A mensagem de confirmação aparece acima do botão \"+ Lançar\""
        ]
      },
      {
        "nome": "Corrigido",
        "itens": [
          "Alarme falso do começo do mês: a previsão de quanto você vai gastar só vale a partir do 7º dia, e o aviso de envelope já estourado continua desde o dia 1",
          "O botão Salvar não respondia quando a data ficava recolhida em \"Mais detalhes\""
        ]
      }
    ]
  },
  {
    "versao": null,
    "rotulo": "Antes da versão 0.1.0",
    "data": "2026-09-30",
    "secoes": [
      {
        "nome": "Adicionado",
        "itens": [
          "Painel com quatro números que somam a renda: Receitas, Gastos, Guardado e Sobrou",
          "Guardar numa meta conta como guardado, e dá para lançar direto numa meta",
          "Aviso antes de guardar mais do que sobrou no mês",
          "\"Você pode gastar hoje\" até o próximo pagamento e até domingo, sem passar do que sobrou",
          "Revisão semanal no dia que você escolher, com lembrete no Painel",
          "Orçamento com teto para cada balde e sugestão de limites pelo que você realmente gasta",
          "Perguntas simples para montar o orçamento de quem ainda não tem histórico",
          "Orçamento enxuto no começo, com botões \"Adicionar\" e \"Criar\" item",
          "Abas que funcionam com teclado e leitor de tela, e explicações simples das palavras do método",
          "Publicação automática do site depois que todos os testes passam"
        ]
      },
      {
        "nome": "Alterado",
        "itens": [
          "Visual da tela Lançamentos pensado para o polegar, e da tela Orçamento em blocos fáceis de ler",
          "O campo em que você está digitando ganha um traço azul só, sem borda dupla",
          "A taxa de poupança passou a contar só o que foi guardado: dinheiro que sobrou parado não conta"
        ]
      },
      {
        "nome": "Corrigido",
        "itens": [
          "\"Lançar minha renda\" abria o formulário como Despesa em vez de Receita",
          "O foco do teclado sumia depois de uma ação",
          "Os botões Editar, Excluir e Guardar valor agora dizem de qual item são",
          "Dá para escolher a categoria digitando o começo do nome",
          "O app avisa quando um limite do Orçamento é salvo ou removido"
        ]
      }
    ]
  },
  {
    "versao": null,
    "rotulo": "Antes da versão 0.1.0",
    "data": "2026-09-29",
    "secoes": [
      {
        "nome": "Adicionado",
        "itens": [
          "Primeira versão do Método Finan: baldes, envelopes e revisão semanal",
          "Reserva de emergência calculada pelo tipo de renda (6 meses se estável, 12 se variável)",
          "Compras parceladas, com uma parcela por mês",
          "Baldes que se adaptam à situação da pessoa, em vez de um 50/30/20 fixo",
          "Novas categorias: Impostos e taxas, Cuidados pessoais e Presentes e doações",
          "Testes automáticos a cada envio"
        ]
      }
    ]
  }
];
