import type { NextRequest } from "next/server";

import { csvOuErro, gerarCsv, nomeArquivo, respostaCsv } from "@/lib/csv";
import { anoCorrente } from "@/lib/anos";
import { getDespesasDeputado } from "@/lib/parlamentares/queries";

/** GET /api/csv/cota?id=204379&ano=2025: gastos da cota do deputado no ano (sem ano, o corrente; API da Câmara). */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const ano = Number(request.nextUrl.searchParams.get("ano") ?? anoCorrente());
  if (!/^\d{1,10}$/.test(id) || !Number.isInteger(ano) || ano < 2008 || ano > anoCorrente()) {
    return Response.json({ error: "Informe o id do deputado e um ano a partir de 2008" }, { status: 400 });
  }

  return csvOuErro("a API da Câmara", async () => {
    const { despesas } = await getDespesasDeputado(Number(id), ano);
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
