// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { apoiadorSchema } from "./schema-apoiador";

describe("apoiadorSchema", () => {
  test("aceita nome autorizado e tira os espaços das pontas", () => {
    expect(apoiadorSchema.parse({ nome: "  Maria S. ", autorizado: "sim" }).nome).toBe("Maria S.");
  });
  test("recusa sem autorização", () => {
    expect(apoiadorSchema.safeParse({ nome: "Maria", autorizado: false }).success).toBe(false);
  });
  test("recusa links e nomes curtos ou longos", () => {
    for (const nome of ["https://golpe.com", "www.site.com", "a", "x".repeat(61), "<b>oi</b>"]) {
      expect(apoiadorSchema.safeParse({ nome, autorizado: "sim" }).success).toBe(false);
    }
  });
});
