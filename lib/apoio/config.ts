// Formas de apoio financeiro, lidas das variáveis de ambiente (ver .env.example). Só aparece no portal
// o que estiver configurado: sem chave Pix não há botão de Pix, sem link não há botão de apoio mensal.

import { gerarPix, normalizarChave, ROTULO_CHAVE, tipoDaChave } from "./pix";

export interface PixConfig {
  chave: string;
  rotuloChave: string;
  nome: string;
  cidade: string;
  /** Copia e cola sem valor: o app do banco pede para a pessoa digitar quanto quer dar. */
  copiaECola: string;
}

export interface LinkApoio {
  id: string;
  nome: string;
  descricao: string;
  url: string;
}

export interface ApoioConfig {
  pix: PixConfig | null;
  links: LinkApoio[];
  repositorio: string;
}

/** Valores sugeridos no Pix, em centavos. */
export const VALORES_SUGERIDOS = [1000, 2500, 5000, 10000] as const;

export const MENSAGEM_PIX = "Apoio ao Jabuti";

const urlValida = (valor: string | undefined) => {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

function lerPix(): PixConfig | null {
  const chave = process.env.APOIO_PIX_CHAVE?.trim();
  const nome = process.env.APOIO_PIX_NOME?.trim();
  const cidade = process.env.APOIO_PIX_CIDADE?.trim();
  if (!chave || !nome || !cidade) return null;
  try {
    return {
      chave: normalizarChave(chave),
      rotuloChave: ROTULO_CHAVE[tipoDaChave(chave)],
      nome,
      cidade,
      copiaECola: gerarPix({ chave, nome, cidade, mensagem: MENSAGEM_PIX }),
    };
  } catch {
    return null;
  }
}

export function getApoio(): ApoioConfig {
  const candidatos: (Omit<LinkApoio, "url"> & { url: string | null })[] = [
    {
      id: "github-sponsors",
      nome: "GitHub Sponsors",
      descricao: "Apoio mensal ou único pelo GitHub, com cartão de crédito.",
      url: urlValida(process.env.APOIO_GITHUB_SPONSORS_URL),
    },
    {
      id: "apoia-se",
      nome: "Apoia.se",
      descricao: "Apoio mensal em reais, com cartão, boleto ou Pix.",
      url: urlValida(process.env.APOIO_APOIASE_URL),
    },
  ];
  return {
    pix: lerPix(),
    links: candidatos.flatMap((l) => (l.url ? [{ ...l, url: l.url }] : [])),
    repositorio: urlValida(process.env.NEXT_PUBLIC_REPOSITORIO_URL) ?? "https://github.com/N7thz/jabuti",
  };
}

/** Há alguma forma de doar dinheiro configurada? */
export const temApoioFinanceiro = (apoio: ApoioConfig) => apoio.pix !== null || apoio.links.length > 0;

/** O que vai para os componentes do navegador (dialogs): só strings e números, sem o copia e cola pronto. */
export interface ApoioPublico {
  pix: { chave: string; rotuloChave: string; nome: string; cidade: string; mensagem: string; valores: readonly number[] } | null;
  links: LinkApoio[];
  repositorio: string;
}

export function apoioPublico(apoio: ApoioConfig = getApoio()): ApoioPublico {
  const { pix } = apoio;
  return {
    pix: pix && { chave: pix.chave, rotuloChave: pix.rotuloChave, nome: pix.nome, cidade: pix.cidade, mensagem: MENSAGEM_PIX, valores: VALORES_SUGERIDOS },
    links: apoio.links,
    repositorio: apoio.repositorio,
  };
}
