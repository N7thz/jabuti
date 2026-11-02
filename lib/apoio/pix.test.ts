// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { crc16, gerarPix, lerCampos, limparTexto, normalizarChave, tipoDaChave } from "./pix";

test("crc16 é o CRC16-CCITT (0x1021, início 0xFFFF) do manual do Pix", () => {
  // Valor de referência do CRC-16/CCITT-FALSE para "123456789".
  expect(crc16("123456789")).toBe("29B1");
});

test("reconhece o tipo da chave e a normaliza", () => {
  expect(tipoDaChave("123.456.789-09")).toBe("cpf");
  expect(normalizarChave("123.456.789-09")).toBe("12345678909");
  expect(tipoDaChave("12.345.678/0001-90")).toBe("cnpj");
  expect(tipoDaChave("Contato@Jabuti.org")).toBe("email");
  expect(normalizarChave("Contato@Jabuti.org")).toBe("contato@jabuti.org");
  expect(tipoDaChave("+55 (61) 99999-0000")).toBe("telefone");
  expect(normalizarChave("+55 (61) 99999-0000")).toBe("+5561999990000");
  expect(tipoDaChave("123E4567-E89B-12D3-A456-426614174000")).toBe("aleatoria");
});

test("limparTexto tira acentos e corta no tamanho do campo", () => {
  expect(limparTexto("São João d'Aliança", 15)).toBe("Sao Joao dAlian");
  expect(limparTexto("  Brasília  ", 15)).toBe("Brasilia");
});

test("gera um BR Code estático válido, com campos no lugar e CRC certo", () => {
  const pix = gerarPix({ chave: "contato@jabuti.org", nome: "Jabuti Transparência", cidade: "Brasília", centavos: 2500, mensagem: "Apoio ao Jabuti" });
  const campos = lerCampos(pix);
  expect(campos.get("00")).toBe("01");
  expect(campos.get("52")).toBe("0000");
  expect(campos.get("53")).toBe("986");
  expect(campos.get("54")).toBe("25.00");
  expect(campos.get("58")).toBe("BR");
  expect(campos.get("59")).toBe("Jabuti Transparencia");
  expect(campos.get("60")).toBe("Brasilia");
  expect(campos.get("62")).toBe("0503***");

  const conta = lerCampos(campos.get("26") ?? "");
  expect(conta.get("00")).toBe("br.gov.bcb.pix");
  expect(conta.get("01")).toBe("contato@jabuti.org");
  expect(conta.get("02")).toBe("Apoio ao Jabuti");

  expect(pix.slice(-8, -4)).toBe("6304");
  expect(pix.slice(-4)).toBe(crc16(pix.slice(0, -4)));
});

test("sem valor, o campo 54 não vai: o app do banco pede o valor", () => {
  const campos = lerCampos(gerarPix({ chave: "12345678909", nome: "Fulano", cidade: "Recife" }));
  expect(campos.has("54")).toBe(false);
  expect(lerCampos(campos.get("26") ?? "").has("02")).toBe(false);
});

test("a mensagem é cortada para o campo 26 não passar de 99 caracteres", () => {
  const pix = gerarPix({ chave: "contato.muito.longo.para.testar@jabuti.org", nome: "Fulano", cidade: "Recife", mensagem: "x".repeat(200) });
  expect((lerCampos(pix).get("26") ?? "").length).toBeLessThanOrEqual(99);
});

test("chave, nome ou cidade vazios dão erro em vez de um Pix quebrado", () => {
  expect(() => gerarPix({ chave: "12345678909", nome: "!!!", cidade: "Recife" })).toThrow();
});

test("bate com o exemplo do Manual de Padrões para Iniciação do Pix (Banco Central)", () => {
  expect(gerarPix({ chave: "123e4567-e12b-12d1-a456-426655440000", nome: "Fulano de Tal", cidade: "BRASILIA" })).toBe(
    "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
  );
});
