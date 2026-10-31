// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { feedbackSchema, LIMITE_ANEXOS } from "./schema";

const valido = { assunto: "sugestao", nome: "", email: " ana@exemplo.com ", mensagem: "Poderia ter filtro por partido.", pagina: "/parlamentares" };

describe("feedbackSchema", () => {
  test("aceita mensagem válida e limpa espaços do email", () => {
    const dados = feedbackSchema.parse(valido);
    expect(dados.email).toBe("ana@exemplo.com");
  });

  test("exige email para resposta", () => {
    const resultado = feedbackSchema.safeParse({ ...valido, email: "" });
    expect(resultado.error?.issues[0]?.message).toBe("Informe seu email para podermos responder.");
  });

  test("recusa email mal formado, mensagem curta e assunto desconhecido", () => {
    const resultado = feedbackSchema.safeParse({ ...valido, email: "ana@", mensagem: "oi", assunto: "spam" });
    expect(resultado.error?.issues.map((i) => i.path[0]).sort()).toEqual(["assunto", "email", "mensagem"]);
  });

  test("sem anexo, o File vazio que o formulário manda vira lista vazia", () => {
    const dados = feedbackSchema.parse({ ...valido, anexos: [new File([], "")] });
    expect(dados.anexos).toEqual([]);
  });

  test("aceita print dentro do limite", () => {
    const print = new File(["png"], "tela.png", { type: "image/png" });
    expect(feedbackSchema.parse({ ...valido, anexos: [print] }).anexos).toHaveLength(1);
  });

  test("recusa tipo não aceito, arquivo grande e anexos demais", () => {
    const exe = new File(["x"], "virus.exe", { type: "application/x-msdownload" });
    const grande = new File([new Uint8Array(LIMITE_ANEXOS.porArquivo + 1)], "foto.jpg", { type: "image/jpeg" });
    const mensagens = (anexos: File[]) => feedbackSchema.safeParse({ ...valido, anexos }).error?.issues.map((i) => i.message);

    expect(mensagens([exe])).toEqual([`"virus.exe" não é de um tipo aceito. Use PNG, JPG, WebP, GIF, PDF, TXT.`]);
    expect(mensagens([grande])?.[0]).toBe(`"foto.jpg" tem 4 MB; o limite é 4 MB por arquivo.`);
    const muitos = Array.from({ length: 6 }, (_, i) => new File(["a"], `${i}.txt`, { type: "text/plain" }));
    expect(mensagens(muitos)).toEqual(["Envie no máximo 5 arquivos."]);
  });
});
