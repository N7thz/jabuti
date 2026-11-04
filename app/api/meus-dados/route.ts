import { comoUsuario } from "@/lib/como-usuario";
import { getDono } from "@/lib/meu/perfil";

/** GET /api/meus-dados: tudo o que o portal guarda da conta, num JSON para baixar (LGPD, art. 18). */
export async function GET() {
  const usuario = await getDono();
  if (!usuario) return Response.json({ error: "Entre na sua conta para baixar seus dados" }, { status: 401 });

  // Uma transação só: o retrato sai consistente, e o banco já sabe de quem são os dados (RLS, ver lib/rls.ts).
  const { perfil, fixados, seguidos, notificacoes, listas, empresas } = await comoUsuario(usuario, async (tx) => ({
    perfil: await tx.perfilUsuario.findUnique({ where: { usuario } }),
    fixados: await tx.fixado.findMany({ where: { usuario }, select: { tipo: true, chave: true, rotulo: true, criadoEm: true } }),
    seguidos: await tx.seguido.findMany({ where: { usuario }, select: { tipo: true, chave: true, rotulo: true, criadoEm: true } }),
    notificacoes: await tx.notificacao.findMany({
      where: { usuario },
      select: { tipo: true, titulo: true, texto: true, url: true, criadaEm: true, lidaEm: true },
    }),
    listas: await tx.lista.findMany({
      where: { usuario },
      select: { nome: true, criadaEm: true, itens: { select: { tipo: true, rotulo: true, url: true, nota: true, criadoEm: true } } },
    }),
    empresas: await tx.empresaVigiada.findMany({ where: { usuario }, select: { cnpj: true, rotulo: true, criadaEm: true } }),
  }));

  const dados = { conta: usuario, geradoEm: new Date().toISOString(), perfil, fixados, seguidos, notificacoes, listas, empresas };
  return new Response(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-jabuti.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
