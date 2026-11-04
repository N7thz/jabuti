import "server-only";

import { comoUsuario, type TransacaoDaPessoa } from "@/lib/como-usuario";
import { tentar } from "@/lib/erros";
import { getInidoneidadesTcu } from "@/lib/tcu/queries";
import { getContratosPorFornecedor, getSancoesCeis, getSancoesCnep } from "@/lib/transparencia/queries";

// Empresas vigiadas: a cada visita ao painel, confere sanções (CEIS, CNEP, TCU) e contratos no Portal
// da Transparência e compara com o que foi visto da última vez. As consultas às APIs ficam no cache
// delas (horas); a comparação é de cada pessoa e fica no banco.

/** Máximo por pessoa: cada empresa custa quatro consultas às APIs na abertura do painel. */
export const LIMITE_EMPRESAS = 20;

export interface EstadoEmpresa {
  sancoes: number;
  /** Maior id de contrato visto (os contratos novos têm id maior). */
  ultimoContrato: number;
}

export const lerEstado = (texto: string | null): EstadoEmpresa | null => {
  const m = texto?.match(/^sancoes:(\d+)\|contrato:(\d+)$/);
  return m ? { sancoes: Number(m[1]), ultimoContrato: Number(m[2]) } : null;
};

export const escreverEstado = (e: EstadoEmpresa) => `sancoes:${e.sancoes}|contrato:${e.ultimoContrato}`;

/** O que mudou entre duas checagens, em frases curtas; vazio quando nada mudou ou é a primeira. */
export function mudancas(antes: EstadoEmpresa | null, agora: EstadoEmpresa) {
  if (!antes) return [];
  const frases: string[] = [];
  if (agora.sancoes > antes.sancoes) {
    const novas = agora.sancoes - antes.sancoes;
    frases.push(novas === 1 ? "Uma sanção nova" : `${novas} sanções novas`);
  }
  if (agora.sancoes < antes.sancoes) frases.push("Uma sanção deixou de constar");
  if (agora.ultimoContrato > antes.ultimoContrato) frases.push("Contrato novo com o governo federal");
  return frases;
}

/** Estado atual da empresa nas fontes; null se alguma fonte falhou (não dá para comparar). */
async function consultar(cnpj: string): Promise<EstadoEmpresa | null> {
  const [ceis, cnep, tcu, contratos] = await Promise.all([
    tentar("o CEIS", getSancoesCeis(cnpj)),
    tentar("o CNEP", getSancoesCnep(cnpj)),
    tentar("o TCU", getInidoneidadesTcu(cnpj)),
    tentar("os contratos", getContratosPorFornecedor(cnpj)),
  ]);
  if (!ceis.ok || !cnep.ok || !tcu.ok || !contratos.ok) return null;
  const tamanho = (x: unknown) => (Array.isArray(x) ? x.length : 0);
  const ids = (Array.isArray(contratos.dados) ? contratos.dados : []).map((c: { id?: number }) => Number(c.id ?? 0));
  return {
    sancoes: tamanho(ceis.dados) + tamanho(cnep.dados) + tamanho(tcu.dados),
    ultimoContrato: Math.max(0, ...ids),
  };
}

export interface EmpresaNoPainel {
  cnpj: string;
  rotulo: string;
  estado: EstadoEmpresa | null;
  novidades: string[];
  /** As fontes não responderam agora: mostra o último estado conhecido. */
  indisponivel: boolean;
  mudouEm: Date | null;
}

/** Empresas vigiadas da pessoa, dentro de uma transação já aberta (ver /meu, que junta as leituras do painel). */
export function lerVigiadas(tx: TransacaoDaPessoa, usuario: string) {
  return tx.empresaVigiada.findMany({ where: { usuario }, orderBy: { criadaEm: "asc" } });
}

export type EmpresaVigiadaLida = Awaited<ReturnType<typeof lerVigiadas>>[number];

/**
 * Confere nas fontes as empresas já lidas e grava o que mudou, numa transação só. As consultas às APIs ficam fora
 * de transação: podem demorar e não devem segurar uma conexão do banco. A novidade continua aparecendo por 7 dias
 * depois de detectada, para não sumir antes de a pessoa ver.
 */
export async function conferirEmpresas(usuario: string, vigiadas: EmpresaVigiadaLida[]): Promise<EmpresaNoPainel[]> {
  const agora = new Date();
  const gravar: { id: string; estado: string; mudouEm: Date | null }[] = [];

  const empresas = await Promise.all(
    vigiadas.map(async (v): Promise<EmpresaNoPainel> => {
      const antes = lerEstado(v.estado);
      const atual = await consultar(v.cnpj);
      if (!atual) {
        return { cnpj: v.cnpj, rotulo: v.rotulo, estado: antes, novidades: [], indisponivel: true, mudouEm: v.mudouEm };
      }
      const frases = mudancas(antes, atual);
      const mudou = escreverEstado(atual) !== v.estado;
      const mudouEm = frases.length > 0 ? agora : v.mudouEm;
      if (mudou || !v.checadaEm) gravar.push({ id: v.id, estado: escreverEstado(atual), mudouEm });
      const recente = mudouEm && agora.getTime() - mudouEm.getTime() < 7 * 86_400_000;
      return {
        cnpj: v.cnpj,
        rotulo: v.rotulo,
        estado: atual,
        novidades: frases.length > 0 ? frases : recente ? ["Mudou nos últimos 7 dias: confira a página da empresa"] : [],
        indisponivel: false,
        mudouEm,
      };
    }),
  );

  if (gravar.length > 0) {
    await comoUsuario(usuario, async (tx) => {
      for (const g of gravar) {
        await tx.empresaVigiada.update({ where: { id: g.id }, data: { estado: g.estado, checadaEm: agora, mudouEm: g.mudouEm } });
      }
    });
  }
  return empresas;
}
