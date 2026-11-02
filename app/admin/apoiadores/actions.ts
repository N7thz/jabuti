"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { exigirAdmin } from "@/lib/admin";
import { TAG_APOIADORES } from "@/lib/apoio/apoiadores";
import { apoiadorSchema } from "@/lib/apoio/schema-apoiador";
import { db } from "@/lib/db";
import { donoDa } from "@/lib/fixados";

export type EstadoApoiador =
  | { status: "inicial" }
  | { status: "ok"; nome: string }
  | { status: "erro"; erros: Record<string, string | undefined>; valores: { nome: string } };

/** Adiciona um nome ao mural. Funciona sem JavaScript (form action) e valida de novo no servidor. */
export async function adicionarApoiador(_anterior: EstadoApoiador, formData: FormData): Promise<EstadoApoiador> {
  const sessao = await exigirAdmin();
  const dados = apoiadorSchema.safeParse({ nome: formData.get("nome"), autorizado: formData.get("autorizado") });
  if (!dados.success) {
    const erros = z.flattenError(dados.error).fieldErrors;
    return {
      status: "erro",
      erros: { nome: erros.nome?.[0], autorizado: erros.autorizado?.[0] },
      valores: { nome: String(formData.get("nome") ?? "") },
    };
  }
  await db.apoiador.create({ data: { nome: dados.data.nome, criadoPor: donoDa(sessao) } });
  updateTag(TAG_APOIADORES);
  return { status: "ok", nome: dados.data.nome };
}

export async function removerApoiador(formData: FormData) {
  await exigirAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  await db.apoiador.deleteMany({ where: { id } });
  updateTag(TAG_APOIADORES);
}
