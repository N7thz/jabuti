import type { NextRequest } from "next/server";

import { filtrosRankingCota } from "@/app/rankings/cota/filtros";
import { gerarCsv, nomeArquivo, reaisCsv, respostaCsv } from "@/lib/csv";
import { lerFiltros } from "@/lib/filtros/schemas";
import { getOpcoesCota, getRankingCota } from "@/lib/rankings/queries";

/** GET /api/csv/ranking-cota?ano=2025&casa=senado&categoria=...: todos os parlamentares, não só os 50 da página. */
export async function GET(request: NextRequest) {
  const { valores } = lerFiltros(filtrosRankingCota, Object.fromEntries(request.nextUrl.searchParams));
  const opcoes = await getOpcoesCota();
  if (!valores || opcoes.anos.length === 0) return Response.json({ error: "Filtro inválido" }, { status: 400 });

  const ano = valores.ano ?? opcoes.anos[0];
  const categoria = valores.categoria && opcoes.categorias.includes(valores.categoria) ? valores.categoria : undefined;
  const casa = valores.casa === "camara" ? "CAMARA" : valores.casa === "senado" ? "SENADO" : undefined;
  const ranking = await getRankingCota({ ano, casa, categoria }, 1000);

  const csv = gerarCsv(
    ["Posição", "Parlamentar", "Casa", "Partido", "UF", "Reembolsos", "Total (R$)"],
    ranking.linhas.map((l) => [
      l.posicao,
      l.nome,
      l.casa === "CAMARA" ? "Câmara" : "Senado",
      l.partido,
      l.uf,
      l.lancamentos,
      reaisCsv(l.total),
    ]),
  );
  return respostaCsv(nomeArquivo("ranking-cota", ano, valores.casa ?? "congresso", categoria ?? "todos"), csv);
}
