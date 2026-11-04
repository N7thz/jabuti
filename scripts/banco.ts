import { config } from "dotenv";

// Utilidades dos scripts de segurança do banco (papel-app, conferir-rls, testar-rls). Nunca imprimem senha nem
// conexão inteira: só o host.

config({ path: [".env.local", ".env"], quiet: true });

/** Endpoint do branch de desenvolvimento no Neon (cópia da produção, sem dados pessoais), com o ID completo. */
export const ENDPOINT_DEV = "ep-broad-bird-b6z2a2un";

export const hostDe = (url: string) => new URL(url).hostname;
export const usuarioDe = (url: string) => decodeURIComponent(new URL(url).username);
/** O primeiro pedaço do host é o endpoint, com "-pooler" na conexão com pooling. */
export const ehDev = (url: string) => hostDe(url).split(".")[0].replace(/-pooler$/, "") === ENDPOINT_DEV;

/** Conexão direta do dono (a mesma das migrações, ver prisma.config.ts). */
export function urlDiretaDoDono() {
  // `||`, não `??`: variável vazia no .env cai para a próxima.
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("Defina DIRECT_URL (conexão direta do dono do banco) no .env.local.");
  return url;
}

/** Para o script se a conexão não for do branch dev, a menos que `permitirProducao`. */
export function exigirDev(url: string, rotulo: string, permitirProducao = false) {
  if (ehDev(url)) return;
  if (permitirProducao) {
    console.warn(`[aviso] ${rotulo} aponta para ${hostDe(url)}, fora do dev; seguindo por causa de --confirmo-producao.`);
    return;
  }
  console.error(`${rotulo} aponta para ${hostDe(url)}, que não é o branch dev (${ENDPOINT_DEV}). Parei sem mexer em nada.`);
  process.exit(1);
}
