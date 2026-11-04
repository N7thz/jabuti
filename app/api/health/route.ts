import { connection } from "next/server";

import { db } from "@/lib/db";
import { PAPEL_APP } from "@/lib/prisma";

/**
 * Verifica se o app alcança o banco (Neon). Sempre em tempo de requisição, nunca pré-renderizado.
 * `papel` é o usuário do Postgres com que o site entrou: tem de ser o `portal_app` (ver scripts/papel-app.ts). Se for o
 * dono do banco, a segurança por linha (RLS) não vale para o site.
 */
export async function GET() {
  await connection();

  try {
    const [row] = await db.$queryRaw<{ now: Date; papel: string }[]>`select now() as now, current_user::text as papel`;
    if (process.env.VERCEL_ENV === "production" && row.papel !== PAPEL_APP) {
      console.warn(`[health] o site entrou no banco como "${row.papel}", não como ${PAPEL_APP}: confira a DATABASE_URL da Vercel.`);
    }
    return Response.json({ ok: true, database: "up", papel: row.papel, now: row.now });
  } catch {
    return Response.json({ ok: false, database: "down" }, { status: 503 });
  }
}
