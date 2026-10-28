import type { AbrangenciaEmenda, Uf } from "../generated/prisma/enums";
import { normalizarNome } from "../sync/run";

/**
 * Interpretação de `localidadeDoGasto` do Portal da Transparência.
 * Formatos reais encontrados (amostras de 2016, 2020, 2023-2026):
 * - "LONDRINA - PR"        → MUNICIPIO (nome do município + " - " + sigla da UF)
 * - "CEARÁ (UF)"           → ESTADO (nome da UF por extenso)
 * - "Nacional"             → NACIONAL
 * - "Exterior"             → EXTERIOR
 * - "Sul", "Nordeste"...   → REGIAO (macrorregião do IBGE, com ou sem "Região")
 * - "MÚLTIPLO"             → MULTIPLA (vários locais, sem detalhamento na API)
 * - vazio / ausente        → NAO_INFORMADA
 */

export type LocalidadeInterpretada = {
  abrangencia: AbrangenciaEmenda;
  uf: Uf | null;
  municipioIbge: number | null;
};

type MunicipioIndexavel = { ibge: number; nomeBusca: string; uf: Uf };

/** Índice por UF; `null` marca chave compacta ambígua dentro da UF. */
export type IndiceMunicipios = {
  porNome: Map<Uf, Map<string, number>>;
  porCompacto: Map<Uf, Map<string, number | null>>;
};

const UF_POR_NOME: Record<string, Uf> = {
  ACRE: "AC",
  ALAGOAS: "AL",
  AMAPA: "AP",
  AMAZONAS: "AM",
  BAHIA: "BA",
  CEARA: "CE",
  "DISTRITO FEDERAL": "DF",
  "ESPIRITO SANTO": "ES",
  GOIAS: "GO",
  MARANHAO: "MA",
  "MATO GROSSO": "MT",
  "MATO GROSSO DO SUL": "MS",
  "MINAS GERAIS": "MG",
  PARA: "PA",
  PARAIBA: "PB",
  PARANA: "PR",
  PERNAMBUCO: "PE",
  PIAUI: "PI",
  "RIO DE JANEIRO": "RJ",
  "RIO GRANDE DO NORTE": "RN",
  "RIO GRANDE DO SUL": "RS",
  RONDONIA: "RO",
  RORAIMA: "RR",
  "SANTA CATARINA": "SC",
  "SAO PAULO": "SP",
  SERGIPE: "SE",
  TOCANTINS: "TO",
};

const UF_POR_SIGLA = new Map<string, Uf>(Object.values(UF_POR_NOME).map((uf) => [uf, uf]));

const REGIOES = new Set(["NORTE", "NORDESTE", "SUL", "SUDESTE", "CENTRO OESTE"]);

/**
 * Grafias do Portal que não batem com o nome atual do IBGE (municípios renomeados ou grafia antiga).
 * Chave: "UF|nome normalizado no Portal"; valor: nome normalizado no IBGE.
 */
export const APELIDOS_MUNICIPIOS: Record<string, string> = {
  // IBGE: "Muquém do São Francisco" (grafia corrigida em 2018).
  "BA|MUQUEM DE SAO FRANCISCO": "MUQUEM DO SAO FRANCISCO",
  // IBGE: "Embu das Artes" (renomeado em 2011).
  "SP|EMBU": "EMBU DAS ARTES",
  // IBGE: "São Luiz do Anauá"; o Portal usa a forma curta.
  "RR|SAO LUIZ": "SAO LUIZ DO ANAUA",
  // IBGE: "Eldorado do Carajás".
  "PA|ELDORADO DOS CARAJAS": "ELDORADO DO CARAJAS",
  // IBGE: "Assú" (grafia oficial desde 2017; o Portal ainda usa "Açu").
  "RN|ACU": "ASSU",
};

/** Chave sem espaços: absorve "D'OESTE" x "DOESTE", "SANT'ANA" x "SANTANA" etc. */
const compactar = (nomeBusca: string) => nomeBusca.replace(/ /g, "");

export function criarIndiceMunicipios(municipios: Iterable<MunicipioIndexavel>): IndiceMunicipios {
  const porNome = new Map<Uf, Map<string, number>>();
  const porCompacto = new Map<Uf, Map<string, number | null>>();

  for (const m of municipios) {
    if (!porNome.has(m.uf)) porNome.set(m.uf, new Map());
    if (!porCompacto.has(m.uf)) porCompacto.set(m.uf, new Map());
    porNome.get(m.uf)!.set(m.nomeBusca, m.ibge);

    const compactos = porCompacto.get(m.uf)!;
    const chave = compactar(m.nomeBusca);
    compactos.set(chave, compactos.has(chave) ? null : m.ibge);
  }

  return { porNome, porCompacto };
}

const NAO_INFORMADA: LocalidadeInterpretada = { abrangencia: "NAO_INFORMADA", uf: null, municipioIbge: null };

function buscarMunicipio(indice: IndiceMunicipios, uf: Uf, nome: string) {
  const nomeIbge = APELIDOS_MUNICIPIOS[`${uf}|${nome}`] ?? nome;
  return (
    indice.porNome.get(uf)?.get(nomeIbge) ?? indice.porCompacto.get(uf)?.get(compactar(nomeIbge)) ?? null
  );
}

/**
 * Converte o texto livre de `localidadeDoGasto` em abrangência, UF e município.
 * Função pura: o que não for reconhecido volta NAO_INFORMADA, nunca um palpite.
 * Homônimos entre UFs são resolvidos sempre pela sigla presente no texto.
 */
export function interpretarLocalidade(
  texto: string | null | undefined,
  indice: IndiceMunicipios,
): LocalidadeInterpretada {
  const bruto = texto?.trim() ?? "";
  if (!bruto) return NAO_INFORMADA;

  // "NOME - UF": separa pela última ocorrência de " - " (o nome pode ter hífen, ex.: EMBU-GUAÇU).
  const municipio = /^(.+?)\s+-\s+([A-Za-z]{2})$/.exec(bruto);
  if (municipio) {
    const sigla = municipio[2].toUpperCase();
    const uf = UF_POR_SIGLA.get(sigla);
    if (!uf) return NAO_INFORMADA;

    const ibge = buscarMunicipio(indice, uf, normalizarNome(municipio[1]));
    // UF vem do próprio texto, então é mantida mesmo sem reconhecer o município.
    return ibge === null
      ? { abrangencia: "NAO_INFORMADA", uf, municipioIbge: null }
      : { abrangencia: "MUNICIPIO", uf, municipioIbge: ibge };
  }

  // "NOME DA UF (UF)"
  const estado = /^(.+?)\s*\(UF\)$/i.exec(bruto);
  if (estado) {
    const uf = UF_POR_NOME[normalizarNome(estado[1])];
    return uf ? { abrangencia: "ESTADO", uf, municipioIbge: null } : NAO_INFORMADA;
  }

  const nome = normalizarNome(bruto);
  if (nome === "NACIONAL") return { abrangencia: "NACIONAL", uf: null, municipioIbge: null };
  if (nome === "EXTERIOR") return { abrangencia: "EXTERIOR", uf: null, municipioIbge: null };
  if (nome === "MULTIPLO") return { abrangencia: "MULTIPLA", uf: null, municipioIbge: null };

  const regiao = nome.replace(/^REGIAO /, "");
  if (REGIOES.has(regiao)) return { abrangencia: "REGIAO", uf: null, municipioIbge: null };

  return NAO_INFORMADA;
}


/** Indica se o texto segue o formato de município ("NOME - UF") ou de estado ("NOME (UF)"). */
export function pareceMunicipioOuUf(texto: string | null | undefined) {
  const bruto = texto?.trim() ?? "";
  return /^.+?\s+-\s+[A-Za-z]{2}$/.test(bruto) || /\(UF\)$/i.test(bruto);
}
