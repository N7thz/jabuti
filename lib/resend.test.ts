// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import { dominioDoRemetente, enviarPeloResend, MENSAGEM_SEM_CHAVE, postarNoResend, REMETENTE_PADRAO, remetente } from "./resend";

const VARIAVEIS = ["RESEND_API_KEY", "EMAIL_REMETENTE", "FEEDBACK_REMETENTE"] as const;
const envOriginal = Object.fromEntries(VARIAVEIS.map((nome) => [nome, process.env[nome]]));
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  for (const nome of VARIAVEIS) delete process.env[nome];
});

afterEach(() => {
  for (const nome of VARIAVEIS) {
    if (envOriginal[nome] === undefined) delete process.env[nome];
    else process.env[nome] = envOriginal[nome];
  }
  globalThis.fetch = fetchOriginal;
});

describe("remetente", () => {
  test("sem nada configurado, usa o remetente de teste do Resend", () => {
    expect(remetente("sistema")).toBe(REMETENTE_PADRAO);
    expect(remetente("feedback")).toBe(REMETENTE_PADRAO);
  });

  test("sistema prefere EMAIL_REMETENTE; feedback prefere FEEDBACK_REMETENTE", () => {
    process.env.EMAIL_REMETENTE = "Jabuti <avisos@portal-jabuti.com.br>";
    process.env.FEEDBACK_REMETENTE = "Jabuti <contato@portal-jabuti.com.br>";
    expect(remetente("sistema")).toBe("Jabuti <avisos@portal-jabuti.com.br>");
    expect(remetente("feedback")).toBe("Jabuti <contato@portal-jabuti.com.br>");
  });

  test("cada tipo cai no remetente do outro quando o seu está vazio", () => {
    process.env.FEEDBACK_REMETENTE = "Jabuti <contato@portal-jabuti.com.br>";
    expect(remetente("sistema")).toBe("Jabuti <contato@portal-jabuti.com.br>");

    delete process.env.FEEDBACK_REMETENTE;
    process.env.EMAIL_REMETENTE = "Jabuti <avisos@portal-jabuti.com.br>";
    expect(remetente("feedback")).toBe("Jabuti <avisos@portal-jabuti.com.br>");
  });

  test("valor só com espaços conta como vazio", () => {
    process.env.EMAIL_REMETENTE = "   ";
    expect(remetente("sistema")).toBe(REMETENTE_PADRAO);
  });

  test("avisa (sem bloquear) quando o remetente é de provedor gratuito", () => {
    const aviso = spyOn(console, "warn").mockImplementation(() => {});
    try {
      process.env.EMAIL_REMETENTE = "Jabuti <jabuti.portal@gmail.com>";
      expect(remetente("sistema")).toBe("Jabuti <jabuti.portal@gmail.com>");
      expect(aviso).toHaveBeenCalledTimes(1);
      expect(String(aviso.mock.calls[0][0])).toContain("gmail.com");
      expect(String(aviso.mock.calls[0][0])).toContain("portal-jabuti.com.br");

      // O mesmo remetente não repete o aviso.
      remetente("sistema");
      expect(aviso).toHaveBeenCalledTimes(1);
    } finally {
      aviso.mockRestore();
    }
  });

  test("não avisa para domínio próprio nem para o remetente de teste", () => {
    const aviso = spyOn(console, "warn").mockImplementation(() => {});
    try {
      remetente("sistema");
      process.env.FEEDBACK_REMETENTE = "contato@portal-jabuti.com.br";
      remetente("feedback");
      expect(aviso).not.toHaveBeenCalled();
    } finally {
      aviso.mockRestore();
    }
  });
});

describe("dominioDoRemetente", () => {
  test("lê o domínio com ou sem nome", () => {
    expect(dominioDoRemetente("Jabuti <Avisos@Portal-Jabuti.com.br>")).toBe("portal-jabuti.com.br");
    expect(dominioDoRemetente("contato@uol.com.br")).toBe("uol.com.br");
    expect(dominioDoRemetente("sem arroba")).toBeNull();
  });
});

/** Troca o fetch por um simulado e devolve a função para inspecionar as chamadas. */
function simularFetch(resposta = new Response('{"id":"1"}', { status: 200 })) {
  const chamada = mock(async (_url: string, _init: RequestInit) => resposta);
  globalThis.fetch = chamada as unknown as typeof fetch;
  return chamada;
}

const corpoEnviado = (chamada: ReturnType<typeof simularFetch>) => JSON.parse(String(chamada.mock.calls[0][1].body));

describe("postarNoResend", () => {
  test("sem RESEND_API_KEY lança erro e não chama a API", async () => {
    const chamada = simularFetch();
    const erro = await postarNoResend({ de: "a@b.com", para: ["c@d.com"], assunto: "x", texto: "y" }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(Error);
    expect((erro as Error).message).toBe(MENSAGEM_SEM_CHAVE);
    expect(chamada).not.toHaveBeenCalled();
  });

  test("manda o corpo básico, sem campos opcionais, com a chave no cabeçalho", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    const chamada = simularFetch();
    const resposta = await postarNoResend({ de: REMETENTE_PADRAO, para: ["pessoa@exemplo.com"], assunto: "Oi", texto: "Corpo" });

    expect(resposta.ok).toBe(true);
    const [url, init] = chamada.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_teste");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(corpoEnviado(chamada)).toEqual({ from: REMETENTE_PADRAO, to: ["pessoa@exemplo.com"], subject: "Oi", text: "Corpo" });
  });

  test("inclui reply_to, headers e attachments só quando passados", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    const chamada = simularFetch();
    await postarNoResend({
      de: "Jabuti <contato@portal-jabuti.com.br>",
      para: ["a@exemplo.com", "b@exemplo.com"],
      assunto: "Oi",
      texto: "Corpo",
      responderPara: "quem@escreveu.com",
      cabecalhos: { "List-Unsubscribe": "<https://portal-jabuti.com.br/x>" },
      anexos: [{ filename: "print.png", content: "aGVsbG8=" }],
      tempoLimiteMs: 30_000,
    });
    expect(corpoEnviado(chamada)).toEqual({
      from: "Jabuti <contato@portal-jabuti.com.br>",
      to: ["a@exemplo.com", "b@exemplo.com"],
      subject: "Oi",
      text: "Corpo",
      reply_to: "quem@escreveu.com",
      headers: { "List-Unsubscribe": "<https://portal-jabuti.com.br/x>" },
      attachments: [{ filename: "print.png", content: "aGVsbG8=" }],
    });
  });

  test("lista de anexos vazia e cabeçalhos vazios não vão no corpo", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    const chamada = simularFetch();
    await postarNoResend({ de: "a@b.com", para: ["c@d.com"], assunto: "x", texto: "y", anexos: [], cabecalhos: {} });
    const corpo = corpoEnviado(chamada);
    expect("attachments" in corpo).toBe(false);
    expect("headers" in corpo).toBe(false);
    expect("reply_to" in corpo).toBe(false);
  });

  test("devolve a resposta de erro sem lançar, para o chamador tratar o status", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    simularFetch(new Response("limite", { status: 429 }));
    const resposta = await postarNoResend({ de: "a@b.com", para: ["c@d.com"], assunto: "x", texto: "y" });
    expect(resposta.status).toBe(429);
  });
});

describe("enviarPeloResend", () => {
  test("lança erro com status e detalhe quando o Resend recusa", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    simularFetch(new Response("domínio não verificado", { status: 403 }));
    const erro = await enviarPeloResend({ de: "a@b.com", para: ["c@d.com"], assunto: "x", texto: "y" }).catch((e: unknown) => e);
    expect((erro as Error).message).toBe("Resend recusou o email (403): domínio não verificado");
  });

  test("resolve sem valor quando o Resend aceita", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    simularFetch();
    await expect(enviarPeloResend({ de: "a@b.com", para: ["c@d.com"], assunto: "x", texto: "y" })).resolves.toBeUndefined();
  });
});
