// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { casarEleitos, filtrarEleitos, type EleitoTse } from "./eleitos";
import type { Alvo } from "./mapear";

const linha = (campos: Record<string, string>) => ({
  ANO_ELEICAO: "2026",
  NR_TURNO: "1",
  CD_CARGO: "6",
  DS_CARGO: "DEPUTADO FEDERAL",
  SG_UF: "SP",
  SQ_CANDIDATO: "1",
  NM_CANDIDATO: "FULANO DE TAL",
  NM_URNA_CANDIDATO: "FULANO",
  NR_CANDIDATO: "1234",
  SG_PARTIDO: "PT",
  DS_SIT_TOT_TURNO: "ELEITO POR QP",
  NR_CPF_CANDIDATO: "12345678901",
  ...campos,
});

describe("filtrarEleitos", () => {
  test("pega só deputado federal e senador eleitos no ano", async () => {
    const eleitos = await filtrarEleitos(
      [
        linha({ SQ_CANDIDATO: "1" }),
        linha({ SQ_CANDIDATO: "2", DS_SIT_TOT_TURNO: "ELEITO POR MÉDIA" }),
        linha({ SQ_CANDIDATO: "3", DS_SIT_TOT_TURNO: "SUPLENTE" }),
        linha({ SQ_CANDIDATO: "4", DS_SIT_TOT_TURNO: "NÃO ELEITO" }),
        linha({ SQ_CANDIDATO: "5", CD_CARGO: "5", DS_CARGO: "SENADOR", DS_SIT_TOT_TURNO: "ELEITO" }),
        // Suplente de senador "eleito" não ganha a cadeira; governador eleito não é parlamentar.
        linha({ SQ_CANDIDATO: "6", CD_CARGO: "9", DS_CARGO: "1º SUPLENTE", DS_SIT_TOT_TURNO: "ELEITO" }),
        linha({ SQ_CANDIDATO: "7", CD_CARGO: "3", DS_CARGO: "GOVERNADOR", DS_SIT_TOT_TURNO: "ELEITO" }),
        // Deputado só é eleito por QP ou média; "ELEITO" puro não vale para a Câmara.
        linha({ SQ_CANDIDATO: "8", DS_SIT_TOT_TURNO: "ELEITO" }),
        linha({ SQ_CANDIDATO: "9", ANO_ELEICAO: "2022" }),
      ],
      2026,
    );
    expect(eleitos.map((e) => [e.sqCandidato, e.casa, e.resultado])).toEqual([
      ["1", "CAMARA", "ELEITO POR QP"],
      ["2", "CAMARA", "ELEITO POR MÉDIA"],
      ["5", "SENADO", "ELEITO"],
    ]);
  });

  test("deduplica o candidato repetido por turno e normaliza CPF e número", async () => {
    const eleitos = await filtrarEleitos(
      [linha({ NR_CPF_CANDIDATO: "345678901" }), linha({ NR_TURNO: "2" }), linha({ SQ_CANDIDATO: "2", NR_CPF_CANDIDATO: "-4" })],
      2026,
    );
    expect(eleitos).toHaveLength(2);
    expect(eleitos[0]).toEqual({
      ano: 2026,
      casa: "CAMARA",
      uf: "SP",
      sqCandidato: "1",
      nome: "FULANO DE TAL",
      nomeUrna: "FULANO",
      numero: 1234,
      partido: "PT",
      resultado: "ELEITO POR QP",
      cpf: "00345678901",
    });
    expect(eleitos[1].cpf).toBeNull();
  });
});

const eleito = (campos: Partial<EleitoTse>): EleitoTse => ({
  ano: 2026,
  casa: "CAMARA",
  uf: "SP",
  sqCandidato: "1",
  nome: "FULANO DE TAL",
  nomeUrna: "FULANO",
  numero: 1234,
  partido: "PT",
  resultado: "ELEITO POR QP",
  cpf: null,
  ...campos,
});

describe("casarEleitos", () => {
  const alvos: Alvo[] = [
    { id: "dep", casa: "CAMARA", uf: "SP", nomes: ["FULANO DE TAL", "FULANO"], cpf: "11111111111" },
    { id: "sen", casa: "SENADO", uf: "RJ", nomes: ["BELTRANO SILVA", "BELTRANO"], cpf: null },
    { id: "homonimo1", casa: "SENADO", uf: "MG", nomes: ["JOSE"], cpf: null },
    { id: "homonimo2", casa: "SENADO", uf: "MG", nomes: ["JOSE"], cpf: null },
  ];

  test("CPF casa em qualquer Casa: deputado eleito senador", () => {
    const [e] = casarEleitos([eleito({ casa: "SENADO", resultado: "ELEITO", cpf: "11111111111" })], alvos);
    expect(e).toMatchObject({ parlamentarId: "dep", casouPor: "cpf" });
  });

  test("senador sem CPF casa por nome + UF, com acento e caixa normalizados", () => {
    const [e] = casarEleitos([eleito({ casa: "SENADO", uf: "RJ", nome: "Beltrano Silva", nomeUrna: "BÊLTRANO", cpf: "2" })], alvos);
    expect(e).toMatchObject({ parlamentarId: "sen", casouPor: "nome" });
  });

  test("quem tem CPF no banco não casa por nome; outra UF, homônimos ou ninguém ficam sem ligação", () => {
    const r = casarEleitos(
      [
        eleito({ sqCandidato: "a", cpf: "99999999999" }),
        eleito({ sqCandidato: "b", uf: "SP", nome: "BELTRANO SILVA", nomeUrna: "BELTRANO" }),
        eleito({ sqCandidato: "c", uf: "MG", nome: "JOSE", nomeUrna: "JOSE" }),
        eleito({ sqCandidato: "d", nome: "CICLANO", nomeUrna: "CICLANO" }),
      ],
      alvos,
    );
    expect(r.map((e) => [e.sqCandidato, e.parlamentarId, e.casouPor])).toEqual([
      ["a", null, null],
      ["b", null, null],
      ["c", null, null],
      ["d", null, null],
    ]);
  });

  test("mesma pessoa com registro nas duas Casas: vence o da Casa para a qual foi eleita", () => {
    const duplo: Alvo[] = [
      { id: "como-dep", casa: "CAMARA", uf: "BA", nomes: ["X"], cpf: "22222222222" },
      { id: "como-sen", casa: "SENADO", uf: "BA", nomes: ["X"], cpf: "22222222222" },
    ];
    const [e] = casarEleitos([eleito({ casa: "SENADO", uf: "BA", cpf: "22222222222" })], duplo);
    expect(e.parlamentarId).toBe("como-sen");
  });

  test("CPF acha o registro de ex-deputado, mas o de senador (sem CPF) casa por nome + UF e vence", () => {
    const duplo: Alvo[] = [
      { id: "ex-dep", casa: "CAMARA", uf: "DF", nomes: ["CICLANO SOUZA", "CICLANO"], cpf: "33333333333" },
      { id: "senador", casa: "SENADO", uf: "DF", nomes: ["CICLANO SOUZA", "CICLANO"], cpf: null },
    ];
    const [sen, dep] = casarEleitos(
      [
        eleito({ casa: "SENADO", uf: "DF", nome: "CICLANO SOUZA", nomeUrna: "CICLANO", resultado: "ELEITO", cpf: "33333333333" }),
        // Eleito deputado: o CPF já acha o registro da Câmara.
        eleito({ sqCandidato: "2", uf: "DF", nome: "CICLANO SOUZA", nomeUrna: "CICLANO", cpf: "33333333333" }),
      ],
      duplo,
    );
    expect(sen).toMatchObject({ parlamentarId: "senador", casouPor: "nome" });
    expect(dep).toMatchObject({ parlamentarId: "ex-dep", casouPor: "cpf" });
  });

  test("CPF de outra Casa sem registro na Casa da eleição: fica o do CPF", () => {
    const [e] = casarEleitos([eleito({ casa: "SENADO", resultado: "ELEITO", cpf: "11111111111", nome: "OUTRO", nomeUrna: "OUTRO" })], [
      { id: "dep", casa: "CAMARA", uf: "SP", nomes: ["FULANO"], cpf: "11111111111" },
    ]);
    expect(e).toMatchObject({ parlamentarId: "dep", casouPor: "cpf" });
  });
});
