// CSV para planilhas brasileiras: separador ";" (a vírgula é o separador decimal no Excel em pt-BR),
// BOM no início para o Excel reconhecer UTF-8 e valores numéricos com vírgula decimal.

export type Celula = string | number | boolean | null | undefined;

const SEPARADOR = ";";

export function celulaCsv(valor: Celula) {
  if (valor === null || valor === undefined) return "";
  const texto =
    typeof valor === "number"
      ? String(valor).replace(".", ",")
      : typeof valor === "boolean"
        ? valor
          ? "sim"
          : "não"
        : valor;
  // Aspas quando há separador, aspas ou quebra de linha; fórmulas (=, +, -, @) ganham um apóstrofo
  // para a planilha não executar o conteúdo vindo das fontes.
  const seguro = /^[=+\-@]/.test(texto) && typeof valor === "string" ? `'${texto}` : texto;
  return /[";\r\n]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro;
}

export function gerarCsv(cabecalho: string[], linhas: Celula[][]) {
  return "﻿" + [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(SEPARADOR)).join("\r\n") + "\r\n";
}

/** Centavos inteiros → "1234,56" (sem separador de milhar, para a planilha somar). */
export const reaisCsv = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

/** Nome de arquivo seguro: sem acentos, espaços viram hífen. */
export function nomeArquivo(...partes: (string | number)[]) {
  return (
    partes
      .map((p) =>
        String(p)
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      )
      .filter(Boolean)
      .join("-") + ".csv"
  );
}

export function respostaCsv(arquivo: string, conteudo: string) {
  return new Response(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
