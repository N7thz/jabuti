"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { comoUsuario } from "@/lib/como-usuario";
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
  // Confere, conta e grava numa transação só, uma por vez por pessoa: dois cliques juntos não passam do teto.
  await comoUsuario(
    usuario,
    async (tx) => {
      const existente = await tx.seguido.findUnique({
        where: { usuario_tipo_chave: { usuario, tipo, chave } },
        select: { id: true },
      });
      if (existente) {
        await tx.seguido.delete({ where: { id: existente.id } });
        return;
      }
      // No limite, recusa em silêncio: o botão já aparece desabilitado com o aviso (components/seguir.tsx).
      if ((await tx.seguido.count({ where: { usuario } })) >= LIMITE_SEGUIDOS) return;
      await tx.seguido.create({ data: { usuario, tipo, chave, rotulo } });
    },
    { umaPorVez: true },
  );

  refresh();
}
