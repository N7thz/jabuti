"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

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

const frequencia = z.object({ email: z.enum(["NUNCA", "DIARIO", "SEMANAL"]), voltar: z.enum(["/notificacoes", "/configuracoes"]) });

/** Liga, desliga ou muda a frequência do resumo por email. */
export async function salvarFrequenciaEmail(formData: FormData) {
  const sessao = await requireSession();
  const dados = frequencia.safeParse(Object.fromEntries(formData));
  if (!dados.success) return;

  const usuario = donoDa(sessao);
  await db.preferenciaNotificacao.upsert({
    where: { usuario },
    create: { usuario, email: dados.data.email },
    update: { email: dados.data.email },
  });
  redirect(`${dados.data.voltar}?email=salvo#notificacoes`);
}
