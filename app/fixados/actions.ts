"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { comoUsuario } from "@/lib/como-usuario";
import { donoDa, LIMITE_FIXADOS } from "@/lib/fixados";
import { requireSession } from "@/lib/session";
import { UFS } from "@/lib/ufs";

const entrada = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("PARLAMENTAR"), chave: z.string().regex(/^(camara|senado)-\d+$/), rotulo: z.string().trim().min(1).max(120) }),
  z.object({ tipo: z.literal("PARTIDO"), chave: z.string().trim().regex(/^[\p{L}\d ]{1,20}$/u), rotulo: z.string().trim().min(1).max(120) }),
  z.object({ tipo: z.literal("BANCADA"), chave: z.enum(Object.keys(UFS) as [string, ...string[]]), rotulo: z.string().trim().min(1).max(120) }),
]);

/**
 * Fixa ou desafixa um atalho. Recebe o FormData de um `<form action>` comum, então funciona
 * sem JavaScript (o navegador envia o formulário e a página volta atualizada).
 */
export async function alternarFixado(formData: FormData) {
  const sessao = await requireSession();
  const dados = entrada.safeParse(Object.fromEntries(formData));
  if (!dados.success) return;

  const { tipo, chave, rotulo } = dados.data;
  const usuario = donoDa(sessao);
  // Confere, conta e grava numa transação só, uma por vez por pessoa: dois cliques juntos não passam do teto.
  await comoUsuario(
    usuario,
    async (tx) => {
      const existente = await tx.fixado.findUnique({ where: { usuario_tipo_chave: { usuario, tipo, chave } }, select: { id: true } });
      if (existente) {
        await tx.fixado.delete({ where: { id: existente.id } });
        return;
      }
      // No limite, recusa em silêncio: o botão já aparece desabilitado com o aviso (components/fixar.tsx).
      if ((await tx.fixado.count({ where: { usuario } })) >= LIMITE_FIXADOS) return;
      await tx.fixado.create({ data: { usuario, tipo, chave, rotulo } });
    },
    { umaPorVez: true },
  );

  refresh();
}
