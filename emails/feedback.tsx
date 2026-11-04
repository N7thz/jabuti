import { Heading, Hr, Link, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

import { cores, estilos, Layout } from "./componentes/layout";

export interface FeedbackProps {
  assunto: string;
  nome: string;
  email: string;
  pagina: string;
  anexos: string[];
  mensagem: string;
}

/** Mensagem do formulário /feedback, entregue à equipe do portal. Responder no cliente de email fala com a pessoa. */
export default function FeedbackRecebido({ assunto, nome, email, pagina, anexos, mensagem }: FeedbackProps) {
  const campos: [string, ReactNode][] = [
    ["Assunto", assunto],
    ["Nome", nome || "(não informado)"],
    [
      "Email para resposta",
      <Link key="email" href={`mailto:${email}`} style={estilos.link}>
        {email}
      </Link>,
    ],
    [
      "Página",
      // Campo livre: só vira link quando a pessoa colou um endereço completo.
      /^https?:\/\//.test(pagina) ? (
        <Link key="pagina" href={pagina} style={estilos.link}>
          {pagina}
        </Link>
      ) : (
        pagina || "(não informada)"
      ),
    ],
    ["Anexos", anexos.length ? anexos.join(", ") : "nenhum"],
  ];
  return (
    <Layout titulo="Nova mensagem pelo formulário" previa={`${assunto}: ${mensagem.slice(0, 90)}`}>
      <Heading as="h1" style={{ fontSize: "22px", lineHeight: "30px", color: cores.texto, margin: "0 0 20px" }}>
        Nova mensagem pelo formulário
      </Heading>
      <Section>
        {campos.map(([rotulo, valor]) => (
          <Text key={rotulo} style={{ ...estilos.paragrafo, fontSize: "15px", lineHeight: "22px", margin: "0 0 6px" }}>
            <strong>{rotulo}:</strong> {valor}
          </Text>
        ))}
      </Section>
      <Hr style={{ borderColor: cores.borda, margin: "20px 0" }} />
      <Text style={{ ...estilos.paragrafo, whiteSpace: "pre-wrap", margin: 0 }}>{mensagem}</Text>
    </Layout>
  );
}

FeedbackRecebido.PreviewProps = {
  assunto: "Dado errado",
  nome: "Maria",
  email: "maria@example.com",
  pagina: "https://portal-jabuti.com.br/deputados/exemplo",
  anexos: ["print.png"],
  mensagem: "O valor das despesas de outubro está diferente do site da Câmara.\n\nPodem conferir?",
} satisfies FeedbackProps;
