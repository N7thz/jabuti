// "Cobrar o parlamentar": monta a mensagem a partir de um fato concreto. Funções puras, sem rede.
// O tom é o de um cidadão pedindo explicação: educado, específico e sem acusar.

export interface Destinatario {
  nome: string;
  casa: "camara" | "senado";
  partido: string | null;
  uf: string | null;
}

export interface Fato {
  /** Valor do `?fato=` na URL. */
  id: string;
  /** Rótulo curto na escolha. */
  titulo: string;
  /** O fato, em uma frase, com o número e a fonte. */
  resumo: string;
  /** Pedido de explicação, em uma ou duas frases. */
  pergunta: string;
  /** Assunto do email. */
  assunto: string;
}

export const tratamento = (casa: Destinatario["casa"]) => (casa === "camara" ? "Deputado(a)" : "Senador(a)");

export const nomeDaCasa = (casa: Destinatario["casa"]) => (casa === "camara" ? "Câmara dos Deputados" : "Senado Federal");

/** Texto completo da mensagem, pronto para editar. */
export function montarMensagem(d: Destinatario, fato: Fato) {
  return [
    `Prezado(a) ${tratamento(d.casa)} ${d.nome},`,
    `Sou cidadão(ã) e acompanho o seu mandato pelos dados públicos da ${nomeDaCasa(d.casa)}.`,
    fato.resumo,
    fato.pergunta,
    "Agradeço a atenção e aguardo a sua resposta.",
    "Atenciosamente,\n[seu nome]\n[sua cidade e estado]",
  ].join("\n\n");
}

/** Link mailto com assunto e corpo; sem email, `null`. */
export function linkEmail(email: string | null, assunto: string, corpo: string) {
  if (!email) return null;
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

/**
 * Telefone de gabinete em Brasília no formato de exibição e de link. As APIs mandam só o número
 * local ("3215-5401" na Câmara, "33036333" no Senado); o DDD de Brasília é 61.
 */
export function telefone(numero: string | null | undefined) {
  const digitos = numero?.replace(/\D/g, "") ?? "";
  const local = digitos.length === 10 && digitos.startsWith("61") ? digitos.slice(2) : digitos;
  if (local.length !== 8) return null;
  return { exibir: `(61) ${local.slice(0, 4)}-${local.slice(4)}`, href: `tel:+5561${local}` };
}

const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

export function fatoPresenca(casa: Destinatario["casa"], ano: string, presentes: number, total: number): Fato {
  const onde = casa === "camara" ? "sessões deliberativas do plenário" : "votações nominais do plenário";
  return {
    id: "presenca",
    titulo: `Presença em ${ano}: ${presentes} de ${total} ${onde}`,
    resumo: `Segundo os dados abertos da ${nomeDaCasa(casa)}, em ${ano} o(a) senhor(a) registrou presença em ${presentes} de ${total} ${onde} (${pct.format(total ? presentes / total : 0)}).`,
    pergunta:
      presentes < total
        ? "Gostaria de entender os motivos das ausências e saber como o(a) senhor(a) acompanhou as decisões tomadas nesses dias."
        : "Gostaria de saber quais votações desse período o(a) senhor(a) considera mais importantes para quem representa.",
    assunto: `Pedido de informação: presença em plenário em ${ano}`,
  };
}

export function fatoCota(ano: string, total: string, maiorItem: { tipo: string; total: string } | null): Fato {
  return {
    id: "cota",
    titulo: `Gasto da cota parlamentar em ${ano}: ${total}`,
    resumo: `Em ${ano}, os gastos do seu gabinete com a cota para o exercício da atividade parlamentar somam ${total}${
      maiorItem ? `; o maior item foi "${maiorItem.tipo}", com ${maiorItem.total}` : ""
    }.`,
    pergunta: "Poderia explicar quais foram os principais gastos e de que forma eles ajudam no trabalho do mandato?",
    assunto: `Pedido de informação: gastos da cota parlamentar em ${ano}`,
  };
}

export function fatoVoto(voto: { id: string; data: string; proposicao: string | null; descricao: string; votoOriginal: string }): Fato {
  const sobre = voto.proposicao ? `sobre ${voto.proposicao}` : "nominal";
  const descricao = voto.descricao.length > 200 ? `${voto.descricao.slice(0, 197).trimEnd()}...` : voto.descricao;
  return {
    id: `voto-${voto.id}`,
    titulo: `Voto em ${voto.data}${voto.proposicao ? ` (${voto.proposicao})` : ""}: ${voto.votoOriginal}`,
    resumo: `Na votação ${sobre} de ${voto.data} ("${descricao}"), o seu voto foi registrado como "${voto.votoOriginal}".`,
    pergunta: "Gostaria de conhecer as razões desse voto e como ele atende às pessoas que o(a) senhor(a) representa.",
    assunto: `Pedido de explicação: voto ${voto.proposicao ? `no ${voto.proposicao}` : `de ${voto.data}`}`,
  };
}

export function fatoProjetos(ano: string, quantidade: number, maisRecente: { rotulo: string; ementa: string | null } | null): Fato {
  if (quantidade === 0) {
    return {
      id: "projetos",
      titulo: `Projetos apresentados em ${ano}: nenhum`,
      resumo: `Não encontrei nos dados abertos proposições de sua autoria apresentadas em ${ano}.`,
      pergunta: "Gostaria de saber quais são as prioridades do seu mandato e que propostas o(a) senhor(a) pretende apresentar.",
      assunto: `Pedido de informação: prioridades do mandato em ${ano}`,
    };
  }
  const recente = maisRecente
    ? ` A mais recente é ${maisRecente.rotulo}${maisRecente.ementa ? `: "${maisRecente.ementa.length > 200 ? `${maisRecente.ementa.slice(0, 197).trimEnd()}...` : maisRecente.ementa}"` : ""}.`
    : "";
  return {
    id: "projetos",
    titulo: `Projetos apresentados em ${ano}: ${quantidade}`,
    resumo: `Em ${ano}, o(a) senhor(a) apresentou ${quantidade} ${quantidade === 1 ? "proposição" : "proposições"}.${recente}`,
    pergunta: "Gostaria de saber em que fase estão e quais o(a) senhor(a) considera prioritárias.",
    assunto: `Pedido de informação: projetos apresentados em ${ano}`,
  };
}
