"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { TipoItemLista } from "@/lib/generated/prisma/enums";
import { LIMITE_EMPRESAS } from "@/lib/meu/empresas";
import { LIMITE_ITENS, LIMITE_LISTAS } from "@/lib/meu/listas";
import { exigirDono, salvarMunicipioDo } from "@/lib/meu/perfil";
import { preferenciasSchema } from "@/lib/meu/preferencias";

// Ações da área logada. Todas conferem a sessão e o dono do registro: um id de lista ou de item vindo
// do formulário nunca basta sozinho.

/** Caminho do portal ("/votacoes/...") ou link https: nunca "javascript:" nem outro domínio estranho. */
const destino = z
  .string()
  .trim()
  .max(500)
  .refine((u) => (u.startsWith("/") && !u.startsWith("//")) || /^https:\/\/[^\s]+$/.test(u), "Endereço inválido");

/** Para onde voltar depois da ação: só caminhos internos. */
const voltarPara = (valor: FormDataEntryValue | null, padrao: string) => {
  const texto = typeof valor === "string" ? valor : "";
  return texto.startsWith("/") && !texto.startsWith("//") ? texto : padrao;
};

const comAviso = (caminho: string, aviso: string) => {
  const [base, ancora] = caminho.split("#");
  return `${base}${base.includes("?") ? "&" : "?"}aviso=${aviso}${ancora ? `#${ancora}` : ""}`;
};

// --- Meus representantes ---

export async function salvarMunicipio(formData: FormData) {
  const usuario = await exigirDono();
  const ibge = z.coerce.number().int().min(1_000_000).max(9_999_999).safeParse(formData.get("municipio"));
  if (!ibge.success || !(await db.municipio.findUnique({ where: { ibge: ibge.data }, select: { ibge: true } }))) {
    redirect("/meu?aviso=cidade-invalida#representantes");
  }
  await salvarMunicipioDo(usuario, ibge.data);
  revalidatePath("/meu");
  redirect("/meu?aviso=cidade-salva#representantes");
}

export async function tirarMunicipio() {
  const usuario = await exigirDono();
  await salvarMunicipioDo(usuario, null);
  revalidatePath("/meu");
  redirect("/meu#representantes");
}

// --- Listas ---

const nomeLista = z.string().trim().min(1, "Dê um nome para a lista.").max(80, "Use até 80 caracteres.");

async function minhaLista(usuario: string, id: unknown) {
  if (typeof id !== "string") return null;
  return db.lista.findFirst({ where: { id, usuario }, select: { id: true } });
}

export async function criarLista(formData: FormData) {
  const usuario = await exigirDono();
  const nome = nomeLista.safeParse(formData.get("nome"));
  if (!nome.success) redirect("/listas?aviso=nome-invalido");
  if ((await db.lista.count({ where: { usuario } })) >= LIMITE_LISTAS) redirect("/listas?aviso=limite-listas");
  const lista = await db.lista.create({ data: { usuario, nome: nome.data }, select: { id: true } });
  redirect(`/listas/${lista.id}`);
}

export async function renomearLista(formData: FormData) {
  const usuario = await exigirDono();
  const lista = await minhaLista(usuario, formData.get("lista"));
  const nome = nomeLista.safeParse(formData.get("nome"));
  if (!lista) redirect("/listas");
  if (!nome.success) redirect(`/listas/${lista.id}?aviso=nome-invalido`);
  await db.lista.update({ where: { id: lista.id }, data: { nome: nome.data } });
  redirect(`/listas/${lista.id}?aviso=renomeada`);
}

export async function apagarLista(formData: FormData) {
  const usuario = await exigirDono();
  const lista = await minhaLista(usuario, formData.get("lista"));
  if (lista) await db.lista.delete({ where: { id: lista.id } });
  redirect("/listas?aviso=lista-apagada");
}

const itemSchema = z.object({
  tipo: z.enum(TipoItemLista),
  chave: z.string().trim().min(1).max(120),
  rotulo: z.string().trim().min(1).max(200),
  url: destino,
  nota: z.string().trim().max(2000).optional(),
});

/** Salva um item numa lista existente ou numa nova (campo `novaLista`). Volta para a página de origem. */
export async function salvarNaLista(formData: FormData) {
  const usuario = await exigirDono();
  const de = voltarPara(formData.get("de"), "/listas");
  const item = itemSchema.safeParse({
    tipo: formData.get("tipo"),
    chave: formData.get("chave"),
    rotulo: formData.get("rotulo"),
    url: formData.get("url"),
    nota: formData.get("nota") || undefined,
  });
  if (!item.success) redirect(comAviso(de, "item-invalido"));

  let listaId: string;
  const nova = nomeLista.safeParse(formData.get("novaLista"));
  if (formData.get("lista") === "nova" || (!formData.get("lista") && nova.success)) {
    if (!nova.success) redirect(comAviso(de, "nome-invalido"));
    if ((await db.lista.count({ where: { usuario } })) >= LIMITE_LISTAS) redirect(comAviso(de, "limite-listas"));
    listaId = (await db.lista.create({ data: { usuario, nome: nova.data }, select: { id: true } })).id;
  } else {
    const lista = await minhaLista(usuario, formData.get("lista"));
    if (!lista) redirect(comAviso(de, "lista-invalida"));
    listaId = lista.id;
  }

  if ((await db.itemLista.count({ where: { listaId } })) >= LIMITE_ITENS) redirect(comAviso(de, "limite-itens"));
  const { tipo, chave, rotulo, url, nota } = item.data;
  await db.itemLista.upsert({
    where: { listaId_tipo_chave: { listaId, tipo, chave } },
    create: { listaId, tipo, chave, rotulo, url, nota },
    update: { rotulo, url, ...(nota !== undefined ? { nota } : {}) },
  });
  revalidatePath("/listas");
  redirect(comAviso(de, "salvo"));
}

async function meuItem(usuario: string, id: unknown) {
  if (typeof id !== "string") return null;
  return db.itemLista.findFirst({ where: { id, lista: { usuario } }, select: { id: true, listaId: true } });
}

export async function salvarNota(formData: FormData) {
  const usuario = await exigirDono();
  const item = await meuItem(usuario, formData.get("item"));
  if (!item) redirect("/listas");
  const nota = z.string().trim().max(2000).safeParse(formData.get("nota") ?? "");
  if (!nota.success) redirect(`/listas/${item.listaId}?aviso=nota-longa#item-${item.id}`);
  await db.itemLista.update({ where: { id: item.id }, data: { nota: nota.data || null } });
  redirect(`/listas/${item.listaId}?aviso=nota-salva#item-${item.id}`);
}

export async function removerItem(formData: FormData) {
  const usuario = await exigirDono();
  const item = await meuItem(usuario, formData.get("item"));
  if (!item) redirect("/listas");
  await db.itemLista.delete({ where: { id: item.id } });
  redirect(`/listas/${item.listaId}?aviso=item-removido`);
}

// --- Empresas vigiadas ---

const cnpj = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 14, "CNPJ inválido");

export async function vigiarEmpresa(formData: FormData) {
  const usuario = await exigirDono();
  const de = voltarPara(formData.get("de"), "/meu#empresas");
  const numero = cnpj.safeParse(formData.get("cnpj"));
  const rotulo = z.string().trim().min(1).max(200).safeParse(formData.get("rotulo"));
  if (!numero.success || !rotulo.success) redirect(comAviso(de, "empresa-invalida"));
  const ja = await db.empresaVigiada.findUnique({ where: { usuario_cnpj: { usuario, cnpj: numero.data } } });
  if (!ja && (await db.empresaVigiada.count({ where: { usuario } })) >= LIMITE_EMPRESAS) {
    redirect(comAviso(de, "limite-empresas"));
  }
  await db.empresaVigiada.upsert({
    where: { usuario_cnpj: { usuario, cnpj: numero.data } },
    create: { usuario, cnpj: numero.data, rotulo: rotulo.data },
    update: { rotulo: rotulo.data },
  });
  redirect(comAviso(de, "empresa-vigiada"));
}

export async function pararDeVigiar(formData: FormData) {
  const usuario = await exigirDono();
  const de = voltarPara(formData.get("de"), "/meu#empresas");
  const numero = cnpj.safeParse(formData.get("cnpj"));
  if (numero.success) await db.empresaVigiada.deleteMany({ where: { usuario, cnpj: numero.data } });
  redirect(comAviso(de, "empresa-removida"));
}

// --- Preferências em todos os aparelhos ---

/** Chamado pelo navegador quando a pessoa logada muda uma preferência (menu, texto, tema...). */
export async function salvarPreferencias(preferencias: unknown) {
  const usuario = await exigirDono();
  const dados = preferenciasSchema.safeParse(preferencias);
  if (!dados.success) return { ok: false as const };
  await db.perfilUsuario.upsert({
    where: { usuario },
    create: { usuario, preferencias: dados.data },
    update: { preferencias: dados.data },
  });
  return { ok: true as const };
}
