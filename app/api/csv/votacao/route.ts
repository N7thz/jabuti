import type { NextRequest } from "next/server";

import { csvOuErro, gerarCsv, nomeArquivo, respostaCsv } from "@/lib/csv";
import { getVotacaoCamara, getVotacaoSenado } from "@/lib/votacoes/queries";
import { ROTULO_VOTO } from "@/lib/votacoes/rotulos";

/** GET /api/csv/votacao?casa=camara&id=2455564-65: voto de cada parlamentar numa votação. */
export async function GET(request: NextRequest) {
  const casa = request.nextUrl.searchParams.get("casa");
  const id = request.nextUrl.searchParams.get("id") ?? "";

  return csvOuErro("a fonte da votação (Câmara ou banco do portal)", async () => {
    const votacao =
      casa === "camara" && /^[\d-]{3,30}$/.test(id)
        ? await getVotacaoCamara(id)
        : casa === "senado" && /^\d{1,10}$/.test(id)
          ? await getVotacaoSenado(id)
          : null;
    if (!votacao) return Response.json({ error: "Votação não encontrada" }, { status: 404 });

    const csv = gerarCsv(
      ["Parlamentar", "Partido", "UF", "Voto", "Voto como a fonte publica"],
      votacao.votos.map((v) => [v.nome, v.partido, v.uf, ROTULO_VOTO[v.tipo], v.votoOriginal]),
    );
    return respostaCsv(nomeArquivo("votacao", casa!, votacao.proposicao?.rotulo ?? id, votacao.data), csv);
  });
}
