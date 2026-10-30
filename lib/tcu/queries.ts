import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createFetcher, NA_PAGINA } from "@/lib/sync/run";

import { inabilitacoesDaPessoa, inidoneidadesDe, type InabilitadoTcu, type InidoneoTcu } from "./sancoes";

const BASE = "https://contas.tcu.gov.br/ords/condenacao/consulta";
// Listas e relatórios grandes: timeout maior que o padrão das páginas, mas desiste logo se a fonte estiver fora.
const get = createFetcher({ minIntervalMs: 200, ...NA_PAGINA, timeoutMs: 60_000 });

type PaginaOrds<T> = { items: T[]; hasMore: boolean };

/** Lista inteira (o ORDS devolve no máximo 500 por página). As listas são pequenas e mudam pouco. */
async function listaCompleta<T>(recurso: "inabilitados" | "inidoneos") {
  const itens: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const pagina = await get<PaginaOrds<T>>(`${BASE}/${recurso}?limit=500&offset=${offset}`);
    itens.push(...pagina.items);
    if (!pagina.hasMore) return itens;
  }
}

// O casamento é feito aqui, e não com o filtro `q` do ORDS, porque os nomes vêm ora com acento, ora sem.
async function getInabilitados() {
  "use cache";
  cacheLife("days");
  cacheTag("tcu", "tcu:inabilitados");
  return listaCompleta<InabilitadoTcu>("inabilitados");
}

async function getInidoneos() {
  "use cache";
  cacheLife("days");
  cacheTag("tcu", "tcu:inidoneos");
  return listaCompleta<InidoneoTcu>("inidoneos");
}

/** Inabilitações vigentes no TCU para um parlamentar ou gestor (ver `inabilitacoesDaPessoa`). */
export async function getInabilitacoesTcu(pessoa: { nomeCivil: string; cpf?: string | null; uf?: string | null }) {
  return inabilitacoesDaPessoa(await getInabilitados(), pessoa);
}

/** Declarações de inidoneidade para licitar, por CPF/CNPJ (consulta de empresa da página inicial). */
export async function getInidoneidadesTcu(cpfCnpj: string) {
  return inidoneidadesDe(await getInidoneos(), cpfCnpj);
}
