import type { AbrangenciaEmenda } from "@/lib/generated/prisma/enums";
import type { IdTermo } from "@/lib/glossario";

/** Como cada destino aparece para o público. */
export const ROTULO_ABRANGENCIA: Record<AbrangenciaEmenda, string> = {
  MUNICIPIO: "Para municípios",
  ESTADO: "Para o governo do estado",
  REGIAO: "Para a região",
  NACIONAL: "Nacional",
  EXTERIOR: "Exterior",
  MULTIPLA: "Vários locais",
  NAO_INFORMADA: "Local não informado",
};

/** Verbete do glossário para o tipo de emenda como o Portal publica ("Emenda Individual - Transferências Especiais"...). */
export function termoDoTipo(tipo: string): IdTermo | null {
  if (tipo.includes("Transferências Especiais")) return "emenda-pix";
  if (tipo.includes("Finalidade Definida")) return "finalidade-definida";
  if (tipo.includes("Bancada")) return "emenda-bancada";
  if (tipo.includes("Comissão")) return "emenda-comissao";
  if (tipo.includes("Individual")) return "emenda-individual";
  return null;
}

/** Lê `?ano=` da URL; cai no ano mais recente quando vier vazio ou fora da lista. */
export function anoEscolhido(valor: string | string[] | undefined, anos: number[]) {
  const ano = Number(Array.isArray(valor) ? valor[0] : valor);
  return anos.includes(ano) ? ano : anos[0];
}
