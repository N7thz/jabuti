// Glossário do portal: explica, em linguagem simples e sem tratar o leitor como leigo incapaz,
// os conceitos de orçamento, Congresso, eleição e controle que aparecem nas páginas.
// Cada termo vira uma âncora em /glossario#<id> e pode ser explicado no meio do texto com <Termo id="...">.

export type Tema = "orcamento" | "emendas" | "congresso" | "eleicoes" | "controle";

export const TEMAS: Record<Tema, { titulo: string; descricao: string }> = {
  orcamento: {
    titulo: "Como o dinheiro público é gasto",
    descricao: "As etapas por que passa cada real do orçamento, da reserva até a saída do cofre.",
  },
  emendas: {
    titulo: "Emendas parlamentares",
    descricao: "A parte do orçamento federal que deputados e senadores decidem para onde vai.",
  },
  congresso: {
    titulo: "Câmara e Senado",
    descricao: "Como funciona o trabalho dos parlamentares e o que os números do perfil medem.",
  },
  eleicoes: {
    titulo: "Eleições e campanha",
    descricao: "Como os parlamentares são eleitos e de onde vem o dinheiro das campanhas.",
  },
  controle: {
    titulo: "Controle e fiscalização",
    descricao: "Quem fiscaliza o uso do dinheiro público e o que significam as punições.",
  },
};

export type Verbete = {
  id: string;
  termo: string;
  tema: Tema;
  /** Uma frase, mostrada no balão de explicação. */
  curto: string;
  /** Explicação completa, um parágrafo por item, mostrada no glossário. */
  explicacao: string[];
  /** Por que isso importa para quem quer acompanhar e cobrar o político. */
  importancia?: string;
};

export const GLOSSARIO = [
  // Orçamento
  {
    id: "orcamento",
    termo: "Orçamento da União",
    tema: "orcamento",
    curto: "A lei aprovada todo ano pelo Congresso que diz quanto o governo federal espera arrecadar e em que pode gastar.",
    explicacao: [
      "O governo envia a proposta, o Congresso muda e aprova, e o presidente sanciona. O nome oficial é Lei Orçamentária Anual (LOA).",
      "O orçamento autoriza o gasto, mas não garante que ele aconteça: cada despesa ainda passa por empenho, liquidação e pagamento.",
    ],
  },
  {
    id: "dotacao",
    termo: "Dotação (inicial e atualizada)",
    tema: "orcamento",
    curto: "Quanto a lei do orçamento autoriza gastar em cada área. A inicial é a aprovada; a atualizada inclui as mudanças feitas no ano.",
    explicacao: [
      "Durante o ano, o Congresso e o governo podem aumentar a dotação (com créditos suplementares, especiais ou extraordinários) ou cancelar parte dela. Por isso a dotação atualizada costuma ser diferente da inicial.",
      "Dotação é autorização, não gasto: o dinheiro só sai depois de empenho, liquidação e pagamento.",
    ],
    importancia: "Comparar a dotação com o que foi liquidado mostra se o governo está de fato executando o que a lei previu.",
  },
  {
    id: "encargos-especiais",
    termo: "Encargos Especiais",
    tema: "orcamento",
    curto: "Área do orçamento com despesas que não viram serviço direto: juros e pagamento da dívida e repasses obrigatórios a estados e municípios.",
    explicacao: [
      "É a maior fatia do orçamento federal. Inclui os juros da dívida pública, a amortização (pagamento do principal) e as transferências que a Constituição manda fazer, como os fundos de participação de estados e municípios.",
      "Por isso, ao comparar áreas, vale olhar Encargos Especiais à parte: ela não concorre com saúde ou educação do mesmo jeito.",
    ],
  },
  {
    id: "refinanciamento-divida",
    termo: "Refinanciamento da dívida",
    tema: "orcamento",
    curto: "Quando o governo emite títulos novos para pagar títulos da dívida que estão vencendo. Aparece no orçamento, mas não é gasto com serviços.",
    explicacao: [
      "Funciona como trocar uma dívida antiga por uma nova. O valor entra na LOA e por isso o total do orçamento federal parece muito maior do que o dinheiro disponível para políticas públicas.",
      "O portal mostra o refinanciamento separado, para não misturar com as despesas do dia a dia do governo.",
    ],
  },
  {
    id: "reserva-contingencia",
    termo: "Reserva de contingência",
    tema: "orcamento",
    curto: "Parte do orçamento guardada para despesas imprevistas e riscos fiscais, que pode ser remanejada ao longo do ano.",
    explicacao: ["Não é uma área de gasto: é uma sobra planejada. Quando usada, o valor passa para a área que precisou dele."],
  },
  {
    id: "empenho",
    termo: "Empenho (valor empenhado)",
    tema: "orcamento",
    curto: "Primeira etapa do gasto: o governo reserva o dinheiro para uma despesa. É uma promessa, ainda não um pagamento.",
    explicacao: [
      "Ao empenhar, o governo separa parte do orçamento para um fim específico, como uma obra ou uma compra, e esse valor não pode ser usado para outra coisa.",
      "Um empenho pode ser cancelado depois. Por isso, valor empenhado alto não quer dizer que o dinheiro chegou.",
    ],
    importancia: "Políticos costumam anunciar o valor empenhado. Para saber se o dinheiro chegou, olhe o valor pago.",
  },
  {
    id: "liquidacao",
    termo: "Liquidação (valor liquidado)",
    tema: "orcamento",
    curto: "Segunda etapa: o governo confere que a obra, o serviço ou a compra foi de fato entregue.",
    explicacao: [
      "Só depois de verificar a entrega, com nota fiscal e medição da obra, por exemplo, o governo reconhece que deve pagar.",
    ],
  },
  {
    id: "pagamento",
    termo: "Pagamento (valor pago)",
    tema: "orcamento",
    curto: "Última etapa: o dinheiro sai dos cofres públicos para quem fez o serviço ou para o município.",
    explicacao: [
      "É o número que mostra o que realmente foi gasto. A diferença entre empenhado e pago mostra o quanto ainda está prometido, atrasado ou foi cancelado.",
    ],
    importancia: "Compare o pago com o empenhado: uma diferença grande e antiga merece pergunta.",
  },
  {
    id: "funcao-governo",
    termo: "Área (função de governo)",
    tema: "orcamento",
    curto: "Classificação de cada despesa pela área em que o dinheiro é usado: Saúde, Educação, Urbanismo, Transporte...",
    explicacao: [
      "União, estados e municípios usam a mesma lista de funções. Por isso dá para comparar quanto uma cidade gasta em saúde com o que recebeu de emendas para saúde.",
      "Cada função se divide em subfunções, como Atenção Básica dentro de Saúde.",
    ],
  },
  {
    id: "receita",
    termo: "Receita realizada",
    tema: "orcamento",
    curto: "Tudo o que a prefeitura ou o estado de fato arrecadou no ano, de impostos próprios a repasses do governo federal.",
    explicacao: [
      "Inclui impostos locais (como IPTU e ISS), a parte que a cidade recebe de impostos federais e estaduais e transferências para saúde e educação.",
      "Comparar as emendas com a receita mostra o peso delas na cidade: em municípios pequenos, podem ser uma fatia grande do dinheiro disponível.",
    ],
  },
  {
    id: "custeio-investimento",
    termo: "Custeio e investimento",
    tema: "orcamento",
    curto: "Custeio mantém um serviço funcionando (material, manutenção); investimento cria patrimônio (obras, equipamentos).",
    explicacao: [
      "Comprar remédios ou consertar uma escola é custeio. Construir um posto de saúde ou comprar uma ambulância é investimento.",
      "Nas emendas Pix, a Constituição exige que pelo menos 70% do valor vá para investimento.",
    ],
  },

  // Emendas
  {
    id: "emenda",
    termo: "Emenda parlamentar",
    tema: "emendas",
    curto: "Parte do orçamento federal que deputados e senadores indicam para onde vai: uma obra, um serviço, uma cidade.",
    explicacao: [
      "Todo ano, ao votar o orçamento, os parlamentares podem mudar a proposta do governo e destinar recursos. Cada mudança é uma emenda.",
      "Desde 2015 as emendas individuais são obrigatórias: o governo tem de executá-las, salvo impedimento técnico. As de bancada passaram a ser obrigatórias em 2019.",
    ],
    importancia:
      "Emendas são uma das principais formas de o parlamentar levar dinheiro para sua base eleitoral. Ver para onde vão ajuda a entender suas prioridades.",
  },
  {
    id: "emenda-individual",
    termo: "Emenda individual",
    tema: "emendas",
    curto: "Emenda que cada deputado e senador apresenta sozinho, dentro de um valor anual igual para todos.",
    explicacao: [
      "Metade do valor das emendas individuais precisa ir para a saúde. Elas podem ser de finalidade definida ou transferências especiais (emendas Pix).",
    ],
  },
  {
    id: "emenda-bancada",
    termo: "Emenda de bancada",
    tema: "emendas",
    curto: "Emenda apresentada em conjunto pelos deputados e senadores de um mesmo estado.",
    explicacao: [
      "Costuma financiar obras maiores, de interesse do estado inteiro. A autoria é coletiva, então não aparece em nome de um único parlamentar.",
    ],
  },
  {
    id: "emenda-comissao",
    termo: "Emenda de comissão",
    tema: "emendas",
    curto: "Emenda indicada por uma comissão da Câmara ou do Senado, como a de Saúde ou a de Agricultura.",
    explicacao: [
      "Não é de execução obrigatória. Ganhou peso depois que o Supremo Tribunal Federal derrubou as emendas de relator, em 2022, e passou a receber parte desse dinheiro.",
      "Como a autoria é da comissão, nem sempre se sabe qual parlamentar pediu cada indicação.",
    ],
  },
  {
    id: "emenda-pix",
    termo: "Emenda Pix (transferência especial)",
    tema: "emendas",
    curto: "Emenda individual em que o dinheiro cai direto na conta da prefeitura ou do estado, sem convênio nem projeto aprovado antes.",
    explicacao: [
      "Foi criada em 2019. Quem recebe decide em que gastar, respeitando algumas regras: não pode pagar salários nem dívidas, e pelo menos 70% deve ir para investimento.",
      "Por ser rápida e com pouco controle prévio, foi muito criticada pela dificuldade de rastrear o destino. Em 2024 o Supremo passou a exigir plano de trabalho e mais transparência.",
    ],
    importancia: "Abra cada emenda Pix para ver o que a cidade disse que faria com o dinheiro e se já informou o que executou.",
  },
  {
    id: "finalidade-definida",
    termo: "Emenda com finalidade definida",
    tema: "emendas",
    curto: "Emenda em que o dinheiro já vai amarrado a um objeto e a uma área, como a reforma de uma escola específica.",
    explicacao: [
      "O repasse costuma passar por convênio ou por um fundo (como o Fundo Nacional de Saúde), com projeto, acompanhamento e prestação de contas pelo órgão federal.",
    ],
  },
  {
    id: "plano-de-trabalho",
    termo: "Plano de trabalho",
    tema: "emendas",
    curto: "Documento em que quem recebe a emenda Pix diz em que vai usar o dinheiro, com objeto, metas e prazo.",
    explicacao: [
      "Fica registrado no Transferegov. Depois, quem recebeu envia relatórios de gestão informando quanto já executou.",
      "Os valores executados são declarados pelo próprio ente; a conferência é feita pelos órgãos de controle.",
    ],
  },
  {
    id: "executor",
    termo: "Executor",
    tema: "emendas",
    curto: "Órgão que de fato gasta o dinheiro da emenda Pix, como a secretaria de saúde ou de obras da prefeitura.",
    explicacao: ["Uma mesma emenda pode ter mais de um executor, cada um com seu objeto e suas metas."],
  },

  // Congresso
  {
    id: "legislatura",
    termo: "Legislatura",
    tema: "congresso",
    curto: "Período de quatro anos de trabalho do Congresso, que começa em fevereiro do ano seguinte à eleição.",
    explicacao: [
      "A atual é a 57ª legislatura, de 2023 a 2027. Deputados têm mandato de uma legislatura; senadores, de duas (oito anos).",
    ],
  },
  {
    id: "jabuti",
    termo: "Jabuti",
    tema: "congresso",
    curto: "Trecho incluído num projeto de lei ou medida provisória que não tem nada a ver com o assunto dele.",
    explicacao: [
      "O nome vem do ditado \"jabuti não sobe em árvore: se está lá, foi enchente ou mão de gente\". Quando um tema estranho aparece no meio de uma lei, alguém o colocou ali de propósito.",
      "O jabuti costuma pegar carona numa proposta com votação rápida ou com apoio garantido, para passar sem o debate que teria sozinho. O Supremo Tribunal Federal já decidiu que essa prática é inconstitucional em medidas provisórias, mas ela continua aparecendo.",
    ],
    importancia: "É também o nome deste portal: a ideia é ajudar a perguntar quem colocou cada coisa onde está.",
  },
  {
    id: "suplente",
    termo: "Suplente",
    tema: "congresso",
    curto: "Quem assume o lugar do titular quando ele se afasta, vira ministro ou deixa o cargo.",
    explicacao: [
      "Cada senador é eleito com dois suplentes, que ninguém escolhe diretamente. No caso dos deputados, o suplente é o próximo mais votado do mesmo partido ou federação.",
    ],
  },
  {
    id: "cota-parlamentar",
    termo: "Cota parlamentar",
    tema: "congresso",
    curto: "Verba mensal que cada parlamentar recebe para despesas do mandato, como passagens, combustível, escritório e divulgação.",
    explicacao: [
      "Na Câmara se chama CEAP; no Senado, CEAPS. O valor varia conforme o estado, porque o custo de viajar até Brasília é diferente.",
      "O gasto é reembolsado com nota fiscal, e cada nota é pública.",
    ],
    importancia: "Gastos repetidos com o mesmo fornecedor ou muito acima da média merecem uma olhada mais atenta.",
  },
  {
    id: "proposicao",
    termo: "Proposição",
    tema: "congresso",
    curto: "Qualquer proposta apresentada ao Congresso: projeto de lei, emenda à Constituição, requerimento, indicação...",
    explicacao: [
      "Nem toda proposição vira lei. Muitas são pedidos de informação ou homenagens, então a quantidade sozinha não mede a qualidade do trabalho.",
    ],
  },
  {
    id: "votacao-nominal",
    termo: "Votação nominal",
    tema: "congresso",
    curto: "Votação em que o voto de cada parlamentar fica registrado com o nome dele.",
    explicacao: [
      "Muitas decisões são tomadas em votação simbólica, em que o presidente da sessão apenas anuncia o resultado, sem registrar quem votou como. Essas não aparecem no histórico de votos de ninguém.",
    ],
  },
  {
    id: "presenca",
    termo: "Presença e falta",
    tema: "congresso",
    curto: "Se o parlamentar marcou presença nas sessões e reuniões em que deveria estar.",
    explicacao: [
      "Algumas ausências são justificadas, como licença médica ou missão oficial, e não descontam salário. O portal mostra separadamente as faltas justificadas e as não justificadas.",
    ],
  },
  {
    id: "bancada",
    termo: "Bancada",
    tema: "congresso",
    curto: "Grupo de parlamentares com algo em comum: o mesmo estado, o mesmo partido ou o mesmo interesse.",
    explicacao: [
      "A bancada de um estado reúne os deputados e os três senadores eleitos por ele. Existem também bancadas temáticas, como a ruralista ou a da saúde.",
    ],
  },

  // Eleições
  {
    id: "sistema-proporcional",
    termo: "Eleito por quociente (QP) ou por média",
    tema: "eleicoes",
    curto: "Deputados são eleitos pelo sistema proporcional: os votos do partido definem quantas vagas ele ganha, e os mais votados dele ocupam essas vagas.",
    explicacao: [
      "Os votos de todos os candidatos do partido ou federação são somados. \"Eleito por QP\" quer dizer que o candidato ficou com uma das vagas garantidas por essa soma; \"eleito por média\", com uma das vagas que sobraram e foram distribuídas depois.",
      "Por isso um candidato muito votado pode ajudar a eleger outros do mesmo partido. Senadores, ao contrário, são eleitos por maioria: vence quem tem mais votos.",
    ],
  },
  {
    id: "fundo-eleitoral",
    termo: "Fundo eleitoral",
    tema: "eleicoes",
    curto: "Dinheiro público dividido entre os partidos para pagar campanhas eleitorais.",
    explicacao: [
      "Foi criado em 2017, depois que o Supremo proibiu doações de empresas. O nome oficial é Fundo Especial de Financiamento de Campanha (FEFC). Em 2022, somou cerca de R$ 4,9 bilhões.",
      "Cada partido decide como repartir sua parte entre os candidatos.",
    ],
    importancia: "Mostra quanto da campanha foi paga com dinheiro de impostos e quanto o partido apostou em cada candidato.",
  },
  {
    id: "fundo-partidario",
    termo: "Fundo partidário",
    tema: "eleicoes",
    curto: "Dinheiro público repassado todo mês aos partidos para o funcionamento deles, que também pode ir para campanhas.",
    explicacao: ["A divisão entre os partidos depende principalmente do número de deputados que cada um elegeu."],
  },
  {
    id: "doacao",
    termo: "Doações de campanha",
    tema: "eleicoes",
    curto: "Dinheiro que pessoas dão a candidatos. Empresas não podem doar desde 2015.",
    explicacao: [
      "Cada pessoa pode doar até 10% do que ganhou no ano anterior. O candidato também pode usar recursos próprios, dentro de um limite.",
      "Todas as doações são declaradas ao TSE na prestação de contas da campanha.",
    ],
    importancia: "Grandes doadores podem ter interesse nas decisões do parlamentar. Vale cruzar quem doou com o que ele vota e para onde manda emendas.",
  },
  {
    id: "bens-declarados",
    termo: "Bens declarados",
    tema: "eleicoes",
    curto: "Lista de imóveis, veículos, aplicações e outros bens que o candidato entrega ao TSE ao se candidatar.",
    explicacao: [
      "Os valores são informados pelo próprio candidato e costumam ser o preço pago na compra, não o valor atual de mercado. Por isso podem parecer baixos.",
      "Comparar a declaração de uma eleição com a da seguinte mostra como o patrimônio mudou durante o mandato.",
    ],
  },

  // Controle
  {
    id: "tcu",
    termo: "TCU (Tribunal de Contas da União)",
    tema: "controle",
    curto: "Órgão que fiscaliza o uso do dinheiro federal e julga as contas de quem o administra.",
    explicacao: [
      "Apesar do nome, não faz parte do Poder Judiciário: ajuda o Congresso a fiscalizar o governo. Pode multar, mandar devolver dinheiro e aplicar punições como inabilitação e inidoneidade.",
    ],
  },
  {
    id: "inabilitacao",
    termo: "Inabilitação",
    tema: "controle",
    curto: "Punição do TCU que proíbe a pessoa de ocupar cargo de confiança no governo federal por 5 a 8 anos.",
    explicacao: [
      "É aplicada a quem cometeu irregularidade grave na gestão de dinheiro federal. Não impede, sozinha, de se candidatar ou de exercer mandato eletivo.",
    ],
  },
  {
    id: "inidoneidade",
    termo: "Inidoneidade",
    tema: "controle",
    curto: "Punição que proíbe uma empresa ou pessoa de participar de licitações e de fechar contratos com o governo.",
    explicacao: [
      "O TCU pode declarar inidôneo por até 5 anos quem fraudou uma licitação. Outros órgãos também aplicam punições parecidas, reunidas no CEIS.",
    ],
  },
  {
    id: "acordao",
    termo: "Acórdão",
    tema: "controle",
    curto: "Decisão tomada por um grupo de julgadores de um tribunal, e não por um só.",
    explicacao: ["No TCU, o número do acórdão (como AC-001792/2026-PL) identifica a decisão e permite consultá-la no site do tribunal."],
  },
  {
    id: "transito-em-julgado",
    termo: "Trânsito em julgado",
    tema: "controle",
    curto: "Momento em que uma decisão se torna definitiva, porque não cabe mais recurso.",
    explicacao: ["Antes disso, a pessoa ainda pode contestar. As punições do TCU mostradas aqui contam a partir dessa data."],
  },
  {
    id: "ceis",
    termo: "CEIS",
    tema: "controle",
    curto: "Cadastro de Empresas Inidôneas e Suspensas: lista de quem está proibido de contratar com o governo, mantida pela CGU.",
    explicacao: [
      "Reúne punições aplicadas por órgãos federais, estaduais e municipais. Uma empresa no CEIS não pode vencer licitações enquanto durar a sanção.",
    ],
  },
  {
    id: "cnep",
    termo: "CNEP",
    tema: "controle",
    curto: "Cadastro Nacional de Empresas Punidas: empresas condenadas com base na Lei Anticorrupção.",
    explicacao: ["Inclui multas e acordos de leniência, em que a empresa admite irregularidades e colabora com as investigações."],
  },
  {
    id: "transferegov",
    termo: "Transferegov",
    tema: "controle",
    curto: "Sistema do governo federal onde ficam registrados os repasses para estados e municípios, inclusive as emendas Pix.",
    explicacao: ["É ali que quem recebe a emenda Pix registra o plano de trabalho e informa o que executou."],
  },
  {
    id: "rreo",
    termo: "RREO (relatório bimestral do orçamento)",
    tema: "controle",
    curto: "Relatório que a União, os estados e os municípios publicam a cada dois meses mostrando quanto arrecadaram e gastaram.",
    explicacao: [
      "É exigido pela Lei de Responsabilidade Fiscal e sai até 30 dias depois do fim de cada bimestre. Por isso os números do ano em curso vão até o último bimestre publicado, e não até hoje.",
    ],
  },
  {
    id: "siconfi",
    termo: "Contas anuais (SICONFI)",
    tema: "controle",
    curto: "Prestação de contas que cada prefeitura e cada estado envia ao Tesouro Nacional todo ano.",
    explicacao: [
      "A Declaração de Contas Anuais traz quanto o ente arrecadou e gastou em cada área. Deve ser entregue até 30 de abril do ano seguinte, por isso os dados do ano passado podem ainda não estar disponíveis.",
    ],
  },
  {
    id: "homonimo",
    termo: "Homônimo",
    tema: "controle",
    curto: "Pessoa com o mesmo nome de outra.",
    explicacao: [
      "Quando o portal só consegue encontrar um registro pelo nome, avisa que pode ser outra pessoa. Com o CPF o resultado é exato, mas o portal nunca mostra o CPF.",
    ],
  },
] as const satisfies readonly Verbete[];

export type IdTermo = (typeof GLOSSARIO)[number]["id"];

const POR_ID = new Map<string, Verbete>(GLOSSARIO.map((v) => [v.id, v]));

export function verbete(id: IdTermo): Verbete {
  return POR_ID.get(id)!;
}
