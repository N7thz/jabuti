// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { fatoPresenca, fatoProjetos, fatoVoto, linkEmail, montarMensagem, telefone } from "./texto";

describe("telefone", () => {
  test("formatos da Câmara e do Senado", () => {
    expect(telefone("3215-5401")).toEqual({ exibir: "(61) 3215-5401", href: "tel:+556132155401" });
    expect(telefone("33036333")).toEqual({ exibir: "(61) 3303-6333", href: "tel:+556133036333" });
    expect(telefone("(61) 3303-6333")?.href).toBe("tel:+556133036333");
  });
  test("número estranho vira null", () => {
    expect(telefone(null)).toBeNull();
    expect(telefone("123")).toBeNull();
  });
});

test("mensagem cita o fato, é educada e tem espaço para assinar", () => {
  const fato = fatoPresenca("camara", "2026", 40, 50);
  const texto = montarMensagem({ nome: "Fulana", casa: "camara", partido: "XX", uf: "DF" }, fato);
  expect(texto).toStartWith("Prezado(a) Deputado(a) Fulana,");
  expect(texto).toContain("40 de 50 sessões deliberativas do plenário (80%)");
  expect(texto).toContain("motivos das ausências");
  expect(texto).toContain("[seu nome]");
});

test("presença completa não pergunta pelas ausências", () => {
  expect(fatoPresenca("senado", "2026", 10, 10).pergunta).not.toContain("ausências");
});

test("voto e projetos", () => {
  const voto = fatoVoto({ id: "123", data: "14/10/2026", proposicao: "PEC 221/2019", descricao: "Votação em 1º turno", votoOriginal: "Não" });
  expect(voto.id).toBe("voto-123");
  expect(voto.resumo).toContain('registrado como "Não"');
  expect(fatoProjetos("2026", 0, null).resumo).toContain("Não encontrei");
  expect(fatoProjetos("2026", 2, { rotulo: "PL 1/2026", ementa: "Algo" }).resumo).toBe(
    'Em 2026, o(a) senhor(a) apresentou 2 proposições. A mais recente é PL 1/2026: "Algo".',
  );
});

test("linkEmail codifica assunto e corpo", () => {
  expect(linkEmail(null, "a", "b")).toBeNull();
  expect(linkEmail("dep.x@camara.leg.br", "Olá & tchau", "linha 1\nlinha 2")).toBe(
    "mailto:dep.x@camara.leg.br?subject=Ol%C3%A1%20%26%20tchau&body=linha%201%0Alinha%202",
  );
});
