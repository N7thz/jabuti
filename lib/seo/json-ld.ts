import { DESCRICAO_PORTAL } from "@/lib/metadados";
import { urlDoSite } from "@/lib/site";

/**
 * Dados estruturados (schema.org em JSON-LD) que ajudam o buscador a entender a página: quem é a pessoa
 * do perfil, onde a página fica no portal (trilha) e o que é o site. Tipos próprios e enxutos, só com os
 * campos que o portal preenche. Os endereços saem absolutos, como o schema.org pede.
 */

const CONTEXTO = "https://schema.org";

interface Coisa {
  "@type": string;
  "@id"?: string;
  name?: string;
  url?: string;
}

export interface PartidoPolitico extends Coisa {
  "@type": "PoliticalParty";
  name: string;
}

export interface OrgaoPublico extends Coisa {
  "@type": "GovernmentOrganization";
  name: string;
  url: string;
}

export interface Pessoa extends Coisa {
  "@type": "Person";
  name: string;
  alternateName?: string;
  jobTitle: string;
  image?: string;
  url: string;
  email?: string;
  affiliation?: PartidoPolitico;
  worksFor?: OrgaoPublico;
  sameAs?: string[];
}

export interface PaginaDePerfil {
  "@context": typeof CONTEXTO;
  "@type": "ProfilePage";
  url: string;
  name: string;
  inLanguage: "pt-BR";
  mainEntity: Pessoa;
}

export interface ItemDaTrilha {
  "@type": "ListItem";
  position: number;
  name: string;
  item: string;
}

export interface Trilha {
  "@context": typeof CONTEXTO;
  "@type": "BreadcrumbList";
  itemListElement: ItemDaTrilha[];
}

export interface Site extends Coisa {
  "@type": "WebSite";
  "@id": string;
  name: string;
  url: string;
  description: string;
  inLanguage: "pt-BR";
  publisher: { "@id": string };
}

export interface Organizacao extends Coisa {
  "@type": "Organization";
  "@id": string;
  name: string;
  url: string;
  logo: string;
  description: string;
}

export interface GrafoDoSite {
  "@context": typeof CONTEXTO;
  "@graph": [Site, Organizacao];
}

export type JsonLd = PaginaDePerfil | Trilha | GrafoDoSite;

const CASAS = {
  camara: { nome: "Câmara dos Deputados", url: "https://www.camara.leg.br" },
  senado: { nome: "Senado Federal", url: "https://www12.senado.leg.br" },
} as const;

/** Página oficial do parlamentar no site da casa, montada a partir do id que a própria API usa. */
const paginaOficial = (casa: "camara" | "senado", id: string | number) =>
  casa === "camara"
    ? `https://www.camara.leg.br/deputados/${id}`
    : `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${id}`;

const limpar = (valor: string | null | undefined) => valor?.trim() || undefined;

/** Perfil de deputado ou senador: `ProfilePage` cuja entidade principal é a pessoa. */
export function perfilParlamentar({
  casa,
  id,
  nome,
  nomeCivil,
  foto,
  partido,
  email,
  redesSociais = [],
}: {
  casa: "camara" | "senado";
  /** Id da Câmara ou código do Senado, o mesmo da URL do perfil. */
  id: string | number;
  nome: string;
  nomeCivil?: string | null;
  foto?: string | null;
  partido?: string | null;
  email?: string | null;
  /** Perfis em redes sociais que a própria casa publica no cadastro. */
  redesSociais?: string[];
}): PaginaDePerfil {
  const caminho = casa === "camara" ? `/parlamentares/deputado/${id}` : `/parlamentares/senador/${id}`;
  const url = urlDoSite(caminho);
  const sigla = limpar(partido);
  const civil = limpar(nomeCivil);
  const pessoa: Pessoa = {
    "@type": "Person",
    "@id": `${url}#pessoa`,
    name: nome,
    ...(civil && civil.toLowerCase() !== nome.toLowerCase() ? { alternateName: civil } : {}),
    jobTitle: casa === "camara" ? "Deputado(a) federal" : "Senador(a)",
    ...(limpar(foto) ? { image: limpar(foto) } : {}),
    url,
    ...(limpar(email) ? { email: limpar(email) } : {}),
    ...(sigla ? { affiliation: { "@type": "PoliticalParty", name: sigla } } : {}),
    worksFor: { "@type": "GovernmentOrganization", name: CASAS[casa].nome, url: CASAS[casa].url },
    sameAs: [paginaOficial(casa, id), ...redesSociais.filter((r) => /^https:\/\//.test(r))],
  };
  return {
    "@context": CONTEXTO,
    "@type": "ProfilePage",
    url,
    name: nome,
    inLanguage: "pt-BR",
    mainEntity: pessoa,
  };
}

/** Trilha de navegação (Início → ... → página atual). Cada item leva o caminho dentro do portal. */
export function trilha(itens: { nome: string; caminho: string }[]): Trilha {
  return {
    "@context": CONTEXTO,
    "@type": "BreadcrumbList",
    itemListElement: itens.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.nome,
      item: urlDoSite(item.caminho),
    })),
  };
}

/** O portal em si, para a página inicial. Sem `SearchAction`: o Google não mostra mais a caixa de busca. */
export function siteJabuti(): GrafoDoSite {
  const url = urlDoSite("/");
  const organizacao = `${url}#organizacao`;
  return {
    "@context": CONTEXTO,
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}#site`,
        name: "Jabuti",
        url,
        description: DESCRICAO_PORTAL,
        inLanguage: "pt-BR",
        publisher: { "@id": organizacao },
      },
      {
        "@type": "Organization",
        "@id": organizacao,
        name: "Jabuti",
        url,
        logo: urlDoSite("/icon.png"),
        description: DESCRICAO_PORTAL,
      },
    ],
  };
}

/**
 * JSON pronto para ir dentro de `<script type="application/ld+json">`. O `<` vira `<`, que o JSON
 * lê igual, para um nome com "</script>" não fechar a tag e virar HTML.
 */
export const serializarJsonLd = (dados: JsonLd | JsonLd[]) => JSON.stringify(dados).replace(/</g, "\\u003c");
