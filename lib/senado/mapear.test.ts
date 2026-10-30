// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { SituacaoPresenca, TipoVoto } from "../generated/prisma/enums";
import { mapearComparecimento, mapearDespesa, mapearVoto, siglaConhecida } from "./mapear";
import type { DespesaCeaps, VotoSenador } from "./types";

// Fixtures no formato normalizado de lib/senado/types.ts (dadosabertos e adm-dadosabertos do Senado).

const { PRESENTE, AUSENCIA_JUSTIFICADA, AUSENTE } = SituacaoPresenca;

const voto: VotoSenador = {
  codigoParlamentar: "5672",
  nome: "Leila Barros",
  partido: "PDT",
  uf: "DF",
  sigla: "LS",
  descricao: "Licença saúde",
};

const despesa: DespesaCeaps = {
  id: 2209876,
  tipoDocumento: "Nota Fiscal",
  ano: 2025,
  mes: 4,
  codSenador: 5672,
  nomeSenador: "LEILA BARROS",
  tipoDespesa: " Locomoção, hospedagem, alimentação, combustíveis e lubrificantes ",
  cpfCnpj: "12.345.678/0001-90",
  fornecedor: " HOTEL EXEMPLO ",
  documento: "123",
  data: "2025-04-02",
  detalhamento: null,
  valorReembolsado: 480,
};

describe("mapearComparecimento", () => {
  test.each([
    // Votou ou estava presente
    ["Sim", TipoVoto.SIM, PRESENTE],
    ["Não", TipoVoto.NAO, PRESENTE],
    ["Abstenção", TipoVoto.ABSTENCAO, PRESENTE],
    ["Votou", TipoVoto.VOTO_SECRETO, PRESENTE],
    ["VO", TipoVoto.VOTO_SECRETO, PRESENTE],
    ["P-NRV", TipoVoto.PRESENTE_SEM_VOTO, PRESENTE],
    ["PSF", TipoVoto.OUTRO, PRESENTE],
    ["SF", TipoVoto.OUTRO, PRESENTE],
    ["P-OD", TipoVoto.OBSTRUCAO, PRESENTE],
    ["OB", TipoVoto.OBSTRUCAO, PRESENTE],
    ["Presidente (art. 51 RISF)", TipoVoto.PRESIDENTE, PRESENTE],
    ["PR", TipoVoto.PRESIDENTE, PRESENTE],
    ["PS", TipoVoto.PRESIDENTE, PRESENTE],
    // Ausência justificada: atividade parlamentar, missão e licenças
    ["AP", TipoVoto.AUSENCIA_JUSTIFICADA, AUSENCIA_JUSTIFICADA],
    ["MIS", TipoVoto.AUSENCIA_JUSTIFICADA, AUSENCIA_JUSTIFICADA],
    ["REP", TipoVoto.AUSENCIA_JUSTIFICADA, AUSENCIA_JUSTIFICADA],
    ["LS", TipoVoto.AUSENCIA_JUSTIFICADA, AUSENCIA_JUSTIFICADA],
    ["LP", TipoVoto.AUSENCIA_JUSTIFICADA, AUSENCIA_JUSTIFICADA],
    ["L7", TipoVoto.AUSENCIA_JUSTIFICADA, AUSENCIA_JUSTIFICADA],
    ["NA", TipoVoto.AUSENCIA_JUSTIFICADA, AUSENCIA_JUSTIFICADA],
    ["AUS", TipoVoto.AUSENCIA_JUSTIFICADA, AUSENCIA_JUSTIFICADA],
    // Só "não compareceu" é falta
    ["NCom", TipoVoto.AUSENTE, AUSENTE],
    // Fora da conta: ambígua, fora de exercício, sem voto individual, desconhecida
    ["NR", TipoVoto.OUTRO, null],
    ["AFO", TipoVoto.OUTRO, null],
    ["LL", TipoVoto.OUTRO, null],
    ["NH", TipoVoto.OUTRO, null],
    ["XYZ", TipoVoto.OUTRO, null],
  ])("%p -> %p / %p", (sigla: string, tipo: TipoVoto, presenca: SituacaoPresenca | null) => {
    expect(mapearComparecimento(sigla)).toEqual({ tipo, presenca });
  });

  test("ignora caixa, acento e espaços", () => {
    expect(mapearComparecimento(" nao ")).toEqual({ tipo: TipoVoto.NAO, presenca: PRESENTE });
    expect(mapearComparecimento("ncom")).toEqual({ tipo: TipoVoto.AUSENTE, presenca: AUSENTE });
    expect(mapearComparecimento("ABSTENÇÃO").tipo).toBe(TipoVoto.ABSTENCAO);
  });
});

describe("siglaConhecida", () => {
  test("aponta siglas fora da tabela", () => {
    expect(siglaConhecida("Sim")).toBe(true);
    expect(siglaConhecida("Presidente (art. 51 RISF)")).toBe(true);
    expect(siglaConhecida("NCom")).toBe(true);
    expect(siglaConhecida("XYZ")).toBe(false);
  });
});

describe("mapearVoto", () => {
  test("junta sigla e descrição no voto original", () => {
    expect(mapearVoto(voto)).toEqual({
      codigoParlamentar: "5672",
      tipo: TipoVoto.AUSENCIA_JUSTIFICADA,
      votoOriginal: "LS - Licença saúde",
      partido: "PDT",
    });
  });

  test("sem descrição fica só a sigla", () => {
    expect(mapearVoto({ ...voto, sigla: "Sim", descricao: null })).toMatchObject({ tipo: TipoVoto.SIM, votoOriginal: "Sim" });
  });
});

describe("mapearDespesa", () => {
  test("apara textos e grava o valor com 2 casas", () => {
    expect(mapearDespesa(despesa)).toEqual({
      idExterno: "2209876",
      ano: 2025,
      mes: 4,
      tipoDespesa: "Locomoção, hospedagem, alimentação, combustíveis e lubrificantes",
      fornecedor: "HOTEL EXEMPLO",
      cpfCnpjFornecedor: "12.345.678/0001-90",
      valorLiquido: "480.00",
      dataDocumento: new Date("2025-04-02T00:00:00Z"),
      urlDocumento: null,
    });
  });

  test("estorno negativo, campos vazios e sem data", () => {
    const d = mapearDespesa({ ...despesa, valorReembolsado: -35.4, tipoDespesa: null, fornecedor: " ", cpfCnpj: null, data: null });
    expect(d).toMatchObject({
      valorLiquido: "-35.40",
      tipoDespesa: "Não informado",
      fornecedor: null,
      cpfCnpjFornecedor: null,
      dataDocumento: null,
    });
  });
});
