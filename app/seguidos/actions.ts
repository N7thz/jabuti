"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { donoDa } from "@/lib/fixados";
import { LIMITE_SEGUIDOS } from "@/lib/seguidos";
import { requireSession } from "@/lib/session";

const entrada = z.object({
  tipo: z.enum(["PARLAMENTAR", "LEI"]),
  chave: z.string().regex(/^(camara|senado)-\d+$/),
  rotulo: z.string().trim().min(1).max(160),
});

/**
 * Segue ou deixa de seguir um parlamentar ou projeto. Recebe o FormData de um `<form action>` comum,
 * então funciona sem JavaScript.
 */
export async function alternarSeguido(formData: FormData) {
  const sessao = await requireSession();
  const dados = entrada.safeParse(Object.fromEntries(formData));
  if (!dados.success) return;

  const usuario = donoDa(sessao);
  const { tipo, chave, rotulo } = dados.data;
  const existente = await db.seguido.findUnique({
    where: { usuario_tipo_chave: { usuario, tipo, chave } },
    select: { id: true },
  });

  if (existente) await db.seguido.delete({ where: { id: existente.id } });
  else {
    // No limite, recusa em silêncio: o botão já aparece desabilitado com o aviso (components/seguir.tsx).
    if ((await db.seguido.count({ where: { usuario } })) >= LIMITE_SEGUIDOS) return;
    await db.seguido.create({ data: { usuario, tipo, chave, rotulo } });
  }

  refresh();
}
