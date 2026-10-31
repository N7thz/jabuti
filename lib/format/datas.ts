import { format, isValid, parse, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Para datas sem hora: "2024-03-01" da API ou Date gravado como meia-noite UTC no banco.
// Algumas rotas do Portal (CEIS, CNEP) já mandam "17/08/2023"; data que não dá para ler vira "—" em vez de quebrar a página.
export function formatarData(data?: string | Date | null) {
  if (!data) return "—";
  const texto = typeof data === "string" ? data : data.toISOString();
  const dia = /^\d{2}\/\d{2}\/\d{4}/.test(texto)
    ? parse(texto.slice(0, 10), "dd/MM/yyyy", new Date())
    : parseISO(texto.slice(0, 10));
  return isValid(dia) ? format(dia, "dd/MM/yyyy", { locale: ptBR }) : "—";
}

/** Mês e ano por extenso ("setembro de 2026"); `mes` de 1 a 12. */
export const formatarMesAno = (ano: number, mes: number) => format(new Date(ano, mes - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
