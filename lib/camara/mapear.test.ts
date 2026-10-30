// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { TipoVoto } from "../generated/prisma/enums";
import { escolherProposicao, eventoContaPresenca, mapearDeputado, mapearDespesa, mapearTipoVoto, mapearVoto } from "./mapear";
import type { DeputadoResumo, Despesa, Evento, ProposicaoResumo, Votacao, VotacaoDetalhe } from "./types";

// Fixtures no formato de dadosabertos.camara.leg.br/api/v2 (só os campos que o mapeamento lê).

const deputado: DeputadoResumo = {
  id: 204379,
  nome: "Acácio Favacho",
  siglaPartido: "MDB",
  siglaUf: "AP",
  idLegislatura: 57,
  urlFoto: "https://www.camara.leg.br/internet/deputado/bandep/204379.jpg",
  email: "dep.acaciofavacho@camara.leg.br",
};

const votacao: Votacao = {
  id: "2455564-65",
  data: "2025-06-18",
  dataHoraRegistro: "2025-06-18T19:32:10",
  siglaOrgao: "PLEN",
  uriEvento: "https://dadosabertos.camara.leg.br/api/v2/eventos/77001",
  proposicaoObjeto: null,
  uriProposicaoObjeto: null,
  descricao: "Aprovado o requerimento.",
  aprovacao: 1,
};

const proposicao = (id: number): ProposicaoResumo => ({
  id,
  siglaTipo: "PL",
  numero: id % 1000,
  ano: 2025,
  ementa: "Ementa",
  dataApresentacao: "2025-03-10T10:00",
});

const detalhe = (afetadas: number[], possiveis: number[]): VotacaoDetalhe => ({
  id: votacao.id,
  data: votacao.data,
  dataHoraRegistro: votacao.dataHoraRegistro,
  siglaOrgao: votacao.siglaOrgao,
  descricao: votacao.descricao,
  aprovacao: votacao.aprovacao,
  idEvento: 77001,
  proposicoesAfetadas: afetadas.map(proposicao),
  objetosPossiveis: possiveis.map(proposicao),
});

const evento = (descricaoTipo: string, situacao: string | null): Evento => ({
  id: 77001,
  dataHoraInicio: "2025-06-18T14:00",
  dataHoraFim: null,
  situacao,
  descricaoTipo,
  descricao: null,
  localExterno: null,
  localCamara: { nome: "Plenário Ulysses Guimarães" },
  orgaos: [{ id: 180, sigla: "PLEN", nome: "Plenário", tipoOrgao: "Plenário" }],
  urlRegistro: null,
});

const despesa: Despesa = {
  ano: 2025,
  mes: 5,
  tipoDespesa: "COMBUSTÍVEIS E LUBRIFICANTES.",
  codDocumento: "7891234",
  tipoDocumento: "Nota Fiscal Eletrônica",
  dataDocumento: "2025-05-12T00:00:00",
  numDocumento: "000123",
  urlDocumento: "https://www.camara.leg.br/cota-parlamentar/nota-fiscal-eletronica?ideDocumentoFiscal=7891234",
  nomeFornecedor: "POSTO EXEMPLO LTDA",
  cnpjCpfFornecedor: "12345678000190",
  valorLiquido: 250.5,
};

describe("mapearTipoVoto", () => {
  test.each([
    ["Sim", TipoVoto.SIM],
    ["Não", TipoVoto.NAO],
    ["Nao", TipoVoto.NAO],
    ["Abstenção", TipoVoto.ABSTENCAO],
    ["Obstrução", TipoVoto.OBSTRUCAO],
    // Artigo 17 do Regimento: quem preside a sessão não vota.
    ["Artigo 17", TipoVoto.PRESIDENTE],
    ["  SIM ", TipoVoto.SIM],
    ["Branco", TipoVoto.OUTRO],
    ["", TipoVoto.OUTRO],
  ])("%p -> %p", (texto: string, esperado: TipoVoto) => {
    expect(mapearTipoVoto(texto)).toBe(esperado);
  });
});

describe("mapearVoto", () => {
  test("usa o id da Câmara e o partido da data do voto, e guarda o texto original", () => {
    const voto = mapearVoto({
      tipoVoto: "Obstrução",
      dataRegistroVoto: "2025-06-18T19:30:00",
      deputado_: { ...deputado, siglaPartido: "UNIÃO" },
    });
    expect(voto).toEqual({ idDeputado: "204379", tipo: TipoVoto.OBSTRUCAO, votoOriginal: "Obstrução", partido: "UNIÃO" });
  });
});

describe("mapearDeputado", () => {
  test("monta o parlamentar com nome de busca sem acento", () => {
    expect(mapearDeputado(deputado, true)).toEqual({
      casa: "CAMARA",
      idExterno: "204379",
      nome: "Acácio Favacho",
      nomeBusca: "ACACIO FAVACHO",
      partido: "MDB",
      uf: "AP",
      fotoUrl: deputado.urlFoto,
      email: deputado.email,
      emExercicio: true,
    });
  });

  test("UF fora da lista vira null", () => {
    expect(mapearDeputado({ ...deputado, siglaUf: "XX" }, false).uf).toBeNull();
    expect(mapearDeputado({ ...deputado, siglaUf: null }, false).uf).toBeNull();
  });
});

describe("eventoContaPresenca", () => {
  test.each([
    ["Sessão Deliberativa", "Encerrada", true],
    ["Reunião Deliberativa", "Encerrada (Final)", true],
    ["Audiência Pública", "Encerrada", true],
    ["Sessão Deliberativa", "Cancelada", false],
    ["Sessão Deliberativa", "Em Andamento", false],
    ["Sessão Deliberativa", null, false],
    ["Seminário", "Encerrada", false],
    ["Outro Evento", "Encerrada", false],
  ])("%p / %p -> %p", (tipo: string, situacao: string | null, esperado: boolean) => {
    expect(eventoContaPresenca(evento(tipo, situacao))).toBe(esperado);
  });
});

describe("mapearDespesa", () => {
  test("usa o codDocumento como id e grava o valor com 2 casas", () => {
    const d = mapearDespesa(despesa);
    expect(d.idExterno).toBe("7891234");
    expect(d.valorLiquido).toBe("250.50");
    expect(d.dataDocumento).toEqual(new Date("2025-05-12T00:00:00Z"));
    expect(d).toMatchObject({ ano: 2025, mes: 5, fornecedor: "POSTO EXEMPLO LTDA", cpfCnpjFornecedor: "12345678000190" });
  });

  test("sem codDocumento, monta uma chave estável com data, fornecedor, valor e número", () => {
    const semDoc = { ...despesa, codDocumento: "0" };
    expect(mapearDespesa(semDoc).idExterno).toBe("sem-doc|2025-05-12|12345678000190|250.50|000123|COMBUSTÍVEIS E LUBRIFICANTES.");
    expect(mapearDespesa({ ...semDoc, codDocumento: null }).idExterno).toBe(mapearDespesa(semDoc).idExterno);
  });

  test("sem data do documento fica null", () => {
    expect(mapearDespesa({ ...despesa, dataDocumento: null }).dataDocumento).toBeNull();
  });
});

describe("escolherProposicao", () => {
  test("prefere a proposição objeto da lista", () => {
    const comObjeto = { ...votacao, uriProposicaoObjeto: "https://dadosabertos.camara.leg.br/api/v2/proposicoes/2483452" };
    expect(escolherProposicao(comObjeto, detalhe([1], [2]))).toBe(2483452);
  });

  test("sem objeto e sem detalhe, não há proposição", () => {
    expect(escolherProposicao(votacao, null)).toBeNull();
  });

  test("usa a primeira afetada; objetosPossiveis só quando for um único", () => {
    expect(escolherProposicao(votacao, detalhe([111, 222], [333]))).toBe(111);
    expect(escolherProposicao(votacao, detalhe([], [333]))).toBe(333);
    expect(escolherProposicao(votacao, detalhe([], [333, 444]))).toBeNull();
  });
});
