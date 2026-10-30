import type { NextRequest } from "next/server";

import { csvOuErro, gerarCsv, nomeArquivo, respostaCsv } from "@/lib/csv";
import { getDespesasDeputado } from "@/lib/parlamentares/queries";

/** GET /api/csv/cota?id=204379&legislatura=57: gastos da cota do deputado no ano corrente (API da Câmara). */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const legislatura = request.nextUrl.searchParams.get("legislatura") ?? "";
  if (!/^\d{1,10}$/.test(id) || !/^\d{1,3}$/.test(legislatura)) {
    return Response.json({ error: "Informe o id do deputado e a legislatura" }, { status: 400 });
  }

  return csvOuErro("a API da Câmara", async () => {
    const { ano, despesas } = await getDespesasDeputado(Number(id), Number(legislatura));
    const csv = gerarCsv(
      ["Data", "Tipo de gasto", "Fornecedor", "CNPJ do fornecedor", "Valor líquido (R$)", "Documento"],
      despesas.map((d) => [
        d.dataDocumento?.slice(0, 10),
        d.tipoDespesa,
        d.nomeFornecedor,
        // CPF de pessoa física fica de fora, mesmo que a Câmara publique.
        d.cnpjCpfFornecedor?.replace(/\D/g, "").length === 14 ? d.cnpjCpfFornecedor : null,
        d.valorLiquido,
        d.urlDocumento,
      ]),
    );
    return respostaCsv(nomeArquivo("cota", "deputado", id, ano), csv);
  });
}
