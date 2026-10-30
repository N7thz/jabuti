import type { NextRequest } from "next/server";

import { BASE_URL } from "@/lib/transparencia/client";

const SEGMENT = /^[\w-]+$/;

// Só os endpoints que algum Client Component usa de fato (ex.: "orgaos-siafi"). Um proxy aberto
// deixaria qualquer um gastar o limite de 90 req/min da nossa chave com consultas arbitrárias.
// Hoje nenhum Client Component consulta a API: adicione o caminho aqui ao criar o primeiro.
const PERMITIDOS = new Set<string>([]);

/**
 * Proxy somente-leitura para a API de dados, para uso em Client Components
 * sem expor a chave: GET /api/transparencia/orgaos-siafi?pagina=1
 * → GET https://api.portaldatransparencia.gov.br/api-de-dados/orgaos-siafi?pagina=1
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/transparencia/[...path]">,
) {
  const { path } = await ctx.params;

  if (!path.every((segment) => SEGMENT.test(segment))) {
    return Response.json({ error: "Caminho inválido" }, { status: 400 });
  }
  if (!PERMITIDOS.has(path.join("/"))) {
    return Response.json({ error: "Endpoint não disponível por este proxy" }, { status: 404 });
  }

  const url = new URL(`/api-de-dados/${path.join("/")}`, BASE_URL);
  url.search = request.nextUrl.search;

  // Cache do fetch no servidor (só guarda respostas 200), além do Cache-Control para a CDN:
  // poupa o limite de 90 req/min da API. A tag é a mesma de `lib/transparencia/queries.ts`.
  const upstream = await fetch(url, {
    headers: {
      "chave-api-dados": process.env.PORTAL_TRANSPARENCIA_API_KEY!,
      Accept: "application/json",
    },
    cache: "force-cache",
    next: { revalidate: 3600, tags: ["transparencia"] },
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);

  if (!upstream) {
    return Response.json({ error: "Portal da Transparência não respondeu" }, { status: 504 });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": upstream.ok
        ? "public, s-maxage=3600, stale-while-revalidate=86400"
        : "no-store",
    },
  });
}
