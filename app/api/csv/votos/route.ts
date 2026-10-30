import type { NextRequest } from "next/server";

import { csvOuErro, gerarCsv, nomeArquivo, respostaCsv } from "@/lib/csv";
import { getVotosSenador } from "@/lib/parlamentares/queries";
import { getVotosDeputado } from "@/lib/votacoes/queries";
import { ROTULO_VOTO } from "@/lib/votacoes/rotulos";

/** GET /api/csv/votos?casa=camara&id=204379: votos nominais de um parlamentar. */
export async function GET(request: NextRequest) {
  const casa = request.nextUrl.searchParams.get("casa");
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if ((casa !== "camara" && casa !== "senado") || !/^\d{1,10}$/.test(id)) {
    return Response.json({ error: "Informe casa=camara|senado e o id do parlamentar" }, { status: 400 });
  }

  return csvOuErro("a fonte dos votos (Câmara ou Senado)", async () => {
    const votos = casa === "camara" ? await getVotosDeputado(id, 5000) : (await getVotosSenador(id)).votos;
    const csv = gerarCsv(
      ["Data", "Proposição", "Ementa", "O que foi votado", "Resultado", "Voto", "Voto como a fonte publica"],
      votos.map((v) => [
        v.data,
        v.proposicao?.rotulo,
        v.proposicao?.ementa,
        v.descricao,
        v.resultado,
        ROTULO_VOTO[v.tipo],
        v.votoOriginal,
      ]),
    );
    return respostaCsv(nomeArquivo("votos", casa, id), csv);
  });
}
