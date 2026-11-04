import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { cores, estilos, Layout } from "./layout";

export interface EmailComLinkProps {
  previa: string;
  titulo: string;
  /** Parágrafos antes do botão. */
  paragrafos: string[];
  textoBotao: string;
  url: string;
  /** Parágrafos depois do botão: validade do link, o que fazer se não foi a pessoa. */
  avisos: string[];
}

/**
 * Email com uma ação só (confirmar, entrar, criar senha). O endereço também vai escrito embaixo do botão,
 * para quem tem o cliente de email sem botões ou prefere copiar o link.
 */
export function EmailComLink({ previa, titulo, paragrafos, textoBotao, url, avisos }: EmailComLinkProps) {
  return (
    <Layout titulo={titulo} previa={previa}>
      <Heading as="h1" style={{ fontSize: "24px", lineHeight: "32px", color: cores.texto, margin: "0 0 20px" }}>
        {titulo}
      </Heading>
      {paragrafos.map((p) => (
        <Text key={p} style={estilos.paragrafo}>
          {p}
        </Text>
      ))}
      <Section style={{ margin: "8px 0 24px" }}>
        <Button
          href={url}
          style={estilos.botao}
        >
          {textoBotao}
        </Button>
      </Section>
      <Text style={estilos.suave}>Se o botão não funcionar, copie e cole este endereço no navegador:</Text>
      <Text style={{ ...estilos.suave, wordBreak: "break-all" }}>
        <Link href={url} style={estilos.link}>
          {url}
        </Link>
      </Text>
      {avisos.map((a) => (
        <Text key={a} style={estilos.suave}>
          {a}
        </Text>
      ))}
    </Layout>
  );
}
