// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { caminhoCanonico, metadados } from "./metadados";

describe("metadados", () => {
  test("caminho vira canônico e og:url", () => {
    const m = metadados({ titulo: "Parlamentares · Jabuti", caminho: "/parlamentares" });
    expect(m.alternates).toEqual({ canonical: "/parlamentares" });
    expect(m.openGraph).toMatchObject({ url: "/parlamentares", title: "Parlamentares · Jabuti" });
    expect(m.robots).toBeUndefined();
  });

  test("canônico de lista filtrada é a lista sem filtro", () => {
    expect(caminhoCanonico("/parlamentares?uf=SP&casa=camara")).toBe("/parlamentares");
    expect(caminhoCanonico("/votacoes/camara/2455564-65#votos")).toBe("/votacoes/camara/2455564-65");
    expect(caminhoCanonico("?ano=2025")).toBe("/");
  });

  test("sem caminho não há canônico", () => {
    const m = metadados({ titulo: "Jabuti" });
    expect(m.alternates).toBeUndefined();
    expect(m.openGraph).not.toHaveProperty("url");
  });

  test("páginas da conta saem da busca e não têm canônico", () => {
    const m = metadados({ titulo: "Meu painel · Jabuti", caminho: "/meu", indexar: false });
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(m.alternates).toBeUndefined();
    expect(m.openGraph).not.toHaveProperty("url");
  });
});
