// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { fatorIpca, lerSerieIpca } from "./ipca";
import { casarEleicoes, type Pessoa } from "./patrimonio";

// Recortes no formato de consulta_cand, com documentos inventados.
const linha = (c: Record<string, string>) => ({
  NR_TURNO: "1",
  SG_UF: "SP",
  SG_UE: "SP",
  NM_UE: "SÃO PAULO",
  DS_CARGO: "DEPUTADO FEDERAL",
  SG_PARTIDO: "PSB",
  DS_SITUACAO_CANDIDATURA: "APTO",
  DS_SIT_TOT_TURNO: "NÃO ELEITO",
  NR_CPF_CANDIDATO: "-4",
  NR_TITULO_ELEITORAL_CANDIDATO: "-4",
  ...c,
});

const pessoa: Pessoa = { parlamentarId: "p1", ano: 2022, sqCandidato: "250001", cpf: "01234567890" };

describe("casarEleicoes", () => {
  test("casa por CPF, aprende o título e casa 2024 (CPF mascarado) pelo título", async () => {
    const eleicoes = await casarEleicoes(
      [
        { ano: 2018, linhas: [linha({ SQ_CANDIDATO: "180001", NR_CPF_CANDIDATO: "1234567890", DS_SIT_TOT_TURNO: "SUPLENTE" })] },
        {
          ano: 2022,
          linhas: [
            linha({ SQ_CANDIDATO: "250001", NR_CPF_CANDIDATO: "01234567890", NR_TITULO_ELEITORAL_CANDIDATO: "2743142402" }),
          ],
        },
        {
          ano: 2024,
          linhas: [
            linha({
              SQ_CANDIDATO: "240001",
              SG_UE: "71072",
              DS_CARGO: "PREFEITO",
              NR_TITULO_ELEITORAL_CANDIDATO: "002743142402",
            }),
            linha({ SQ_CANDIDATO: "240001", SG_UE: "71072", DS_CARGO: "PREFEITO", NR_TURNO: "2" }),
          ],
        },
      ],
      [pessoa],
    );
    expect(eleicoes.map((e) => [e.ano, e.sqCandidato, e.cargo, e.municipio])).toEqual([
      [2018, "180001", "DEPUTADO FEDERAL", null],
      [2022, "250001", "DEPUTADO FEDERAL", null],
      [2024, "240001", "PREFEITO", "SÃO PAULO"],
    ]);
  });

  test("nunca casa por nome, e o SQ do mandato acha a linha mesmo sem CPF", async () => {
    const semCpf: Pessoa = { ...pessoa, cpf: null };
    const eleicoes = await casarEleicoes(
      [
        { ano: 2018, linhas: [linha({ SQ_CANDIDATO: "180001", NM_CANDIDATO: "FULANO DE TAL" })] },
        { ano: 2022, linhas: [linha({ SQ_CANDIDATO: "250001", NM_CANDIDATO: "FULANO DE TAL" })] },
      ],
      [semCpf],
    );
    expect(eleicoes.map((e) => e.ano)).toEqual([2022]);
  });

  test("no ano do mandato fica a candidatura do mandato; nos outros, a apta e eleita", async () => {
    const eleicoes = await casarEleicoes(
      [
        {
          ano: 2020,
          linhas: [
            linha({ SQ_CANDIDATO: "200001", NR_CPF_CANDIDATO: "01234567890", DS_SITUACAO_CANDIDATURA: "INAPTO" }),
            linha({ SQ_CANDIDATO: "200002", NR_CPF_CANDIDATO: "01234567890" }),
            linha({ SQ_CANDIDATO: "200003", NR_CPF_CANDIDATO: "01234567890", DS_SIT_TOT_TURNO: "ELEITO" }),
          ],
        },
        {
          ano: 2022,
          linhas: [
            linha({ SQ_CANDIDATO: "250001", NR_CPF_CANDIDATO: "01234567890", DS_SITUACAO_CANDIDATURA: "INAPTO" }),
            linha({ SQ_CANDIDATO: "250009", NR_CPF_CANDIDATO: "01234567890", DS_SIT_TOT_TURNO: "ELEITO" }),
          ],
        },
      ],
      [pessoa],
    );
    expect(eleicoes.map((e) => [e.ano, e.sqCandidato])).toEqual([
      [2020, "200003"],
      [2022, "250001"],
    ]);
  });
});

describe("fatorIpca", () => {
  const serie = lerSerieIpca([
    { data: "01/08/2022", valor: "-0.36" },
    { data: "01/09/2022", valor: "-0.29" },
    { data: "01/10/2022", valor: "0.59" },
    { data: "01/11/2022", valor: "0.41" },
  ]);

  test("acumula de setembro do ano da eleição até o último mês", () => {
    expect(fatorIpca(serie, 2022)).toBeCloseTo((1 - 0.0029) * 1.0059 * 1.0041, 10);
  });

  test("sem setembro do ano na série não corrige", () => {
    expect(fatorIpca(serie, 2018)).toBeNull();
    expect(fatorIpca(serie, 2024)).toBeNull();
  });
});
