"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
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
  const chaveUnica = { usuario_tipo_chave: { usuario: donoDa(sessao), tipo, chave } };
  const existente = await db.fixado.findUnique({ where: chaveUnica, select: { id: true } });

  if (existente) await db.fixado.delete({ where: { id: existente.id } });
  else {
    // No limite, recusa em silêncio: o botão já aparece desabilitado com o aviso (components/fixar.tsx).
    const total = await db.fixado.count({ where: { usuario: donoDa(sessao) } });
    if (total >= LIMITE_FIXADOS) return;
    await db.fixado.create({ data: { usuario: donoDa(sessao), tipo, chave, rotulo } });
  }

  refresh();
}
