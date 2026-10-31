import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createFetcher, NA_PAGINA } from "@/lib/sync/run";

import { despesaPorFuncao, receitaRealizada, type LinhaDca } from "./contas";
import { balancoOrcamentario, despesaPorFuncaoLoa, receitaCorrenteLiquida, type LinhaRreo } from "./rreo";

const BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";
// Listas e relatórios grandes: timeout maior que o padrão das páginas, mas desiste logo se a fonte estiver fora.
const get = createFetcher({ minIntervalMs: 200, ...NA_PAGINA, timeoutMs: 60_000 });

type RespostaOrds<T> = { items: T[]; hasMore: boolean };

async function dca(idEnte: number, ano: number, anexo: "DCA-Anexo I-C" | "DCA-Anexo I-E") {
  const url = new URL(`${BASE}/dca`);
  url.searchParams.set("an_exercicio", String(ano));
  url.searchParams.set("no_anexo", anexo);
  url.searchParams.set("id_ente", String(idEnte));
  return (await get<RespostaOrds<LinhaDca>>(url)).items;
}

/**
 * Contas anuais de um município ou estado (código IBGE; estados usam os 2 dígitos da UF):
 * receita realizada e despesa por função, em centavos. Os entes entregam a DCA até abril do ano
 * seguinte, então, se o ano pedido ainda não tiver dados, tenta o anterior. `null` se o ente não entregou.
 */
export async function getContasAnuais(idEnte: number, ano = new Date().getFullYear() - 1) {
  "use cache";
  cacheLife("weeks");
  cacheTag("siconfi", `siconfi:${idEnte}`);

  for (const exercicio of [ano, ano - 1]) {
    const [receitas, despesas] = await Promise.all([dca(idEnte, exercicio, "DCA-Anexo I-C"), dca(idEnte, exercicio, "DCA-Anexo I-E")]);
    if (!receitas.length && !despesas.length) continue;

    const { total, funcoes } = despesaPorFuncao(despesas);
    return {
      ano: exercicio,
      instituicao: (receitas[0] ?? despesas[0]).instituicao,
      receita: receitaRealizada(receitas),
      despesa: total,
      funcoes,
    };
  }
  return null;
}

async function rreoUniao(ano: number, bimestre: number, anexo: "RREO-Anexo 01" | "RREO-Anexo 02" | "RREO-Anexo 03") {
  const url = new URL(`${BASE}/rreo`);
  url.searchParams.set("an_exercicio", String(ano));
  url.searchParams.set("nr_periodo", String(bimestre));
  url.searchParams.set("co_tipo_demonstrativo", "RREO");
  url.searchParams.set("no_anexo", anexo);
  url.searchParams.set("co_esfera", "U");
  url.searchParams.set("id_ente", "1");
  return (await get<RespostaOrds<LinhaRreo>>(url)).items;
}

/**
 * Orçamento federal do ano (LOA) e sua execução até o último bimestre publicado pelo Tesouro (RREO).
 * O relatório sai até 30 dias depois de cada bimestre; procura do 6º para o 1º e, no começo do ano,
 * cai no ano anterior completo. `null` se nada foi publicado.
 */
export async function getLoaUniao(ano = new Date().getFullYear()) {
  "use cache";
  cacheLife("days");
  cacheTag("siconfi", `loa:${ano}`);

  for (const exercicio of [ano, ano - 1]) {
    for (let bimestre = 6; bimestre >= 1; bimestre--) {
      const anexo1 = await rreoUniao(exercicio, bimestre, "RREO-Anexo 01");
      if (!anexo1.length) continue;
      const [anexo2, anexo3] = await Promise.all([
        rreoUniao(exercicio, bimestre, "RREO-Anexo 02"),
        rreoUniao(exercicio, bimestre, "RREO-Anexo 03"),
      ]);
      return {
        ano: exercicio,
        bimestre,
        ...balancoOrcamentario(anexo1),
        funcoes: despesaPorFuncaoLoa(anexo2),
        rcl: receitaCorrenteLiquida(anexo3, exercicio),
      };
    }
  }
  return null;
}
