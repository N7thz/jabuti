// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import BoasVindas from "../emails/boas-vindas";
import ConfirmarEmail from "../emails/confirmar-email";
import FeedbackRecebido from "../emails/feedback";
import LinkDeEntrada from "../emails/link-de-entrada";
import { renderizar } from "../emails/renderizar";
import SenhaNova from "../emails/senha-nova";

const URL_DO_LINK = "https://portal-jabuti.com.br/api/auth/verify?token=abc&callbackURL=%2F";

describe("emails do login", () => {
  for (const [nome, Template] of [
    ["confirmar email", ConfirmarEmail],
    ["senha nova", SenhaNova],
    ["boas-vindas", BoasVindas],
    ["link de entrada", LinkDeEntrada],
  ] as const) {
    test(`${nome}: HTML em pt-BR com o link no botão e escrito; texto puro também tem o link`, async () => {
      const { html, texto } = await renderizar(Template({ url: URL_DO_LINK }));
      expect(html).toContain('lang="pt-BR"');
      // Botão e endereço escrito embaixo dele.
      expect(html.split('href="https://portal-jabuti.com.br/api/auth/verify?token=abc&amp;callbackURL=%2F"').length).toBe(3);
      expect(texto).toContain(URL_DO_LINK);
      expect(texto).toContain("1 hora");
    });

    test(`${nome}: o HTML tem <title>`, async () => {
      const { html } = await renderizar(Template({ url: URL_DO_LINK }));
      expect(html).toMatch(/<title>[^<]+<\/title>/);
    });
  }
});

describe("feedback", () => {
  test("escapa o que a pessoa digitou e só transforma a página em link quando é um endereço", async () => {
    const props = {
      assunto: "Dado errado",
      nome: "<b>Maria</b>",
      email: "maria@example.com",
      pagina: "javascript:alert(1)",
      anexos: [],
      mensagem: "<script>alert(1)</script>",
    };
    const { html } = await renderizar(FeedbackRecebido(props));
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("<title>Nova mensagem pelo formulário</title>");
  });
});
