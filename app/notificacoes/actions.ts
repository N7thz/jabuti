"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { donoDa } from "@/lib/fixados";
import { requireSession } from "@/lib/session";

// Ações da central de notificações. Todas recebem o FormData de um `<form action>` comum: funcionam sem JavaScript.

/** Marca uma notificação (campo `id`) ou todas (sem `id`) como lidas. */
export async function marcarComoLida(formData: FormData) {
  const sessao = await requireSession();
  const id = formData.get("id");
  await db.notificacao.updateMany({
    where: { usuario: donoDa(sessao), lidaEm: null, ...(typeof id === "string" && id ? { id } : {}) },
    data: { lidaEm: new Date() },
  });
  refresh();
}
