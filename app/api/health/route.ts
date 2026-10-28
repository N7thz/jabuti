import { connection } from "next/server";

import { db } from "@/lib/db";

/** Verifica se o app alcança o banco (Neon). Sempre em tempo de requisição, nunca pré-renderizado. */
export async function GET() {
  await connection();

  try {
    const [row] = await db.$queryRaw<{ now: Date }[]>`select now() as now`;
    return Response.json({ ok: true, database: "up", now: row.now });
  } catch {
    return Response.json({ ok: false, database: "down" }, { status: 503 });
  }
}
