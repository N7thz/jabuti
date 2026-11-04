import { revalidateTag } from "next/cache";

import { etiquetasDasFontes, pedidoRevalidar, segredoConfere } from "@/lib/sync/revalidar";

/**
 * Chamada pelo fim de cada job de .github/workflows/sync.yml: marca como velho o cache das páginas que leem as
 * tabelas que a carga acabou de gravar, para os números novos aparecerem sem esperar o cacheLife vencer.
 * Com o perfil "max", a próxima visita ainda recebe a versão guardada enquanto a nova é montada em segundo plano.
 *
 * Corpo: `{ "fontes": ["camara", "senado", ...] }`, com `Authorization: Bearer <REVALIDAR_SEGREDO>`.
 */
export async function POST(request: Request) {
  const segredo = process.env.REVALIDAR_SEGREDO;
  if (!segredo) {
    return Response.json({ ok: false, erro: "REVALIDAR_SEGREDO não configurado" }, { status: 503 });
  }
  if (!segredoConfere(request.headers.get("authorization"), segredo)) {
    return Response.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo não é JSON" }, { status: 400 });
  }
  const pedido = pedidoRevalidar.safeParse(corpo);
  if (!pedido.success) {
    return Response.json({ ok: false, erro: "fontes inválidas", detalhes: pedido.error.issues }, { status: 400 });
  }

  const etiquetas = etiquetasDasFontes(pedido.data.fontes);
  for (const etiqueta of etiquetas) revalidateTag(etiqueta, "max");
  return Response.json({ ok: true, fontes: pedido.data.fontes, etiquetas });
}
