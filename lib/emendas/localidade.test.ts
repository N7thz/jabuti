// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { normalizarNome } from "../sync/run";
import type { Uf } from "../generated/prisma/enums";
import { APELIDOS_MUNICIPIOS, criarIndiceMunicipios, interpretarLocalidade, pareceMunicipioOuUf } from "./localidade";

// Recorte real da lista do IBGE (código, nome oficial, UF).
const MUNICIPIOS: [number, string, Uf][] = [
  [4113700, "Londrina", "PR"],
  [3509502, "Campinas", "SP"],
  [3550308, "São Paulo", "SP"],
  [5300108, "Brasília", "DF"],
  [5002704, "Campo Grande", "MS"],
  [2401305, "Campo Grande", "RN"],
  [2701506, "Campo Grande", "AL"],
  [2511103, "Santa Luzia", "PB"],
  [3157807, "Santa Luzia", "MG"],
  [3545803, "Santa Bárbara d'Oeste", "SP"],
  [1100015, "Alta Floresta D'Oeste", "RO"],
  [3515103, "Embu-Guaçu", "SP"],
  [3506607, "Biritiba Mirim", "SP"],
  [3536307, "Pariquera-Açu", "SP"],
  [4317103, "Sant'Ana do Livramento", "RS"],
  [2922250, "Muquém do São Francisco", "BA"],
  [3303807, "Paraty", "RJ"],
  [2306306, "Itapajé", "CE"],
  [3515004, "Embu das Artes", "SP"],
  [1400605, "São Luiz do Anauá", "RR"],
  [1502954, "Eldorado do Carajás", "PA"],
  [2400208, "Assú", "RN"],
];

const indice = criarIndiceMunicipios(
  MUNICIPIOS.map(([ibge, nome, uf]) => ({ ibge, nomeBusca: normalizarNome(nome), uf })),
);
const interpretar = (texto: string | null | undefined) => interpretarLocalidade(texto, indice);

describe("município: NOME - UF", () => {
  test("caso simples", () => {
    expect(interpretar("LONDRINA - PR")).toEqual({ abrangencia: "MUNICIPIO", uf: "PR", municipioIbge: 4113700 });
    expect(interpretar("CAMPINAS - SP")).toEqual({ abrangencia: "MUNICIPIO", uf: "SP", municipioIbge: 3509502 });
  });

  test("acentos e capital com nome igual ao estado", () => {
    expect(interpretar("SÃO PAULO - SP").municipioIbge).toBe(3550308);
    expect(interpretar("BRASÍLIA - DF").municipioIbge).toBe(5300108);
  });

  test("homônimos: a UF do texto decide", () => {
    expect(interpretar("CAMPO GRANDE - MS").municipioIbge).toBe(5002704);
    expect(interpretar("CAMPO GRANDE - RN").municipioIbge).toBe(2401305);
    expect(interpretar("CAMPO GRANDE - AL").municipioIbge).toBe(2701506);
    expect(interpretar("SANTA LUZIA - PB").municipioIbge).toBe(2511103);
    expect(interpretar("SANTA LUZIA - MG").municipioIbge).toBe(3157807);
  });

  test("homônimo em UF onde não existe não é chutado", () => {
    expect(interpretar("CAMPO GRANDE - SP")).toEqual({ abrangencia: "NAO_INFORMADA", uf: "SP", municipioIbge: null });
  });

  test("apóstrofo (D'OESTE) com e sem espaço", () => {
    expect(interpretar("SANTA BÁRBARA D'OESTE - SP").municipioIbge).toBe(3545803);
    expect(interpretar("ALTA FLORESTA D'OESTE - RO").municipioIbge).toBe(1100015);
    expect(interpretar("ALTA FLORESTA DOESTE - RO").municipioIbge).toBe(1100015);
    expect(interpretar("SANTANA DO LIVRAMENTO - RS").municipioIbge).toBe(4317103);
  });

  test("hífen no nome não confunde o separador da UF", () => {
    expect(interpretar("EMBU-GUAÇU - SP").municipioIbge).toBe(3515103);
    expect(interpretar("PARIQUERA-AÇU - SP").municipioIbge).toBe(3536307);
    // IBGE grafa "Biritiba Mirim", o Portal "BIRITIBA-MIRIM".
    expect(interpretar("BIRITIBA-MIRIM - SP").municipioIbge).toBe(3506607);
  });

  test("grafias antigas via mapa de apelidos", () => {
    expect(interpretar("MUQUÉM DE SÃO FRANCISCO - BA").municipioIbge).toBe(2922250);
    expect(interpretar("EMBU - SP").municipioIbge).toBe(3515004);
    expect(interpretar("SÃO LUIZ - RR").municipioIbge).toBe(1400605);
    expect(interpretar("ELDORADO DOS CARAJÁS - PA").municipioIbge).toBe(1502954);
    expect(interpretar("AÇU - RN").municipioIbge).toBe(2400208);
    for (const chave of Object.keys(APELIDOS_MUNICIPIOS)) {
      const [uf, nome] = chave.split("|");
      expect(interpretar(`${nome} - ${uf}`).abrangencia).toBe("MUNICIPIO");
    }
  });

  test("município desconhecido mantém só a UF do texto", () => {
    expect(interpretar("CIDADE INEXISTENTE - PR")).toEqual({ abrangencia: "NAO_INFORMADA", uf: "PR", municipioIbge: null });
  });

  test("sigla que não é UF", () => {
    expect(interpretar("LONDRINA - XX")).toEqual({ abrangencia: "NAO_INFORMADA", uf: null, municipioIbge: null });
  });
});

describe("estado: NOME (UF)", () => {
  test.each([
    ["CEARÁ (UF)", "CE"],
    ["SÃO PAULO (UF)", "SP"],
    ["DISTRITO FEDERAL (UF)", "DF"],
    ["MATO GROSSO (UF)", "MT"],
    ["MATO GROSSO DO SUL (UF)", "MS"],
    ["RIO GRANDE DO NORTE (UF)", "RN"],
    ["ESPÍRITO SANTO (UF)", "ES"],
    ["PARÁ (UF)", "PA"],
    ["PARANÁ (UF)", "PR"],
    ["PARAÍBA (UF)", "PB"],
  ])("%s", (texto: string, uf: string) => {
    expect(interpretar(texto)).toEqual({ abrangencia: "ESTADO", uf, municipioIbge: null });
  });

  test("nome de estado desconhecido", () => {
    expect(interpretar("GUANABARA (UF)").abrangencia).toBe("NAO_INFORMADA");
  });
});

describe("abrangências sem local único", () => {
  test("Nacional e Exterior", () => {
    expect(interpretar("Nacional")).toEqual({ abrangencia: "NACIONAL", uf: null, municipioIbge: null });
    expect(interpretar("Exterior")).toEqual({ abrangencia: "EXTERIOR", uf: null, municipioIbge: null });
  });

  test.each(["Sul", "Nordeste", "Norte", "Sudeste", "Centro-Oeste", "Região Nordeste", "REGIÃO CENTRO-OESTE"])(
    "região: %s",
    (texto: string) => {
      expect(interpretar(texto)).toEqual({ abrangencia: "REGIAO", uf: null, municipioIbge: null });
    },
  );

  test("MÚLTIPLO vira MULTIPLA (vários locais sem detalhe)", () => {
    expect(interpretar("MÚLTIPLO").abrangencia).toBe("MULTIPLA");
  });

  test.each([undefined, null, "", "   "])("vazio: %p", (texto: string | null | undefined) => {
    expect(interpretar(texto)).toEqual({ abrangencia: "NAO_INFORMADA", uf: null, municipioIbge: null });
  });
});

test("pareceMunicipioOuUf", () => {
  expect(pareceMunicipioOuUf("EMBU-GUAÇU - SP")).toBe(true);
  expect(pareceMunicipioOuUf("CEARÁ (UF)")).toBe(true);
  expect(pareceMunicipioOuUf("Nacional")).toBe(false);
  expect(pareceMunicipioOuUf("MÚLTIPLO")).toBe(false);
});
