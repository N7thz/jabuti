/**
 * Cria (ou atualiza) o papel `portal_app`, o usuário do Postgres com que o site entra no banco.
 *
 * Papel ("role") é um usuário do banco. O `portal_app` não é dono de nada: só lê os dados públicos, só grava onde o
 * site grava e, nas tabelas de dados pessoais, só vê as linhas da pessoa avisada (RLS, ver lib/rls.ts e a migração
 * 20261104030000_papel_app_rls). O dono do banco continua com as migrações e as cargas.
 *
 * Uso (rode depois de aplicar as migrações):
 *   bun scripts/papel-app.ts                   primeira vez: liga o login, gera a senha e grava a conexão no .env.local
 *   bun scripts/papel-app.ts --nova-senha      troca a senha (o papel já tinha login)
 *   bun scripts/papel-app.ts --saida <arquivo> grava só a conexão nesse arquivo, sem mexer no .env.local (produção)
 *   --confirmo-producao                        aceita rodar fora do branch dev do Neon
 *
 * No .env.local: `DATABASE_URL` passa a ser a do `portal_app` (com pooling) e a antiga, do dono, vai para
 * `DATABASE_URL_DONO` (usada pelos scripts de carga locais). Nada de senha ou conexão aparece no terminal.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "@neondatabase/serverless";

import { PAPEL_APP } from "../lib/prisma";
import { exigirDev, hostDe, urlDiretaDoDono, usuarioDe } from "./banco";

const args = process.argv.slice(2);
const novaSenha = args.includes("--nova-senha");
const permitirProducao = args.includes("--confirmo-producao");
const iSaida = args.indexOf("--saida");
const saida = iSaida >= 0 ? args[iSaida + 1] : null;
if (iSaida >= 0 && !saida) {
  console.error("--saida precisa do caminho do arquivo.");
  process.exit(1);
}
if (saida && !saidaSegura(saida)) {
  console.error(
    `--saida ${saida} fica dentro do repositório e poderia ir para um commit. Use um caminho fora dele, como ` +
      `${join(homedir(), "portal_app-producao.url")}, ou um nome começado por ".env" (o .gitignore cobre).`,
  );
  process.exit(1);
}

/** Fora do repositório, ou um arquivo ".env*" que o .gitignore cobre (menos o .env.example, que é versionado). */
function saidaSegura(caminho: string) {
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const rel = relative(raiz, resolve(caminho));
  const dentro = rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
  const nome = basename(caminho);
  return !dentro || (nome.startsWith(".env") && nome !== ".env.example");
}

const ARQUIVO_ENV = ".env.local";

/** Senha aleatória de 32 bytes (256 bits) em base64url: só letras, números, "-" e "_". */
const gerarSenha = () => randomBytes(32).toString("base64url");

/** Conexão do papel: host com "-pooler", mesmo banco e mesmos parâmetros (sslmode, channel_binding) da base. */
function urlDoPapel(base: string, senha: string) {
  const url = new URL(base);
  const [endpoint, ...resto] = url.hostname.split(".");
  if (!endpoint.endsWith("-pooler")) url.hostname = [`${endpoint}-pooler`, ...resto].join(".");
  url.username = PAPEL_APP;
  url.password = senha;
  return url.toString();
}

/** Troca (ou acrescenta) `CHAVE="valor"` no .env.local, mantendo o resto do arquivo. */
function gravarNoEnv(texto: string, chave: string, valor: string, comentario?: string) {
  const fimDeLinha = texto.includes("\r\n") ? "\r\n" : "\n";
  const linhas = texto.split(/\r?\n/);
  const nova = `${chave}="${valor}"`;
  const i = linhas.findIndex((l) => l.startsWith(`${chave}=`));
  if (i >= 0) linhas[i] = nova;
  else {
    const depois = linhas.findIndex((l) => l.startsWith("DATABASE_URL="));
    linhas.splice(depois >= 0 ? depois + 1 : linhas.length, 0, ...(comentario ? [`# ${comentario}`] : []), nova);
  }
  return linhas.join(fimDeLinha);
}

async function main() {
  const direta = urlDiretaDoDono();
  exigirDev(direta, "DIRECT_URL", permitirProducao);
  if (usuarioDe(direta) === PAPEL_APP) throw new Error("DIRECT_URL precisa ser do dono do banco, não do portal_app.");

  // Base da conexão nova: a do dono com pooling. Na segunda rodada, a DATABASE_URL já é do portal_app.
  const atual = process.env.DATABASE_URL;
  // `||`, não `??`: variável vazia no .env cai para a próxima.
  const doDono = process.env.DATABASE_URL_DONO || (atual && usuarioDe(atual) !== PAPEL_APP ? atual : undefined);
  if (!doDono) throw new Error("Não achei a conexão do dono com pooling (DATABASE_URL ou DATABASE_URL_DONO).");
  exigirDev(doDono, "DATABASE_URL do dono", permitirProducao);
  if (hostDe(doDono).split(".")[0].replace(/-pooler$/, "") !== hostDe(direta).split(".")[0]) {
    throw new Error("DATABASE_URL e DIRECT_URL apontam para endpoints diferentes. Confira o .env.local.");
  }

  const pool = new Pool({ connectionString: direta });
  try {
    const { rows } = await pool.query<{ rolcanlogin: boolean }>("SELECT rolcanlogin FROM pg_roles WHERE rolname = $1", [
      PAPEL_APP,
    ]);
    const existe = rows.length > 0;
    const temLogin = rows[0]?.rolcanlogin ?? false;
    if (temLogin && !novaSenha) {
      console.log(`O papel ${PAPEL_APP} já tem login em ${hostDe(direta)}. Nada mudou; para trocar a senha, use --nova-senha.`);
      return;
    }

    const senha = gerarSenha();
    const verbo = existe ? "ALTER" : "CREATE";
    // No ALTER, citar SUPERUSER ou REPLICATION exige ter esses poderes (o dono do Neon não tem), mesmo para negar;
    // e um papel que não os tem não consegue dá-los. O conferirLogin abaixo confere o resultado.
    const atributos = existe ? "LOGIN NOBYPASSRLS NOCREATEDB NOCREATEROLE" : "LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE";
    // Os comandos de papel não aceitam parâmetro ($1): a senha entra no texto, por isso o formato é conferido antes.
    // O Neon só aceita a senha em texto (recusa a já transformada em SCRAM); ela vai pela conexão cifrada (TLS).
    if (!/^[A-Za-z0-9_-]{43,}$/.test(senha)) throw new Error("Formato inesperado da senha gerada.");
    await pool.query(`${verbo} ROLE ${PAPEL_APP} ${atributos} PASSWORD '${senha}'`);
    console.log(`${existe ? "Papel atualizado" : "Papel criado"}: ${PAPEL_APP} em ${hostDe(direta)} (senha nova, ${senha.length} caracteres).`);

    // Grava antes de conferir: a senha já mudou no banco e só existe aqui; se o login falhar, ela não se perde.
    const url = urlDoPapel(doDono, senha);
    if (saida) {
      writeFileSync(saida, `${url}\n`, { mode: 0o600 });
      console.log(`Conexão gravada em ${saida}. Copie para a Vercel (DATABASE_URL) e apague o arquivo.`);
    } else {
      let env = readFileSync(ARQUIVO_ENV, "utf8");
      env = gravarNoEnv(env, "DATABASE_URL_DONO", doDono, "Conexão do dono (pooling), para os scripts de carga locais. Gravada por scripts/papel-app.ts.");
      env = gravarNoEnv(env, "DATABASE_URL", url);
      writeFileSync(ARQUIVO_ENV, env);
      console.log(`${ARQUIVO_ENV}: DATABASE_URL agora é do ${PAPEL_APP}; a do dono ficou em DATABASE_URL_DONO.`);
    }
    await conferirLogin(url);
  } finally {
    await pool.end();
  }
}

/** Entra com a conexão nova (pelo pooler) e confere que o papel não ignora o RLS. Tenta de novo por alguns segundos. */
async function conferirLogin(url: string) {
  for (let tentativa = 1; ; tentativa++) {
    const pool = new Pool({ connectionString: url });
    try {
      const { rows } = await pool.query<{ eu: string; ignora: boolean }>(
        "SELECT current_user AS eu, rolbypassrls AS ignora FROM pg_roles WHERE rolname = current_user",
      );
      if (rows[0]?.eu !== PAPEL_APP || rows[0].ignora) throw new Error("O login não veio como portal_app restrito.");
      console.log(`Login conferido pelo pooler (${hostDe(url)}) como ${PAPEL_APP}, sem permissão de ignorar o RLS.`);
      return;
    } catch (erro) {
      if (tentativa >= 5) {
        // "invalid role OID": o pooler ainda guarda o papel antigo, de antes de um DROP ROLE (reverter-rls.sql).
        // Some quando as conexões antigas dele expiram; rode de novo com --nova-senha depois de alguns minutos.
        const msg = erro instanceof Error ? erro.message : String(erro);
        throw new Error(`a conexão foi gravada, mas o login pelo pooler falhou: ${msg}. Tente de novo com --nova-senha em alguns minutos.`);
      }
      await new Promise((r) => setTimeout(r, 2000 * tentativa));
    } finally {
      await pool.end();
    }
  }
}

main().catch((erro) => {
  // A mensagem do driver nunca traz a senha, mas por garantia não mostra a conexão.
  console.error("Falhou:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
