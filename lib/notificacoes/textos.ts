import type { TipoVoto } from "../generated/prisma/enums";
import { situacaoLegivel } from "../leis/etapas";
import { ROTULO_VOTO } from "../votacoes/rotulos";

// Funções puras que montam o texto das notificações. Sem banco nem rede, para testar à parte.

/** Separa "camara-204379" em casa e id; `null` se a chave não tiver esse formato. */
export function lerChave(chave: string) {
  const m = /^(camara|senado)-(\d+)$/.exec(chave);
  return m ? { casa: m[1] as "camara" | "senado", id: m[2] } : null;
}

/** "PL 123/2025", quando a votação tem proposição; senão o começo da descrição. */
export function tituloVotacao(v: { descricao: string; proposicao: { siglaTipo: string; numero: number; ano: number } | null }) {
  if (v.proposicao) return `Votação do ${v.proposicao.siglaTipo} ${v.proposicao.numero}/${v.proposicao.ano}`;
  const d = v.descricao.trim().replace(/\s+/g, " ");
  return d.length > 90 ? `${d.slice(0, 89)}…` : d || "Votação nominal";
}

/** "Fulano votou Sim. Beltrana: Ausente." para os seguidos que participaram da mesma votação. */
export function textoVotos(votos: { nome: string; tipo: TipoVoto }[]) {
  return [...votos]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((v) => `${v.nome}: ${ROTULO_VOTO[v.tipo]}`)
    .join(" · ");
}

/** Situação comparável de um projeto: muda quando a situação ou a data dela mudam. */
export function estadoDoProjeto(situacao: string | null | undefined, data: string | null | undefined) {
  const s = situacao?.trim();
  if (!s) return null;
  return `${s}|${data?.slice(0, 10) ?? ""}`;
}

/** Texto da notificação de nova situação de um projeto a partir do `estadoDoProjeto`. */
export function textoEstado(estado: string) {
  const [situacao, data] = estado.split("|");
  const legivel = situacaoLegivel(situacao) ?? situacao;
  if (!data) return `Nova situação: ${legivel}.`;
  const [ano, mes, dia] = data.split("-");
  return `Nova situação: ${legivel} (desde ${dia}/${mes}/${ano}).`;
}

/** Hash curto e estável do estado para compor a chave do evento (a situação pode ser longa). */
export function hashCurto(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
