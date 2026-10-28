// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { centavos } from "../format/dinheiro";
import { linhasCsv, numeroTse, vazio } from "./csv";
import { agruparBens, agruparReceitas, agruparVotos, casarCandidaturas, type Alvo, type CandidaturaTse } from "./mapear";
import { candidaturaDoMandato } from "./sync";

async function ler(...pedacos: string[]) {
  const linhas = [];
  for await (const l of linhasCsv((async function* () { yield* pedacos.map((p) => Buffer.from(p, "latin1")); })())) {
    linhas.push(l);
  }
  return linhas;
}

describe("linhasCsv", () => {
  test("lê campos com e sem aspas, aspas dobradas, ; e quebra de linha dentro das aspas", async () => {
    const linhas = await ler('"A";"B";"C"\r\n', '"x ""y""";12;"a;b\nc"\r\n"z";;"fim"');
    expect(linhas).toEqual([
      { A: 'x "y"', B: "12", C: "a;b\nc" },
      { A: "z", B: "", C: "fim" },
    ]);
  });

  test("aceita pedaço cortado no meio do campo e da aspa dobrada", async () => {
    const linhas = await ler('"A";"B"\n"pri', 'meiro "', '"x""";"seg"\n');
    expect(linhas).toEqual([{ A: 'primeiro "x"', B: "seg" }]);
  });

  test("decodifica latin1", async () => {
    expect(await ler('"NOME"\n"JOÃO"\n')).toEqual([{ NOME: "JOÃO" }]);
  });
});

describe("valores do TSE", () => {
  test("nulos e números com vírgula", () => {
    expect(vazio("#NULO#")).toBe(true);
    expect(vazio("NÃO DIVULGÁVEL")).toBe(true);
    expect(vazio("PSOL")).toBe(false);
    expect(numeroTse("180000,00")).toBe(180000);
    expect(numeroTse("74084,57")).toBe(74084.57);
  });
});

// Recortes reais de consulta_cand_2022_AC / consulta_cand_2018_AC, com CPFs trocados.
const cand = (c: Record<string, string>) => ({
  ANO_ELEICAO: "2022",
  NR_TURNO: "1",
  SG_UF: "AC",
  CD_CARGO: "6",
  DS_CARGO: "DEPUTADO FEDERAL",
  SG_PARTIDO: "UNIÃO",
  DS_SITUACAO_CANDIDATURA: "APTO",
  DS_SIT_TOT_TURNO: "ELEITO POR QP",
  NM_SOCIAL_CANDIDATO: "#NULO",
  NR_CANDIDATO: "4455",
  ...c,
});

const alvos: Alvo[] = [
  { id: "dep", casa: "CAMARA", uf: "AC", nomes: ["CORONEL ULYSSES", "ULYSSES FREITAS PEREIRA DE ARAUJO"], cpf: "00000000191" },
  { id: "sen", casa: "SENADO", uf: "AC", nomes: ["SERGIO PETECAO", "SERGIO DE OLIVEIRA CUNHA"] },
];

describe("casarCandidaturas", () => {
  test("deputado casa por CPF mesmo com nome diferente", async () => {
    const [c, ...resto] = await casarCandidaturas(
      [cand({ SQ_CANDIDATO: "1", NM_CANDIDATO: "OUTRO NOME", NM_URNA_CANDIDATO: "X", NR_CPF_CANDIDATO: "00000000191" })],
      alvos,
    );
    expect(resto).toHaveLength(0);
    expect(c).toMatchObject({ parlamentarId: "dep", sqCandidato: "1", casouPor: "cpf", cpf: "00000000191" });
  });

  test("quem tem CPF não casa por nome com homônimo de outro CPF", async () => {
    const r = await casarCandidaturas(
      [cand({ SQ_CANDIDATO: "2", NM_CANDIDATO: "X", NM_URNA_CANDIDATO: "CORONEL ULYSSES", NR_CPF_CANDIDATO: "11111111111" })],
      alvos,
    );
    expect(r).toHaveLength(0);
  });

  test("senador casa pelo nome civil + UF + cargo, e prefere a candidatura eleita", async () => {
    const base = { ANO_ELEICAO: "2018", CD_CARGO: "5", DS_CARGO: "SENADOR", NR_CPF_CANDIDATO: "-4" };
    const r = await casarCandidaturas(
      [
        cand({ ...base, SQ_CANDIDATO: "3", NM_CANDIDATO: "SÉRGIO DE OLIVEIRA CUNHA", NM_URNA_CANDIDATO: "PETECÃO", DS_SIT_TOT_TURNO: "NÃO ELEITO" }),
        cand({ ...base, SQ_CANDIDATO: "4", NM_CANDIDATO: "Sérgio de Oliveira Cunha", NM_URNA_CANDIDATO: "SERGIO PETECAO", DS_SIT_TOT_TURNO: "ELEITO" }),
        // Mesmo nome, mas outra UF e outro cargo: ignorados.
        cand({ ...base, SQ_CANDIDATO: "5", SG_UF: "AM", NM_CANDIDATO: "SERGIO DE OLIVEIRA CUNHA", NM_URNA_CANDIDATO: "Y" }),
        cand({ ...base, SQ_CANDIDATO: "6", CD_CARGO: "3", NM_CANDIDATO: "SERGIO DE OLIVEIRA CUNHA", NM_URNA_CANDIDATO: "Y" }),
      ],
      alvos,
    );
    expect(r.map((c) => [c.parlamentarId, c.sqCandidato, c.ano, c.casouPor, c.cpf])).toEqual([["sen", "4", 2018, "nome", null]]);
  });
});

describe("agrupamentos", () => {
  const sqs = new Set(["10"]);

  test("bens: filtra pelo candidato e resolve ordem repetida", async () => {
    const bens = await agruparBens(
      [
        { SQ_CANDIDATO: "10", NR_ORDEM_BEM_CANDIDATO: "1", DS_TIPO_BEM_CANDIDATO: "Prédio comercial", DS_BEM_CANDIDATO: "Sala ", VR_BEM_CANDIDATO: "180000,00" },
        { SQ_CANDIDATO: "10", NR_ORDEM_BEM_CANDIDATO: "1", DS_TIPO_BEM_CANDIDATO: "#NULO", DS_BEM_CANDIDATO: "Carro", VR_BEM_CANDIDATO: "50,5" },
        { SQ_CANDIDATO: "99", NR_ORDEM_BEM_CANDIDATO: "1", DS_TIPO_BEM_CANDIDATO: "Casa", DS_BEM_CANDIDATO: "Outro", VR_BEM_CANDIDATO: "1,00" },
      ],
      sqs,
    );
    expect([...bens.keys()]).toEqual(["10"]);
    expect(bens.get("10")!.map((b) => [b.ordem, b.tipo, b.descricao, centavos(b.valor)])).toEqual([
      [1, "Prédio comercial", "Sala", 18_000_000],
      [2, "Não informado", "Carro", 5050],
    ]);
  });

  test("receitas: soma por origem, fonte e doador sem guardar CPF", async () => {
    const linha = (doador: string, valor: string, fonte = "OUTROS RECURSOS") => ({
      SQ_CANDIDATO: "10",
      DS_ORIGEM_RECEITA: "Recursos de pessoas físicas",
      DS_FONTE_RECEITA: fonte,
      NR_CPF_CNPJ_DOADOR: "78785162272",
      NM_DOADOR: doador,
      NM_DOADOR_RFB: doador,
      VR_RECEITA: valor,
    });
    const receitas = (await agruparReceitas(
      [linha("Sidnei Mata", "950,00"), linha("SIDNEI MATA", "50,00"), linha("SIDNEI MATA", "10,00", "FUNDO ESPECIAL")],
      sqs,
    )).get("10")!;
    expect(receitas.map((r) => [r.fonte, r.doador, centavos(r.valor), r.lancamentos])).toEqual([
      ["OUTROS RECURSOS", "SIDNEI MATA", 100_000, 2],
      ["FUNDO ESPECIAL", "SIDNEI MATA", 1000, 1],
    ]);
    expect(JSON.stringify(receitas)).not.toContain("78785162272");
  });

  test("votos: soma as zonas do município e ignora 2º turno", async () => {
    const votos = await agruparVotos(
      [
        { SQ_CANDIDATO: "10", NR_TURNO: "1", CD_MUNICIPIO: "1058", QT_VOTOS_NOMINAIS: "18" },
        { SQ_CANDIDATO: "10", NR_TURNO: "1", CD_MUNICIPIO: "1058", QT_VOTOS_NOMINAIS: "2" },
        { SQ_CANDIDATO: "10", NR_TURNO: "1", CD_MUNICIPIO: "1457", QT_VOTOS_NOMINAIS: "5" },
        { SQ_CANDIDATO: "10", NR_TURNO: "2", CD_MUNICIPIO: "1457", QT_VOTOS_NOMINAIS: "100" },
      ],
      sqs,
    );
    expect([...votos.get("10")!]).toEqual([
      [1058, 20],
      [1457, 5],
    ]);
  });
});

describe("candidaturaDoMandato", () => {
  const c = (parlamentarId: string, ano: number, resultado: string | null) =>
    ({ parlamentarId, ano, resultado, sqCandidato: `${parlamentarId}${ano}` }) as CandidaturaTse;

  test("fica a eleita mais recente; eleita vence não eleita mais nova", () => {
    const r = candidaturaDoMandato([
      // Marcos Pontes: 2º suplente eleito em 2018, senador eleito em 2022.
      c("pontes", 2018, "ELEITO"),
      c("pontes", 2022, "ELEITO"),
      c("x", 2018, "ELEITO"),
      c("x", 2022, "NÃO ELEITO"),
    ]);
    expect(r.map((x) => x.sqCandidato)).toEqual(["pontes2022", "x2018"]);
  });
});
