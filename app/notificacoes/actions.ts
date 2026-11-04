"use server";

import { refresh } from "next/cache";

import { comoUsuario } from "@/lib/como-usuario";
import { donoDa } from "@/lib/fixados";
import { requireSession } from "@/lib/session";

// Ações da central de notificações. Todas recebem o FormData de um `<form action>` comum: funcionam sem JavaScript.

/** Marca uma notificação (campo `id`) ou todas (sem `id`) como lidas. */
export async function marcarComoLida(formData: FormData) {
  const sessao = await requireSession();
  const id = formData.get("id");
  const usuario = donoDa(sessao);
  await comoUsuario(usuario).notificacao.updateMany({
    where: { usuario, lidaEm: null, ...(typeof id === "string" && id ? { id } : {}) },
    data: { lidaEm: new Date() },
  });
  refresh();
}
