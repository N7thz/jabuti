import type { NextRequest } from "next/server";

import { csvOuErro, gerarCsv, nomeArquivo, reaisCsv, respostaCsv } from "@/lib/csv";
import { getEmendasMunicipio } from "@/lib/emendas/queries";

/** GET /api/csv/emendas-municipio?ibge=3550308&ano=2025: emendas destinadas à cidade no ano. */
export async function GET(request: NextRequest) {
  const ibge = request.nextUrl.searchParams.get("ibge") ?? "";
  const ano = request.nextUrl.searchParams.get("ano") ?? "";
  if (!/^\d{7}$/.test(ibge) || !/^\d{4}$/.test(ano)) {
    return Response.json({ error: "Informe o código IBGE (7 dígitos) e o ano" }, { status: 400 });
  }

  return csvOuErro("o banco do portal", async () => {
    const { emendas } = await getEmendasMunicipio(Number(ibge), Number(ano));
    const csv = gerarCsv(
      ["Emenda", "Autor", "Tipo", "Área", "Subárea", "Empenhado (R$)", "Liquidado (R$)", "Pago (R$)"],
      emendas.map((e) => [
        e.codigoEmenda,
        e.autorNome,
        e.tipo,
        e.funcao,
        e.subfuncao,
        reaisCsv(e.totais.empenhado),
        reaisCsv(e.totais.liquidado),
        reaisCsv(e.totais.pago),
      ]),
    );
    return respostaCsv(nomeArquivo("emendas", ibge, ano), csv);
  });
}
