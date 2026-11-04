// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import type { PrismaClient } from "./generated/prisma/client";
import { comoUsuarioNo, MODELOS_DA_PESSOA } from "./rls";

// O teste com o banco de verdade é scripts/testar-rls.ts (só no dev). Aqui, só a ordem das chamadas.

/** Cliente falso que anota o que foi pedido ao banco. */
function clienteFalso() {
  const chamadas: string[] = [];
  const tx = {
    $executeRaw: (partes: TemplateStringsArray, ...valores: unknown[]) => {
      chamadas.push(`${partes.join("?")} ${JSON.stringify(valores)}`);
      return Promise.resolve(1);
    },
    lista: { count: () => (chamadas.push("lista.count"), Promise.resolve(3)) },
  };
  const cliente = {
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
      chamadas.push("BEGIN");
      const r = await fn(tx);
      chamadas.push("COMMIT");
      return r;
    },
  };
  return { cliente: cliente as unknown as PrismaClient, chamadas };
}

describe("comoUsuarioNo", () => {
  test("avisa o dono (em minúsculas) antes das operações, na mesma transação", async () => {
    const { cliente, chamadas } = clienteFalso();
    const total = await comoUsuarioNo(cliente, "  Maria@Exemplo.com ", (tx) => tx.lista.count());
    expect(total).toBe(3);
    expect(chamadas).toEqual([
      "BEGIN",
      `SELECT set_config('app.usuario', ?, true) ["maria@exemplo.com"]`,
      "lista.count",
      "COMMIT",
    ]);
  });

  test("recusa email vazio, que esconderia todas as linhas", () => {
    const { cliente } = clienteFalso();
    expect(() => comoUsuarioNo(cliente, "   ")).toThrow("email vazio");
  });

  test("cobre todas as tabelas de dados pessoais", () => {
    expect([...MODELOS_DA_PESSOA].sort()).toEqual(
      ["EmpresaVigiada", "Fixado", "ItemLista", "Lista", "Notificacao", "PerfilUsuario", "Seguido"].sort(),
    );
  });
});
