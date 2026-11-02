import type { NextRequest } from "next/server";

import { gerarCsv, nomeArquivo, respostaCsv } from "@/lib/csv";
import { formatarData } from "@/lib/format/datas";
import { getLista, ROTULO_TIPO } from "@/lib/meu/listas";
import { getDono } from "@/lib/meu/perfil";
import { urlDoSite } from "@/lib/site";

/** GET /api/csv/lista/<id>: uma lista de quem está logado, com as anotações (só o dono baixa). */
export async function GET(_request: NextRequest, { params }: RouteContext<"/api/csv/lista/[id]">) {
  const usuario = await getDono();
  if (!usuario) return Response.json({ error: "Entre na sua conta para baixar a lista" }, { status: 401 });
  const lista = await getLista(usuario, (await params).id);
  if (!lista) return Response.json({ error: "Lista não encontrada" }, { status: 404 });

  const csv = gerarCsv(
    ["Tipo", "Item", "Endereço", "Anotação", "Salvo em"],
    lista.itens.map((i) => [
      ROTULO_TIPO[i.tipo],
      i.rotulo,
      i.url.startsWith("/") ? urlDoSite(i.url) : i.url,
      i.nota,
      formatarData(i.criadoEm),
    ]),
  );
  return respostaCsv(nomeArquivo("lista", lista.nome), csv);
}
