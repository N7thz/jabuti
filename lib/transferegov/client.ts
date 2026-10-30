import { createFetcher, type OpcoesFetcher } from "../sync/run";

const BASE = "https://api.transferegov.gestao.gov.br/transferenciasespeciais";
const POR_PAGINA = 1000;

/** Filtros no formato do PostgREST, ex.: `{ uf_beneficiario_plano_acao: "eq.SP" }`. */
export type Filtros = Record<string, string | undefined>;

/** Lista para o operador `in` do PostgREST, com aspas para valores que têm vírgula ou espaço. */
export const emLista = (valores: (string | number)[]) =>
  `in.(${valores.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(",")})`;

/** Cliente da API de Transferências Especiais do Transferegov (aberta, sem chave). */
export function createTransferegovClient({ minIntervalMs = 100, ...opcoes }: OpcoesFetcher = {}) {
  const get = createFetcher({ minIntervalMs, ...opcoes });

  /** Todas as linhas do recurso que passam nos filtros, paginando por offset. */
  async function listar<T>(recurso: string, filtros: Filtros = {}, select?: (keyof T & string)[]) {
    const itens: T[] = [];
    for (let offset = 0; ; offset += POR_PAGINA) {
      const url = new URL(`${BASE}/${recurso}`);
      for (const [campo, valor] of Object.entries(filtros)) if (valor !== undefined) url.searchParams.set(campo, valor);
      if (select) url.searchParams.set("select", select.join(","));
      url.searchParams.set("limit", String(POR_PAGINA));
      url.searchParams.set("offset", String(offset));

      const pagina = await get<T[]>(url);
      itens.push(...pagina);
      if (pagina.length < POR_PAGINA) return itens;
    }
  }

  return { listar };
}

export type TransferegovClient = ReturnType<typeof createTransferegovClient>;
