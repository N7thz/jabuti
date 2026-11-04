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
 *
 * `caminho` vira o endereço canônico (e o `og:url`): sempre o caminho sem query string, para que
 * `/parlamentares?uf=SP` e `/parlamentares` contem como uma página só na busca. O `metadataBase` do
 * layout completa o domínio.
 *
 * `indexar: false` marca páginas da conta (entrar, painel, listas...) como fora da busca. Elas continuam
 * liberadas no robots.txt: o buscador precisa abrir a página para ler o noindex.
 */
export function metadados({
  titulo,
  descricao = DESCRICAO_PORTAL,
  imagemPropria = false,
  caminho,
  indexar = true,
}: {
  titulo: string;
  descricao?: string;
  /** A rota tem opengraph-image.tsx próprio (perfil, cidade). */
  imagemPropria?: boolean;
  /** Caminho canônico da página, sem query string (ex.: "/parlamentares/deputado/204554"). */
  caminho?: string;
  /** `false` para páginas da conta, que não devem aparecer na busca. */
  indexar?: boolean;
}): Metadata {
  const imagem = imagemPropria ? {} : { images: [IMAGEM_PADRAO] };
  const canonico = indexar && caminho ? caminhoCanonico(caminho) : undefined;
  return {
    title: titulo,
    description: descricao,
    ...(canonico ? { alternates: { canonical: canonico } } : {}),
    ...(indexar ? {} : { robots: { index: false, follow: true } }),
    openGraph: { ...OPEN_GRAPH, title: titulo, description: descricao, ...(canonico ? { url: canonico } : {}), ...imagem },
    twitter: { card: "summary_large_image", title: titulo, description: descricao, ...imagem },
  };
}

/** Tira query string e âncora: o canônico de uma lista filtrada é a lista sem filtro. */
export const caminhoCanonico = (caminho: string) => caminho.replace(/[?#].*$/, "") || "/";
