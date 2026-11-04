import { Body, Container, Head, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

import { urlDoSite } from "../../lib/site";

/**
 * Cores do tema claro do portal (app/globals.css). Email não tem variável CSS nem modo escuro confiável,
 * então os valores vão fixos. Todas as combinações de texto passam do contraste 4,5:1 (WCAG AA).
 */
export const cores = {
  texto: "#262c12",
  textoSuave: "#4f5733",
  fundo: "#f4f6ec",
  cartao: "#ffffff",
  borda: "#e1e6d3",
  destaque: "#262c12",
  sobreDestaque: "#ffffff",
} as const;

export const fonte =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

export const estilos = {
  paragrafo: { fontSize: "16px", lineHeight: "26px", color: cores.texto, margin: "0 0 16px" },
  suave: { fontSize: "14px", lineHeight: "22px", color: cores.textoSuave, margin: "0 0 12px" },
  link: { color: cores.texto, textDecoration: "underline" },
  botao: {
    backgroundColor: cores.destaque,
    color: cores.sobreDestaque,
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 600,
    padding: "14px 24px",
    textDecoration: "none",
  },
} as const;

interface Props {
  /** Título do documento HTML (`<title>`): é o que leitores de tela e a aba do navegador anunciam. */
  titulo: string;
  /** Texto curto que aparece ao lado do assunto na caixa de entrada. */
  previa: string;
  children: ReactNode;
}

/** Moldura comum dos emails do portal: marca no topo, cartão branco com o conteúdo e rodapé. */
export function Layout({ titulo, previa, children }: Props) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head>
        <title>{titulo}</title>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{previa}</Preview>
      <Body style={{ backgroundColor: cores.fundo, fontFamily: fonte, margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "0 16px" }}>
          <Section style={{ padding: "8px 0 16px" }}>
            <Link
              href={urlDoSite("/")}
              style={{ color: cores.texto, fontSize: "22px", fontWeight: 700, textDecoration: "none" }}
            >
              🐢 Jabuti
            </Link>
          </Section>
          <Section
            style={{
              backgroundColor: cores.cartao,
              border: `1px solid ${cores.borda}`,
              borderRadius: "12px",
              padding: "32px 28px",
            }}
          >
            {children}
          </Section>
          <Section style={{ padding: "20px 4px 0" }}>
            <Hr style={{ borderColor: cores.borda, margin: "12px 0" }} />
            <Text style={{ ...estilos.suave, fontSize: "13px" }}>
              Jabuti: portal para acompanhar e cobrar quem nos representa, com dados oficiais.{" "}
              <Link href={urlDoSite("/")} style={estilos.link}>
                {new URL(urlDoSite("/")).host}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
