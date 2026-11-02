import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Anos das páginas com dados anuais (perfis, comparação, emendas, ranking da cota). O ano corrente
// ainda não acabou: ele aparece como "até o momento" para ninguém comparar um ano parcial com um
// ano fechado sem perceber.

export const anoCorrente = (hoje = new Date()) => hoje.getUTCFullYear();

export const anoEmAndamento = (ano: number, hoje = new Date()) => ano === anoCorrente(hoje);

/** "2026 (até o momento)" no ano corrente; "2025" nos anos fechados. */
export const rotuloAno = (ano: number, hoje = new Date()) =>
  anoEmAndamento(ano, hoje) ? `${ano} (até o momento)` : String(ano);

/** "de 1º de janeiro a 2 de novembro de 2026" no ano corrente; "de janeiro a dezembro de 2025" nos fechados. */
export function periodoDoAno(ano: number, hoje = new Date()) {
  if (!anoEmAndamento(ano, hoje)) return `de janeiro a dezembro de ${ano}`;
  return `de 1º de janeiro a ${format(hoje, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
}

/** Anos de `inicio` até o corrente, do mais recente ao mais antigo. */
export function anosDesde(inicio: number, hoje = new Date()) {
  const fim = anoCorrente(hoje);
  const primeiro = Math.min(inicio, fim);
  return Array.from({ length: fim - primeiro + 1 }, (_, i) => fim - i);
}

/** Primeiro ano da legislatura da Câmara (a 57ª começou em 2023; cada uma dura 4 anos). */
export const inicioDaLegislatura = (idLegislatura: number) => 1795 + 4 * idLegislatura;

/** Primeiro ano da legislatura em curso no ano dado. */
export const inicioDaLegislaturaDoAno = (ano: number) => 2023 + 4 * Math.floor((ano - 2023) / 4);

/** O `?ano=` da URL, se for um dos anos oferecidos; senão o mais recente da lista. */
export function anoDaUrl(valor: string | string[] | undefined, anos: readonly number[]) {
  const ano = Number(Array.isArray(valor) ? valor[0] : valor);
  return anos.includes(ano) ? ano : anos[0];
}
