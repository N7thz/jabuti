import "server-only";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";

import { db } from "@/lib/db";

/**
 * Limite de tentativas para Server Actions (login, envio de links, feedback). Conta no banco, na mesma
 * tabela do Better Auth (`rateLimit`), para valer em todas as instâncias do servidor. As chaves daqui
 * começam com "portal:" e não se misturam com as dele.
 *
 * Janela fixa: começa na primeira tentativa (gravada em `lastRequest`) e zera quando passa `janela` segundos.
 */
export interface Regra {
  /** Duração da janela, em segundos. */
  janela: number;
  /** Tentativas aceitas dentro da janela. */
  max: number;
}

/** Endereço de quem fez o pedido. Na Vercel, o primeiro do x-forwarded-for é o que ela mesma viu. */
export async function ipDoPedido() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "sem-ip";
}

/** Registra uma tentativa; `false` quando a chave já passou do limite. Banco fora do ar não bloqueia ninguém. */
export async function tentativaPermitida(chave: string, { janela, max }: Regra): Promise<boolean> {
  const key = `portal:${chave}`;
  const agora = Date.now();
  try {
    const linha = await db.rateLimit.findUnique({ where: { key } });
    if (!linha || agora - Number(linha.lastRequest) >= janela * 1000) {
      await db.rateLimit.upsert({
        where: { key },
        create: { id: randomUUID(), key, count: 1, lastRequest: BigInt(agora) },
        update: { count: 1, lastRequest: BigInt(agora) },
      });
      return true;
    }
    if (linha.count >= max) return false;
    await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return true;
  } catch (erro) {
    console.error("[limite] falha ao contar tentativa; seguindo sem limite:", erro);
    return true;
  }
}

/** Todas as chaves precisam aceitar; conta a tentativa em cada uma (para nenhuma ficar para trás). */
export async function todasPermitidas(regras: [chave: string, regra: Regra][]) {
  const resultados = await Promise.all(regras.map(([chave, regra]) => tentativaPermitida(chave, regra)));
  return resultados.every(Boolean);
}
