"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { comoUsuario } from "@/lib/como-usuario";
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
  return comoUsuario(usuario).lista.findFirst({ where: { id, usuario }, select: { id: true } });
}

export async function criarLista(formData: FormData) {
  const usuario = await exigirDono();
  const nome = nomeLista.safeParse(formData.get("nome"));
  if (!nome.success) redirect("/listas?aviso=nome-invalido");
  if ((await comoUsuario(usuario).lista.count({ where: { usuario } })) >= LIMITE_LISTAS) redirect("/listas?aviso=limite-listas");
  const lista = await comoUsuario(usuario).lista.create({ data: { usuario, nome: nome.data }, select: { id: true } });
  redirect(`/listas/${lista.id}`);
}

export async function renomearLista(formData: FormData) {
  const usuario = await exigirDono();
  const lista = await minhaLista(usuario, formData.get("lista"));
  const nome = nomeLista.safeParse(formData.get("nome"));
  if (!lista) redirect("/listas");
  if (!nome.success) redirect(`/listas/${lista.id}?aviso=nome-invalido`);
  await comoUsuario(usuario).lista.update({ where: { id: lista.id }, data: { nome: nome.data } });
  redirect(`/listas/${lista.id}?aviso=renomeada`);
}

export async function apagarLista(formData: FormData) {
  const usuario = await exigirDono();
  const lista = await minhaLista(usuario, formData.get("lista"));
  if (lista) await comoUsuario(usuario).lista.delete({ where: { id: lista.id } });
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

  const nova = nomeLista.safeParse(formData.get("novaLista"));
  const criarLista = formData.get("lista") === "nova" || (!formData.get("lista") && nova.success);
  if (criarLista && !nova.success) redirect(comAviso(de, "nome-invalido"));
  const idEscolhido = formData.get("lista");
  const { tipo, chave, rotulo, url, nota } = item.data;

  // Confere, conta e grava numa transação só, uma por vez por pessoa: dois envios juntos não passam do teto. O
  // redirect fica fora: dentro da transação, ele a desfaria.
  const aviso = await comoUsuario(
    usuario,
    async (tx) => {
      let listaId: string;
      if (criarLista && nova.success) {
        if ((await tx.lista.count({ where: { usuario } })) >= LIMITE_LISTAS) return "limite-listas";
        listaId = (await tx.lista.create({ data: { usuario, nome: nova.data }, select: { id: true } })).id;
      } else {
        const lista =
          typeof idEscolhido === "string" ? await tx.lista.findFirst({ where: { id: idEscolhido, usuario }, select: { id: true } }) : null;
        if (!lista) return "lista-invalida";
        listaId = lista.id;
      }
      if ((await tx.itemLista.count({ where: { listaId } })) >= LIMITE_ITENS) return "limite-itens";
      await tx.itemLista.upsert({
        where: { listaId_tipo_chave: { listaId, tipo, chave } },
        create: { listaId, tipo, chave, rotulo, url, nota },
        update: { rotulo, url, ...(nota !== undefined ? { nota } : {}) },
      });
      return "salvo";
    },
    { umaPorVez: true },
  );
  if (aviso === "salvo") revalidatePath("/listas");
  redirect(comAviso(de, aviso));
}

async function meuItem(usuario: string, id: unknown) {
  if (typeof id !== "string") return null;
  return comoUsuario(usuario).itemLista.findFirst({ where: { id, lista: { usuario } }, select: { id: true, listaId: true } });
}

export async function salvarNota(formData: FormData) {
  const usuario = await exigirDono();
  const item = await meuItem(usuario, formData.get("item"));
  if (!item) redirect("/listas");
  const nota = z.string().trim().max(2000).safeParse(formData.get("nota") ?? "");
  if (!nota.success) redirect(`/listas/${item.listaId}?aviso=nota-longa#item-${item.id}`);
  await comoUsuario(usuario).itemLista.update({ where: { id: item.id }, data: { nota: nota.data || null } });
  redirect(`/listas/${item.listaId}?aviso=nota-salva#item-${item.id}`);
}

export async function removerItem(formData: FormData) {
  const usuario = await exigirDono();
  const item = await meuItem(usuario, formData.get("item"));
  if (!item) redirect("/listas");
  await comoUsuario(usuario).itemLista.delete({ where: { id: item.id } });
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
  // Confere, conta e grava numa transação só, uma por vez por pessoa (o redirect fica fora, ver salvarNaLista).
  const aviso = await comoUsuario(
    usuario,
    async (tx) => {
      const chaveUnica = { usuario_cnpj: { usuario, cnpj: numero.data } };
      const ja = await tx.empresaVigiada.findUnique({ where: chaveUnica, select: { id: true } });
      if (!ja && (await tx.empresaVigiada.count({ where: { usuario } })) >= LIMITE_EMPRESAS) return "limite-empresas";
      await tx.empresaVigiada.upsert({
        where: chaveUnica,
        create: { usuario, cnpj: numero.data, rotulo: rotulo.data },
        update: { rotulo: rotulo.data },
      });
      return "empresa-vigiada";
    },
    { umaPorVez: true },
  );
  redirect(comAviso(de, aviso));
}

export async function pararDeVigiar(formData: FormData) {
  const usuario = await exigirDono();
  const de = voltarPara(formData.get("de"), "/meu#empresas");
  const numero = cnpj.safeParse(formData.get("cnpj"));
  if (numero.success) await comoUsuario(usuario).empresaVigiada.deleteMany({ where: { usuario, cnpj: numero.data } });
  redirect(comAviso(de, "empresa-removida"));
}

// --- Preferências em todos os aparelhos ---

/** Chamado pelo navegador quando a pessoa logada muda uma preferência (menu, texto, tema...). */
export async function salvarPreferencias(preferencias: unknown) {
  const usuario = await exigirDono();
  const dados = preferenciasSchema.safeParse(preferencias);
  if (!dados.success) return { ok: false as const };
  await comoUsuario(usuario).perfilUsuario.upsert({
    where: { usuario },
    create: { usuario, preferencias: dados.data },
    update: { preferencias: dados.data },
  });
  return { ok: true as const };
}
