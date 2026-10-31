// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { calcularFidelidade, contrariouPartido, orientacaoDoPartido, tipoDaOrientacao } from "./fidelidade";

// Siglas como a Câmara (/votacoes/{id}/orientacoes) e o Senado (orientacaoBancada) publicam.
const camara = [
  { sigla: "Fdr PSOL-REDE", tipo: "SIM" as const },
  { sigla: "PL", tipo: "NAO" as const },
  { sigla: "Bl MdbPsdRepPodePsc", tipo: "SIM" as const },
  { sigla: "Governo", tipo: "SIM" as const },
  { sigla: "Fdr PT-PCdoB-PV", tipo: "SIM" as const },
  { sigla: "NOVO", tipo: null },
  { sigla: "Bl UniPpFdrPsdbCid...", tipo: "OBSTRUCAO" as const },
];

describe("orientacaoDoPartido", () => {
  test("partido com orientação própria", () => {
    expect(orientacaoDoPartido(camara, "PL")?.tipo).toBe("NAO");
  });

  test("partido de federação", () => {
    expect(orientacaoDoPartido(camara, "PCdoB")?.sigla).toBe("Fdr PT-PCdoB-PV");
    expect(orientacaoDoPartido(camara, "REDE")?.sigla).toBe("Fdr PSOL-REDE");
  });

  test("partido dentro de bloco, inclusive abreviado e com sigla cortada", () => {
    expect(orientacaoDoPartido(camara, "REPUBLICANOS")?.sigla).toBe("Bl MdbPsdRepPodePsc");
    expect(orientacaoDoPartido(camara, "PODE")?.sigla).toBe("Bl MdbPsdRepPodePsc");
    expect(orientacaoDoPartido(camara, "UNIÃO")?.sigla).toBe("Bl UniPpFdrPsdbCid...");
    expect(orientacaoDoPartido(camara, "CIDADANIA")?.sigla).toBe("Bl UniPpFdrPsdbCid...");
  });

  test("PSDB não pega o PSD do outro bloco", () => {
    expect(orientacaoDoPartido(camara, "PSDB")?.sigla).toBe("Bl UniPpFdrPsdbCid...");
    expect(orientacaoDoPartido(camara, "PSD")?.sigla).toBe("Bl MdbPsdRepPodePsc");
  });

  test("liberado vem com tipo null; liderança não vale como partido", () => {
    expect(orientacaoDoPartido(camara, "NOVO")?.tipo).toBeNull();
    expect(orientacaoDoPartido([{ sigla: "Governo", tipo: "SIM" }], "GOVERNO")).toBeUndefined();
    expect(orientacaoDoPartido(camara, "PDT")).toBeUndefined();
  });

  test("nomes do Senado", () => {
    const senado = [
      { sigla: "Republica", tipo: "NAO" as const },
      { sigla: "Podemos", tipo: null },
      { sigla: "UNIÃO", tipo: "SIM" as const },
      { sigla: "Banc Fem", tipo: "SIM" as const },
    ];
    expect(orientacaoDoPartido(senado, "REPUBLICANOS")?.tipo).toBe("NAO");
    expect(orientacaoDoPartido(senado, "PODEMOS")?.sigla).toBe("Podemos");
    expect(orientacaoDoPartido(senado, "UNIÃO")?.tipo).toBe("SIM");
  });
});

test("tipoDaOrientacao", () => {
  expect(tipoDaOrientacao("Não")).toBe("NAO");
  expect(tipoDaOrientacao("NÃO")).toBe("NAO");
  expect(tipoDaOrientacao("Obstrução")).toBe("OBSTRUCAO");
  expect(tipoDaOrientacao("Liberado")).toBeNull();
  expect(tipoDaOrientacao("LIVRE")).toBeNull();
});

test("calcularFidelidade ignora liberação, ausência e votação sem orientação", () => {
  const votos = [
    { tipo: "SIM" as const, partido: "PT", orientacoes: camara },
    { tipo: "NAO" as const, partido: "PT", orientacoes: camara },
    { tipo: "SIM" as const, partido: "NOVO", orientacoes: camara },
    { tipo: "AUSENCIA_JUSTIFICADA" as const, partido: "PT", orientacoes: camara },
    { tipo: "SIM" as const, partido: "PT", orientacoes: [] },
  ];
  expect(calcularFidelidade(votos)).toEqual({
    partido: { consideradas: 2, seguiu: 1 },
    governo: { consideradas: 3, seguiu: 2 },
  });
  expect(votos.map(contrariouPartido)).toEqual([false, true, false, false, false]);
});
