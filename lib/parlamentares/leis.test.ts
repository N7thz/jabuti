// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import type { ProcessoApi, RelatoriaApi } from "@/lib/senado/types";

import { leisDeAutoriaSenado, leisRelatadasSenado, papelNaAutoria, papelNaCamara, virouLeiNaCamara } from "./leis";

test("papelNaAutoria: o primeiro nome da autoria é o autor; os outros, coautores", () => {
  expect(papelNaAutoria("Senador Randolfe Rodrigues (PSOL/AP)", "Randolfe Rodrigues")).toBe("autor");
  expect(papelNaAutoria("Senador Randolfe Rodrigues (PSOL/AP) e outros.", "Randolfe Rodrigues")).toBe("autor");
  expect(papelNaAutoria("Senador Marcelo Crivella (REPUBLICANOS/RJ) e outros.", "Randolfe Rodrigues")).toBe("coautor");
  expect(papelNaAutoria("Senadora Ana Amélia (PP/RS), Senador Randolfe Rodrigues (REDE/AP)", "Randolfe Rodrigues")).toBe("coautor");
  expect(papelNaAutoria("Senadora Damares Alves (REPUBLICANOS/DF)", "Damares Alves")).toBe("autor");
});

const processo = (p: Partial<ProcessoApi>): ProcessoApi => ({
  id: 1,
  codigoMateria: 10,
  identificacao: "PL 1/2025",
  ementa: "Ementa.",
  autoria: "Senador Fulano de Tal (PT/RS)",
  dataApresentacao: "2025-01-01",
  ...p,
});

test("leisDeAutoriaSenado fica só com leis, sem repetir a norma, da mais nova para a mais antiga", () => {
  const leis = leisDeAutoriaSenado(
    [
      processo({ id: 1, identificacao: "MPV 1/2024", normaGerada: "Lei nº 15.000 de 10/01/2025" }),
      processo({ id: 2, identificacao: "PLV 3/2024", normaGerada: "Lei nº 15.000 de 10/01/2025" }),
      processo({ id: 3, identificacao: "RQS 89/2011" }),
      processo({ id: 4, identificacao: "PRS 5/2012", normaGerada: "Resolução do Senado Federal nº 35 de 14/08/2013" }),
      processo({ id: 5, identificacao: "PEC 3/2026", normaGerada: "Emenda Constitucional nº 140 de 02/03/2026", autoria: "Senadora Outra (PL/DF) e outros." }),
      processo({ id: 6, identificacao: "PL 9/2025", normaGerada: "Lei nº 15.100 de 01/06/2025", situacaoAtual: "TRANSFORMADA EM NORMA JURÍDICA COM VETO PARCIAL" }),
    ],
    "Fulano de Tal",
  );
  expect(leis.map((l) => [l.identificacao, l.papel, l.comVeto])).toEqual([
    ["PEC 3/2026", "coautor", false],
    ["PL 9/2025", "autor", true],
    ["MPV 1/2024", "autor", false],
  ]);
  expect(leis[0].norma).toBe("Emenda Constitucional nº 140, de 02/03/2026");
});

const relatoria = (r: Partial<RelatoriaApi>): RelatoriaApi => ({
  id: 1,
  idProcesso: 100,
  codigoMateria: 10,
  identificacaoProcesso: "PL 5/2024",
  ementaProcesso: "Ementa.",
  autoriaProcesso: "Câmara dos Deputados",
  dataApresentacaoProcesso: "2024-03-01 10:00:00",
  dataDesignacao: "2024-04-01 00:00:00",
  descricaoTipoRelator: "Relator",
  siglaColegiado: "CAS",
  nomeColegiado: "Comissão de Assuntos Sociais",
  ...r,
});

test("leisRelatadasSenado: um item por processo, com o colegiado mais recente, sem outorgas nem o que ele já é autor", () => {
  const leis = leisRelatadasSenado(
    [
      { relatoria: relatoria({ id: 1, siglaColegiado: "CAS", dataDesignacao: "2024-04-01 00:00:00" }), comVeto: false },
      { relatoria: relatoria({ id: 2, siglaColegiado: "PLEN", dataDesignacao: "2024-06-01 00:00:00" }), comVeto: false },
      { relatoria: relatoria({ id: 3, idProcesso: 200, identificacaoProcesso: "PDS 52/2015" }), comVeto: false },
      { relatoria: relatoria({ id: 4, idProcesso: 300, identificacaoProcesso: "PL 9/2025" }), comVeto: true },
    ],
    new Set(["PL 9/2025"]),
  );
  expect(leis).toHaveLength(1);
  expect(leis[0]).toMatchObject({ identificacao: "PL 5/2024", papel: "relator", colegiado: "Plenário", data: "2024-03-01" });
});

test("Câmara: situação de lei e autor pela ordem de assinatura", () => {
  expect(virouLeiNaCamara("Transformado em Norma Jurídica")).toBe(true);
  expect(virouLeiNaCamara("Transformado em Norma Jurídica com Veto Parcial")).toBe(true);
  expect(virouLeiNaCamara("Arquivada")).toBe(false);
  const autores = [
    { uri: "https://dadosabertos.camara.leg.br/api/v2/deputados/1", nome: "A", tipo: "Deputado(a)", ordemAssinatura: 1, proponente: 1 },
    { uri: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554", nome: "B", tipo: "Deputado(a)", ordemAssinatura: 2, proponente: 1 },
  ];
  expect(papelNaCamara(autores, 1)).toBe("autor");
  expect(papelNaCamara(autores, 204554)).toBe("coautor");
  // "deputados/12" não pode casar com "deputados/1".
  expect(papelNaCamara(autores, 12)).toBe("coautor");
});
