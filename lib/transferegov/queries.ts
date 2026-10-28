import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";
import type { Casa, Uf } from "@/lib/generated/prisma/enums";

import { centavos, municipioDoBeneficiario, padraoBeneficiarioMunicipio } from "./beneficiario";
import { createTransferegovClient, emLista } from "./client";
import type { Empenho, Executor, Meta, PlanoAcao, PlanoTrabalho, RelatorioGestao } from "./types";

// Leitura ao vivo (política de dados): a API filtra por emenda e por beneficiário, então nada vai para o banco.
const transferegov = createTransferegovClient();

const CAMPOS_PLANO = [
  "id_plano_acao",
  "codigo_plano_acao",
  "ano_plano_acao",
  "situacao_plano_acao",
  "cnpj_beneficiario_plano_acao",
  "nome_beneficiario_plano_acao",
  "uf_beneficiario_plano_acao",
  "nome_parlamentar_emenda_plano_acao",
  "numero_emenda_parlamentar_plano_acao",
  "codigo_descricao_areas_politicas_publicas_plano_acao",
  "motivo_impedimento_plano_acao",
  "valor_custeio_plano_acao",
  "valor_investimento_plano_acao",
] satisfies (keyof PlanoAcao)[];

/** Emenda Pix como o portal mostra: valores em centavos. */
export type EmendaPix = {
  id: number;
  codigo: string;
  ano: number;
  situacao: string;
  beneficiario: string;
  cnpjBeneficiario: string;
  uf: string;
  autor: string;
  codigoEmenda: string;
  /** "10-Saúde / 302-Assistência Hospitalar..." como a API publica. */
  areas: string | null;
  impedimento: string | null;
  custeio: number;
  investimento: number;
  total: number;
};

function paraEmendaPix(p: PlanoAcao): EmendaPix {
  const custeio = centavos(p.valor_custeio_plano_acao);
  const investimento = centavos(p.valor_investimento_plano_acao);
  return {
    id: p.id_plano_acao,
    codigo: p.codigo_plano_acao,
    ano: p.ano_plano_acao,
    situacao: p.situacao_plano_acao,
    beneficiario: p.nome_beneficiario_plano_acao,
    cnpjBeneficiario: p.cnpj_beneficiario_plano_acao,
    uf: p.uf_beneficiario_plano_acao,
    autor: p.nome_parlamentar_emenda_plano_acao,
    codigoEmenda: p.numero_emenda_parlamentar_plano_acao,
    areas: p.codigo_descricao_areas_politicas_publicas_plano_acao,
    impedimento: p.motivo_impedimento_plano_acao,
    custeio,
    investimento,
    total: custeio + investimento,
  };
}

const porValor = (a: EmendaPix, b: EmendaPix) => b.total - a.total;

/**
 * Emendas Pix (transferências especiais) de um parlamentar: os códigos vêm das emendas dele já
 * sincronizadas do Portal, que usam o mesmo número que o Transferegov. Assim não depende de casar nomes.
 */
export async function getEmendasPixParlamentar(parlamentar: { casa: Casa; idExterno: string }, ano?: number) {
  "use cache";
  cacheLife("days");
  cacheTag("transferegov", `pix:parlamentar:${parlamentar.casa}:${parlamentar.idExterno}`);

  const emendas = await db.emenda.findMany({
    where: {
      parlamentar: { casa: parlamentar.casa, idExterno: parlamentar.idExterno },
      tipo: { contains: "Transferências Especiais" },
      ...(ano ? { ano } : {}),
    },
    select: { codigoEmenda: true },
    distinct: ["codigoEmenda"],
  });
  const codigos = emendas.map((e) => e.codigoEmenda);

  const planos: PlanoAcao[] = [];
  // Lotes de 50 para a URL não passar do limite do servidor.
  for (let i = 0; i < codigos.length; i += 50) {
    planos.push(
      ...(await transferegov.listar<PlanoAcao>(
        "plano_acao_especial",
        { numero_emenda_parlamentar_plano_acao: emLista(codigos.slice(i, i + 50)) },
        CAMPOS_PLANO,
      )),
    );
  }
  return planos.map(paraEmendaPix).sort(porValor);
}

/** Emendas Pix recebidas por um município, de qualquer autor. */
export async function getEmendasPixMunicipio(municipio: { nome: string; uf: Uf }, ano?: number) {
  "use cache";
  cacheLife("days");
  cacheTag("transferegov", `pix:municipio:${municipio.uf}:${municipio.nome}`);

  const planos = await transferegov.listar<PlanoAcao>(
    "plano_acao_especial",
    {
      uf_beneficiario_plano_acao: `eq.${municipio.uf}`,
      nome_beneficiario_plano_acao: padraoBeneficiarioMunicipio(municipio.nome),
      ano_plano_acao: ano ? `eq.${ano}` : undefined,
    },
    CAMPOS_PLANO,
  );

  // O ilike também traz "PORTO SEGURO" quando se busca "PORTO": fica só o nome exato.
  const nomeBusca = municipioDoBeneficiario(`MUNICIPIO DE ${municipio.nome}`);
  return planos
    .filter((p) => municipioDoBeneficiario(p.nome_beneficiario_plano_acao) === nomeBusca)
    .map(paraEmendaPix)
    .sort(porValor);
}

/** Uma emenda Pix pelo id do plano de ação, ou `null` se não existir. */
export async function getEmendaPix(idPlanoAcao: number) {
  "use cache";
  cacheLife("days");
  cacheTag("transferegov", `pix:plano:${idPlanoAcao}`);

  const [plano] = await transferegov.listar<PlanoAcao>(
    "plano_acao_especial",
    { id_plano_acao: `eq.${idPlanoAcao}` },
    CAMPOS_PLANO,
  );
  return plano ? paraEmendaPix(plano) : null;
}

/**
 * O que foi feito com uma emenda Pix: quem executa, metas, prazo, empenhos e o que o
 * ente declarou ter executado. Listas vazias quando o ente ainda não preencheu.
 */
export async function getExecucaoEmendaPix(idPlanoAcao: number) {
  "use cache";
  cacheLife("days");
  cacheTag("transferegov", `pix:plano:${idPlanoAcao}`);

  const porPlano = { id_plano_acao: `eq.${idPlanoAcao}` };
  const [executores, planosTrabalho, relatorios, empenhos] = await Promise.all([
    transferegov.listar<Executor>("executor_especial", porPlano, [
      "id_executor",
      "id_plano_acao",
      "cnpj_executor",
      "nome_executor",
      "objeto_executor",
      "vl_custeio_executor",
      "vl_investimento_executor",
    ]),
    transferegov.listar<PlanoTrabalho>("plano_trabalho_especial", porPlano, [
      "id_plano_trabalho",
      "id_plano_acao",
      "situacao_plano_trabalho",
      "data_inicio_execucao_plano_trabalho",
      "data_fim_execucao_plano_trabalho",
      "prazo_execucao_meses_plano_trabalho",
    ]),
    transferegov.listar<RelatorioGestao>("relatorio_gestao_novo_especial", porPlano, [
      "id_relatorio_gestao_novo",
      "id_plano_acao",
      "data_e_hora_relatorio_gestao_novo",
      "situacao_relatorio_gestao_novo",
      "valor_executado_relatorio_gestao_novo",
      "valor_pendente_relatorio_gestao_novo",
    ]),
    transferegov.listar<Empenho>("empenho_especial", porPlano, [
      "id_empenho",
      "id_plano_acao",
      "numero_empenho",
      "descricao_situacao_empenho",
      "data_emissao_empenho",
      "valor_empenho",
    ]),
  ]);

  const metas = executores.length
    ? await transferegov.listar<Meta>("meta_especial", { id_executor: emLista(executores.map((e) => e.id_executor)) }, [
        "id_meta",
        "id_executor",
        "nome_meta",
        "desc_meta",
        "un_medida_meta",
        "qt_uniade_meta",
      ])
    : [];

  const ultimoRelatorio = relatorios.toSorted((a, b) =>
    b.data_e_hora_relatorio_gestao_novo.localeCompare(a.data_e_hora_relatorio_gestao_novo),
  )[0];

  return {
    executores: executores.map((e) => ({
      cnpj: e.cnpj_executor,
      nome: e.nome_executor,
      objeto: e.objeto_executor,
      total: centavos(e.vl_custeio_executor) + centavos(e.vl_investimento_executor),
      metas: metas
        .filter((m) => m.id_executor === e.id_executor)
        .map((m) => ({ nome: m.nome_meta, descricao: m.desc_meta, unidade: m.un_medida_meta, quantidade: m.qt_uniade_meta })),
    })),
    planoTrabalho: planosTrabalho[0]
      ? {
          situacao: planosTrabalho[0].situacao_plano_trabalho,
          inicio: planosTrabalho[0].data_inicio_execucao_plano_trabalho,
          fim: planosTrabalho[0].data_fim_execucao_plano_trabalho,
          prazoMeses: planosTrabalho[0].prazo_execucao_meses_plano_trabalho,
        }
      : null,
    empenhado: empenhos.reduce((soma, e) => soma + centavos(e.valor_empenho), 0),
    /** Último relatório de gestão: o que o próprio ente declara ter executado e o que falta. */
    execucaoDeclarada: ultimoRelatorio
      ? {
          data: ultimoRelatorio.data_e_hora_relatorio_gestao_novo,
          situacao: ultimoRelatorio.situacao_relatorio_gestao_novo,
          executado: centavos(ultimoRelatorio.valor_executado_relatorio_gestao_novo),
          pendente: centavos(ultimoRelatorio.valor_pendente_relatorio_gestao_novo),
        }
      : null,
  };
}
