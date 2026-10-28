import { linhasCsv } from "./csv";
import { abrirEntrada, listarZip, type EntradaZip } from "./zip";

const BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele";

/** Conjuntos do CKAN (dadosabertos.tse.jus.br) usados pelo portal: um ZIP por ano com um CSV por UF. */
const CONJUNTOS = {
  candidatos: { zip: (ano: number) => `consulta_cand/consulta_cand_${ano}.zip`, csv: (ano: number, uf: string) => `consulta_cand_${ano}_${uf}.csv` },
  bens: { zip: (ano: number) => `bem_candidato/bem_candidato_${ano}.zip`, csv: (ano: number, uf: string) => `bem_candidato_${ano}_${uf}.csv` },
  receitas: {
    zip: (ano: number) => `prestacao_contas/prestacao_de_contas_eleitorais_candidatos_${ano}.zip`,
    csv: (ano: number, uf: string) => `receitas_candidatos_${ano}_${uf}.csv`,
  },
  votos: {
    zip: (ano: number) => `votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`,
    csv: (ano: number, uf: string) => `votacao_candidato_munzona_${ano}_${uf}.csv`,
  },
} as const;

export type ConjuntoTse = keyof typeof CONJUNTOS;

/** Cliente dos arquivos do TSE; o diretório de cada ZIP é lido uma vez só. */
export function createTseClient() {
  const diretorios = new Map<string, Promise<EntradaZip[]>>();

  function diretorio(url: string) {
    let lista = diretorios.get(url);
    if (!lista) diretorios.set(url, (lista = listarZip(url)));
    return lista;
  }

  async function abrir(url: string, nome: string) {
    const entrada = (await diretorio(url)).find((e) => e.nome === nome);
    if (!entrada) throw new Error(`${nome} não encontrado em ${url}`);
    return linhasCsv(await abrirEntrada(url, entrada));
  }

  return {
    /** Linhas do CSV da UF (ex.: "AC") no conjunto e ano pedidos, em streaming. */
    linhas: (conjunto: ConjuntoTse, ano: number, uf: string) =>
      abrir(`${BASE}/${CONJUNTOS[conjunto].zip(ano)}`, CONJUNTOS[conjunto].csv(ano, uf)),

    /** Equivalência código TSE → código IBGE dos municípios. */
    async municipiosTseIbge() {
      const mapa = new Map<number, number>();
      for await (const l of await abrir(`${BASE}/municipio_tse_ibge/municipio_tse_ibge.zip`, "municipio_tse_ibge.csv")) {
        mapa.set(Number(l.CD_MUNICIPIO_TSE), Number(l.CD_MUNICIPIO_IBGE));
      }
      return mapa;
    },
  };
}

export type TseClient = ReturnType<typeof createTseClient>;
