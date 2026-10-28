import { Uf } from "../generated/prisma/enums";
import type { PrismaClient } from "../prisma";
import { createFetcher, normalizarNome } from "../sync/run";

const IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";

export type MunicipioIbge = { ibge: number; nome: string; nomeBusca: string; uf: Uf };

type UfIbge = { sigla: string };
type MunicipioIbgeResposta = {
  id: number;
  nome: string;
  microrregiao: { mesorregiao: { UF: UfIbge } } | null;
  "regiao-imediata": { "regiao-intermediaria": { UF: UfIbge } } | null;
};

export function isUf(sigla: string): sigla is Uf {
  return Object.hasOwn(Uf, sigla);
}

/** Baixa os 5.570 municípios do IBGE (código de 7 dígitos, nome oficial e UF). */
export async function buscarMunicipiosIbge(): Promise<MunicipioIbge[]> {
  // O servidor do IBGE recusa conexões de vez em quando.
  const lista = await createFetcher()<MunicipioIbgeResposta[]>(IBGE_URL);

  return lista.map((m) => {
    // Municípios criados depois de 2017 (ex.: Boa Esperança do Norte - MT) vêm sem microrregião.
    const sigla =
      m["regiao-imediata"]?.["regiao-intermediaria"].UF.sigla ?? m.microrregiao?.mesorregiao.UF.sigla;
    if (!sigla || !isUf(sigla)) throw new Error(`UF desconhecida para o município IBGE ${m.id}`);

    return { ibge: m.id, nome: m.nome, nomeBusca: normalizarNome(m.nome), uf: sigla };
  });
}

/** Carga idempotente: cria os novos e atualiza só os que mudaram de nome/UF. Devolve quantos gravou. */
export async function sincronizarMunicipios(prisma: PrismaClient, municipios?: MunicipioIbge[]) {
  const fonte = municipios ?? (await buscarMunicipiosIbge());
  const existentes = new Map(
    (await prisma.municipio.findMany()).map((m) => [m.ibge, `${m.nome}|${m.nomeBusca}|${m.uf}`]),
  );

  const novos = fonte.filter((m) => !existentes.has(m.ibge));
  const alterados = fonte.filter((m) => {
    const atual = existentes.get(m.ibge);
    return atual !== undefined && atual !== `${m.nome}|${m.nomeBusca}|${m.uf}`;
  });

  if (novos.length) await prisma.municipio.createMany({ data: novos, skipDuplicates: true });
  for (const m of alterados) {
    await prisma.municipio.update({ where: { ibge: m.ibge }, data: m });
  }

  return novos.length + alterados.length;
}
