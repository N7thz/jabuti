// Ideias Legislativas do e-Cidadania: propostas de lei escritas por cidadãos. A ideia que junta 20 mil
// apoios vira Sugestão Legislativa (SUG) e vai para a Comissão de Direitos Humanos (CDH), que pode
// transformá-la em projeto; senadores também podem adotar uma ideia e apresentá-la como projeto seu.
// O Senado não publica isso nos dados abertos: a leitura sai do HTML público, como a da consulta pública.
// Se o HTML mudar, as funções devolvem null ou lista vazia (e a verificação diária avisa, ver
// scripts/verificar-html.ts); a página não inventa dado.

const BASE = "https://www12.senado.leg.br/ecidadania";

/** Lista das ideias que já viraram proposição (situação 10 na pesquisa do e-Cidadania), todas numa página. */
export const URL_IDEIAS_TRANSFORMADAS = `${BASE}/pesquisaideia?situacao=10`;

export const urlIdeia = (id: number) => `${BASE}/visualizacaoideia?id=${id}`;

export interface ResumoIdeia {
  id: number;
  titulo: string;
  apoios: number;
}

/** Como a ideia chegou a uma matéria do Senado. */
export type Caminho =
  /** A ideia gerou a Sugestão Legislativa (a SUG é uma matéria, com consulta pública própria). */
  | { tipo: "sugestao" }
  /** A CDH debateu a sugestão e a transformou em projeto. */
  | { tipo: "comissao" }
  /** Um parlamentar adotou a ideia e apresentou o projeto. */
  | { tipo: "parlamentar"; cargo: string; nome: string; uf: string };

export interface PassoIdeia {
  /** Data do passo, "2023-05-30". */
  data: string;
  /** Código da matéria no Senado (o mesmo `codigoMateria` das leis do portal). */
  codigoMateria: number;
  /** Como a matéria aparece na página: "Projeto de Lei nº 2849, de 2023". */
  materia: string;
  caminho: Caminho;
}

export interface Ideia extends ResumoIdeia {
  passos: PassoIdeia[];
}

const entidades: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
// Letras do português escritas como entidade (&iacute;, &Ccedil;...): o site manda UTF-8, mas nem sempre.
for (const [base, acentos] of Object.entries({ a: "acute grave circ tilde", e: "acute circ", i: "acute", o: "acute circ tilde", u: "acute uml", c: "cedil" })) {
  for (const acento of acentos.split(" ")) {
    for (const letra of [base, base.toUpperCase()]) {
      const marca = { acute: "́", grave: "̀", circ: "̂", tilde: "̃", uml: "̈", cedil: "̧" }[acento];
      entidades[`${letra}${acento}`] = `${letra}${marca}`.normalize("NFC");
    }
  }
}

/** Texto visível de um trecho de HTML: sem tags, entidades decodificadas e espaços normalizados. */
export function textoDe(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[\da-f]+|\w+);/gi, (inteira, nome: string) => {
      if (nome[0] === "#") {
        const codigo = nome[1].toLowerCase() === "x" ? Number.parseInt(nome.slice(2), 16) : Number(nome.slice(1));
        return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : inteira;
      }
      return entidades[nome] ?? entidades[nome.toLowerCase()] ?? inteira;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** "253.804" → 253804. */
const numero = (texto: string) => Number(texto.replace(/\D/g, "") || "0");

/** Cartões da lista de ideias: id, título e apoios confirmados. */
export function lerListaIdeias(html: string): ResumoIdeia[] {
  const ideias: ResumoIdeia[] = [];
  for (const cartao of html.split(/<li[^>]*class="resumo-ideia"/i).slice(1)) {
    const id = cartao.match(/visualizacaoideia\?id=(\d+)/)?.[1];
    const titulo = cartao.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1];
    const apoios = textoDe(cartao).match(/([\d.]+)\s+apoios confirmados/i)?.[1];
    if (id && titulo && apoios) ideias.push({ id: Number(id), titulo: textoDe(titulo), apoios: numero(apoios) });
  }
  return ideias;
}

/**
 * Quem adotou: "Senador Astronauta Marcos Pontes (SP)" → cargo, nome e UF. A página escreve
 * `pel<span>o</span>`, que vira "pel o" no texto, por isso o espaço opcional.
 */
const ADOTADA = /adotada pel\s*[oa]\s+(Senadora?|Deputada?)\s+(.+?)\s*\(([A-Z]{2})\)/i;

function caminhoDo(titulo: string, texto: string): Caminho | null {
  if (/gerou a Sugest/i.test(texto)) return { tipo: "sugestao" };
  if (!/transformad/i.test(titulo)) return null;
  const adotada = texto.match(ADOTADA);
  if (adotada) return { tipo: "parlamentar", cargo: adotada[1], nome: adotada[2], uf: adotada[3] };
  return /CDH|Comiss/i.test(texto) ? { tipo: "comissao" } : null;
}

/**
 * Página de uma ideia: título, apoios e os passos da linha do tempo que levam a uma matéria do Senado
 * (sugestão gerada, projeto da CDH ou projeto de quem adotou a ideia). Página sem linha do tempo, ou que
 * não é de ideia, devolve null.
 */
export function lerIdeia(id: number, html: string): Ideia | null {
  // O <title> é o lugar mais estável: "Ideia Legislativa - <título> :: Portal e-Cidadania - Senado Federal".
  const titulo = textoDe(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").match(/^Ideia Legislativa - (.+?) :: /)?.[1];
  const apoios = textoDe(html).match(/([\d.]+)\s+apoios confirmados/i)?.[1];
  const linhaDoTempo = html.match(/<ol[^>]*class="timeline"[^>]*>([\s\S]*?)<\/ol>/i)?.[1];
  if (!titulo || !apoios || linhaDoTempo === undefined) return null;

  const passos: PassoIdeia[] = [];
  for (const item of linhaDoTempo.split(/<li[^>]*class="timeline-item/i).slice(1)) {
    const data = item.match(/<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/i)?.[1];
    const tituloPasso = textoDe(item.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? "");
    const texto = textoDe(item);
    // Links para matérias no site do Senado. No passo da CDH vêm dois: a sugestão debatida e, por último, o
    // projeto em que ela foi transformada; nos outros, só a matéria do passo.
    const links = [...item.matchAll(/<a[^>]*href="[^"]*\/materia\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const caminho = caminhoDo(tituloPasso, texto);
    const link = caminho?.tipo === "sugestao" ? links[0] : links.at(-1);
    if (data && link && caminho) passos.push({ data, codigoMateria: Number(link[1]), materia: textoDe(link[2]), caminho });
  }
  return { id, titulo, apoios: numero(apoios), passos };
}

export interface OrigemPopular {
  ideia: ResumoIdeia;
  passo: PassoIdeia;
}

/** Índice matéria → ideia de origem. Se duas ideias levarem à mesma matéria, fica a mais apoiada. */
export function indicePorMateria(ideias: Ideia[]): Map<number, OrigemPopular> {
  const indice = new Map<number, OrigemPopular>();
  for (const { passos, ...ideia } of ideias) {
    for (const passo of passos) {
      const atual = indice.get(passo.codigoMateria);
      if (!atual || atual.ideia.apoios < ideia.apoios) indice.set(passo.codigoMateria, { ideia, passo });
    }
  }
  return indice;
}
