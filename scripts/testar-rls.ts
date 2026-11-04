/**
 * Teste de integração do RLS (segurança por linha) com o papel do site, `portal_app`. Só roda no branch dev do Neon.
 *
 * Cria duas pessoas de teste (A e B) com fixados e listas, entrando como dono, e confere entrando como `portal_app`:
 *   - sem avisar quem é a pessoa, as tabelas de dados pessoais voltam vazias;
 *   - avisando A (comoUsuarioNo, o mesmo código do site), A vê só o que é dela e não grava em nome de B;
 *   - os dados públicos continuam legíveis;
 *   - o papel não apaga, não altera e não cria tabelas.
 * No fim apaga os dados de teste. Sai com código 1 se algum caso falhar.
 *
 * Uso: bun scripts/testar-rls.ts   (DATABASE_URL = portal_app; DIRECT_URL = dono; os dois no dev)
 */
import { randomBytes } from "node:crypto";

import { Pool } from "@neondatabase/serverless";

import { createPrisma, PAPEL_APP } from "../lib/prisma";
import { comoUsuarioNo } from "../lib/rls";
import { exigirDev, hostDe, urlDiretaDoDono, usuarioDe } from "./banco";

const direta = urlDiretaDoDono();
const doApp = process.env.DATABASE_URL ?? "";
exigirDev(direta, "DIRECT_URL");
exigirDev(doApp, "DATABASE_URL");
if (usuarioDe(doApp) !== PAPEL_APP) {
  console.error(`DATABASE_URL precisa ser a do ${PAPEL_APP} (rode scripts/papel-app.ts antes).`);
  process.exit(1);
}

const sufixo = randomBytes(4).toString("hex");
const A = `rls-teste-a-${sufixo}@exemplo.invalid`;
const B = `rls-teste-b-${sufixo}@exemplo.invalid`;

const dono = new Pool({ connectionString: direta });
const app = createPrisma();
const falhas: string[] = [];
let casos = 0;

function confere(nome: string, ok: boolean, detalhe = "") {
  casos++;
  console.log(`${ok ? "ok   " : "FALHA"} ${nome}${detalhe ? ` (${detalhe})` : ""}`);
  if (!ok) falhas.push(nome);
}

/** Espera que a operação seja recusada pelo banco. */
async function recusa(nome: string, operacao: () => Promise<unknown>) {
  try {
    await operacao();
    confere(nome, false, "o banco aceitou");
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    confere(nome, true, msg.match(/row-level security|permission denied|must be owner|denied|violates/i)?.[0] ?? "recusado");
  }
}

async function criarDados() {
  const id = () => `rlsteste${randomBytes(8).toString("hex")}`;
  for (const [usuario, chaves] of [
    [A, ["PL", "PT"]],
    [B, ["NOVO"]],
  ] as const) {
    for (const chave of chaves) {
      await dono.query(
        `INSERT INTO "Fixado" (id, usuario, tipo, chave, rotulo) VALUES ($1, $2, 'PARTIDO', $3, $3)`,
        [id(), usuario, chave],
      );
    }
    const lista = id();
    await dono.query(`INSERT INTO "Lista" (id, usuario, nome) VALUES ($1, $2, 'Teste RLS')`, [lista, usuario]);
    await dono.query(
      `INSERT INTO "ItemLista" (id, "listaId", tipo, chave, rotulo, url) VALUES ($1, $2, 'PAGINA', 'inicio', 'Início', '/')`,
      [id(), lista],
    );
  }
}

async function apagarDados() {
  for (const tabela of ["Fixado", "Seguido", "Notificacao", "PerfilUsuario", "Lista", "EmpresaVigiada"]) {
    await dono.query(`DELETE FROM "${tabela}" WHERE usuario = ANY($1)`, [[A, B]]);
  }
}

async function main() {
  console.log(`Dono: ${hostDe(direta)} · site (${PAPEL_APP}): ${hostDe(doApp)}\n`);
  await criarDados();
  const deTeste = { usuario: { in: [A, B] } };

  // 1. Sem contexto: nada de dado pessoal.
  confere("sem contexto, Fixado volta vazio", (await app.fixado.count({ where: deTeste })) === 0);
  confere("sem contexto, Lista volta vazia", (await app.lista.count({ where: deTeste })) === 0);
  confere("sem contexto, ItemLista volta vazio", (await app.itemLista.count({ where: { lista: deTeste } })) === 0);
  confere("sem contexto, nada em toda a tabela Fixado", (await app.fixado.count()) === 0);

  // 2. Com o contexto de A.
  const daA = comoUsuarioNo(app, A);
  const fixadosA = await daA.fixado.findMany({ where: deTeste });
  confere("A vê os 2 fixados dela e nenhum de B", fixadosA.length === 2 && fixadosA.every((f) => f.usuario === A));
  const listasA = await daA.lista.findMany({ where: deTeste, include: { itens: true } });
  confere("A vê só a lista dela, com o item", listasA.length === 1 && listasA[0].usuario === A && listasA[0].itens.length === 1);
  confere("A vê só o item da lista dela", (await daA.itemLista.count({ where: { lista: deTeste } })) === 1);

  await recusa("A não insere Fixado com usuario de B", () =>
    daA.fixado.create({ data: { usuario: B, tipo: "PARTIDO", chave: "X", rotulo: "X" } }),
  );
  const alteradas = await daA.fixado.updateMany({ where: { usuario: B }, data: { rotulo: "invadido" } });
  confere("A não altera Fixado de B (0 linhas)", alteradas.count === 0);
  const apagadas = await daA.fixado.deleteMany({ where: { usuario: B } });
  confere("A não apaga Fixado de B (0 linhas)", apagadas.count === 0);
  await recusa("A não passa um Fixado dela para B", () =>
    daA.fixado.update({ where: { id: fixadosA[0].id }, data: { usuario: B } }),
  );
  const listaB = (await dono.query<{ id: string }>(`SELECT id FROM "Lista" WHERE usuario = $1`, [B])).rows[0].id;
  await recusa("A não insere item na lista de B", () =>
    daA.itemLista.create({ data: { listaId: listaB, tipo: "PAGINA", chave: "x", rotulo: "x", url: "/" } }),
  );
  const intactos = await dono.query<{ n: string }>(`SELECT count(*) n FROM "Fixado" WHERE usuario = $1 AND rotulo <> 'invadido'`, [B]);
  confere("os dados de B continuam intactos", intactos.rows[0].n === "1");

  // Operações do site: upsert (INSERT ... ON CONFLICT) e transação com várias operações.
  await daA.perfilUsuario.upsert({ where: { usuario: A }, create: { usuario: A, municipioIbge: 3550308 }, update: {} });
  await daA.perfilUsuario.upsert({ where: { usuario: A }, create: { usuario: A }, update: { municipioIbge: 3304557 } });
  confere("A grava e atualiza o próprio perfil (upsert)", (await daA.perfilUsuario.findUnique({ where: { usuario: A } }))?.municipioIbge === 3304557);
  const nova = await comoUsuarioNo(app, A, async (tx) => {
    const lista = await tx.lista.create({ data: { usuario: A, nome: "Na transação" } });
    await tx.itemLista.create({ data: { listaId: lista.id, tipo: "PAGINA", chave: "y", rotulo: "y", url: "/" } });
    return tx.lista.findUnique({ where: { id: lista.id }, include: { _count: { select: { itens: true } } } });
  });
  confere("A cria lista e item numa transação só", nova?._count.itens === 1);
  confere("B não vê nada de A", (await comoUsuarioNo(app, B).lista.count({ where: { usuario: A } })) === 0);
  // Teto por pessoa: 5 "conta e cria se couber" ao mesmo tempo, com teto de 1 a mais, criam só 1 (umaPorVez).
  const teto = (await daA.fixado.count({ where: { usuario: A } })) + 1;
  await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      comoUsuarioNo(
        app,
        A,
        async (tx) => {
          if ((await tx.fixado.count({ where: { usuario: A } })) >= teto) return;
          await tx.fixado.create({ data: { usuario: A, tipo: "PARTIDO", chave: `TETO${i}`, rotulo: "teto" } });
        },
        { umaPorVez: true },
      ),
    ),
  );
  confere("cinco gravações juntas respeitam o teto (uma por vez)", (await daA.fixado.count({ where: { usuario: A } })) === teto);

  // O aviso vale só dentro da transação: a conexão reaproveitada pelo pooler não leva a pessoa A para a próxima.
  const semContexto = await Promise.all(Array.from({ length: 5 }, () => app.lista.count({ where: deTeste })));
  confere("depois das operações de A, sem contexto continua vazio", semContexto.every((n) => n === 0));

  // 3. Dados públicos e login.
  confere("lê Parlamentar", (await app.parlamentar.count()) > 0);
  confere("lê Municipio", (await app.municipio.count()) > 0);
  confere("lê Votacao", (await app.votacao.findFirst({ select: { id: true } })) !== null);
  await app.user.count();
  confere("lê a tabela de login (user) sem contexto", true);
  await recusa("não grava em dado público (Parlamentar)", () => app.$executeRawUnsafe(`UPDATE "Parlamentar" SET nome = nome WHERE false`));
  await recusa("não lê o histórico de migrações", () => app.$queryRawUnsafe(`SELECT 1 FROM "_prisma_migrations" LIMIT 1`));

  // 4. Estrutura: cada comando numa transação desfeita no fim, por garantia.
  const pool = new Pool({ connectionString: doApp });
  for (const [nome, sql] of [
    ["não apaga tabela (DROP)", `DROP TABLE "Fixado"`],
    ["não altera tabela (ALTER)", `ALTER TABLE "Parlamentar" ADD COLUMN rls_teste int`],
    ["não cria tabela (CREATE)", `CREATE TABLE public.rls_teste (x int)`],
    ["não desliga o RLS", `ALTER TABLE "Fixado" DISABLE ROW LEVEL SECURITY`],
    ["não troca de papel para o dono", `SET ROLE neondb_owner`],
  ] as const) {
    const conexao = await pool.connect();
    try {
      await conexao.query("BEGIN");
      await recusa(nome, () => conexao.query(sql));
    } finally {
      await conexao.query("ROLLBACK").catch(() => {});
      conexao.release();
    }
  }
  await pool.end();
}

main()
  .catch((erro) => {
    falhas.push(`erro inesperado: ${erro instanceof Error ? erro.message : erro}`);
    console.error("Erro inesperado:", erro instanceof Error ? erro.message : erro);
  })
  .finally(async () => {
    await apagarDados().catch((e) => console.error("Falhou ao apagar os dados de teste:", e instanceof Error ? e.message : e));
    const sobra = await dono.query<{ n: string }>(
      `SELECT (SELECT count(*) FROM "Fixado" WHERE usuario = ANY($1)) + (SELECT count(*) FROM "Lista" WHERE usuario = ANY($1)) +
              (SELECT count(*) FROM "PerfilUsuario" WHERE usuario = ANY($1)) AS n`,
      [[A, B]],
    );
    console.log(`\nDados de teste apagados (sobraram ${sobra.rows[0].n} linhas).`);
    await dono.end();
    await app.$disconnect();
    console.log(`${casos - falhas.length}/${casos} casos ok.`);
    if (falhas.length) {
      console.error(`Falharam:\n- ${falhas.join("\n- ")}`);
      process.exit(1);
    }
  });
