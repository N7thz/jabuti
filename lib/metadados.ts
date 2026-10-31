import type { Metadata } from "next";

export const DESCRICAO_PORTAL =
  "Acompanhe e cobre os políticos com dados públicos oficiais: emendas, gastos de gabinete, presença, campanhas e as contas de estados e municípios.";

const OPEN_GRAPH = { type: "website", locale: "pt_BR", siteName: "Jabuti" } as const;

// Cartão geral do portal (app/opengraph-image.tsx). Um `openGraph` na página faz o Next esquecer a imagem do
// layout, então ela vai aqui como padrão. Rotas com opengraph-image.tsx próprio passam `imagemPropria`: uma
// imagem configurada aqui tomaria o lugar da gerada pelo arquivo.
const IMAGEM_PADRAO = {
  url: "/opengraph-image",
  type: "image/jpeg",
  width: 1200,
  height: 630,
  alt: "Jabuti: acompanhe e cobre os políticos com dados públicos oficiais",
};

/**
 * Título e descrição da página também na prévia do link (WhatsApp, Telegram, redes). O Next junta os
 * metadados de forma rasa: um `openGraph` do layout com título fixo apareceria igual em todo link, então
 * cada página monta o seu aqui. A imagem continua vindo do opengraph-image.tsx mais próximo da rota.
 */
export function metadados({
  titulo,
  descricao = DESCRICAO_PORTAL,
  imagemPropria = false,
}: {
  titulo: string;
  descricao?: string;
  /** A rota tem opengraph-image.tsx próprio (perfil, cidade). */
  imagemPropria?: boolean;
}): Metadata {
  const imagem = imagemPropria ? {} : { images: [IMAGEM_PADRAO] };
  return {
    title: titulo,
    description: descricao,
    openGraph: { ...OPEN_GRAPH, title: titulo, description: descricao, ...imagem },
    twitter: { card: "summary_large_image", title: titulo, description: descricao, ...imagem },
  };
}
