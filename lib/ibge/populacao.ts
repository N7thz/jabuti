import type { PrismaClient } from "../prisma";
import { createFetcher } from "../sync/run";

// SIDRA, agregado 6579 (estimativas de população), variável 9324 (população residente estimada).
// Período -1 = estimativa mais recente; N6[all] = todos os municípios numa chamada só.
const SIDRA_URL = "https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[all]";

type SerieSidra = { localidade: { id: string }; serie: Record<string, string> };
type RespostaSidra = { resultados: { series: SerieSidra[] }[] }[];

export type PopulacaoMunicipio = { ibge: number; populacao: number; ano: number };

/** Extrai código IBGE, população e ano da resposta do SIDRA; ignora valores ausentes ("-", "...", "X"). */
export function lerPopulacaoSidra(resposta: RespostaSidra): PopulacaoMunicipio[] {
  return resposta.flatMap((variavel) =>
    variavel.resultados.flatMap((resultado) =>
      resultado.series.flatMap(({ localidade, serie }) => {
        const [ano, valor] = Object.entries(serie)[0] ?? [];
        const populacao = Number(valor);
        if (!ano || !Number.isInteger(populacao) || populacao <= 0) return [];
        return [{ ibge: Number(localidade.id), populacao, ano: Number(ano) }];
      }),
    ),
  );
}

/** Estimativa de população mais recente dos 5.570 municípios. */
export async function buscarPopulacaoIbge() {
  return lerPopulacaoSidra(await createFetcher({ timeoutMs: 60_000 })<RespostaSidra>(SIDRA_URL));
}

/** Grava a população nos municípios já carregados; só atualiza os que mudaram. Devolve quantos gravou. */
export async function sincronizarPopulacao(prisma: PrismaClient, populacoes?: PopulacaoMunicipio[]) {
  const fonte = populacoes ?? (await buscarPopulacaoIbge());
  const atuais = new Map(
    (await prisma.municipio.findMany({ select: { ibge: true, populacao: true, populacaoAno: true } })).map((m) => [
      m.ibge,
      `${m.populacao}|${m.populacaoAno}`,
    ]),
  );

  const alterados = fonte.filter((p) => atuais.has(p.ibge) && atuais.get(p.ibge) !== `${p.populacao}|${p.ano}`);
  // Um UPDATE por lote via unnest: 5.570 updates soltos (ou numa transação) estouram o tempo no Neon.
  for (let i = 0; i < alterados.length; i += 2000) {
    const lote = alterados.slice(i, i + 2000);
    await prisma.$executeRaw`
      UPDATE "Municipio" AS m SET "populacao" = v.populacao, "populacaoAno" = v.ano
      FROM unnest(${lote.map((p) => p.ibge)}::int[], ${lote.map((p) => p.populacao)}::int[], ${lote.map((p) => p.ano)}::int[])
        AS v(ibge, populacao, ano)
      WHERE m."ibge" = v.ibge`;
  }
  return alterados.length;
}
