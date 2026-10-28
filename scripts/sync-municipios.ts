/**
 * Carga dos municípios do IBGE, base para interpretar a localidade das emendas,
 * com a estimativa de população mais recente (emenda por habitante).
 * Uso: bun scripts/sync-municipios.ts
 */
import { buscarMunicipiosIbge, sincronizarMunicipios } from "@/lib/emendas/municipios";
import { buscarPopulacaoIbge, sincronizarPopulacao } from "@/lib/ibge/populacao";
import { createPrisma } from "@/lib/prisma";
import { registrarSync } from "@/lib/sync/run";

const prisma = createPrisma();

try {
  const registros = await registrarSync(prisma, "MUNICIPIOS", null, async () => {
    const municipios = await buscarMunicipiosIbge();
    console.log(`IBGE: ${municipios.length} municípios`);
    const gravados = await sincronizarMunicipios(prisma, municipios);

    const populacoes = await buscarPopulacaoIbge();
    console.log(`IBGE: população de ${populacoes.length} municípios (estimativa ${populacoes[0]?.ano ?? "?"})`);
    return gravados + (await sincronizarPopulacao(prisma, populacoes));
  });
  console.log(`Municípios criados/atualizados: ${registros}`);
} finally {
  await prisma.$disconnect();
}
