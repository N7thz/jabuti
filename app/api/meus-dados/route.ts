import { db } from "@/lib/db";
import { getDono } from "@/lib/meu/perfil";

/** GET /api/meus-dados: tudo o que o portal guarda da conta, num JSON para baixar (LGPD, art. 18). */
export async function GET() {
  const usuario = await getDono();
  if (!usuario) return Response.json({ error: "Entre na sua conta para baixar seus dados" }, { status: 401 });

  const [perfil, fixados, seguidos, notificacoes, listas, empresas] = await Promise.all([
    db.perfilUsuario.findUnique({ where: { usuario } }),
    db.fixado.findMany({ where: { usuario }, select: { tipo: true, chave: true, rotulo: true, criadoEm: true } }),
    db.seguido.findMany({ where: { usuario }, select: { tipo: true, chave: true, rotulo: true, criadoEm: true } }),
    db.notificacao.findMany({ where: { usuario }, select: { tipo: true, titulo: true, texto: true, url: true, criadaEm: true, lidaEm: true } }),
    db.lista.findMany({
      where: { usuario },
      select: { nome: true, criadaEm: true, itens: { select: { tipo: true, rotulo: true, url: true, nota: true, criadoEm: true } } },
    }),
    db.empresaVigiada.findMany({ where: { usuario }, select: { cnpj: true, rotulo: true, criadaEm: true } }),
  ]);

  const dados = { conta: usuario, geradoEm: new Date().toISOString(), perfil, fixados, seguidos, notificacoes, listas, empresas };
  return new Response(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-jabuti.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
