import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { transparencia, unwrap } from "./client";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** Cadastro de pessoa jurídica com os indicadores de relacionamento com o governo federal, ou `null` se não houver registro. */
export async function getPessoaJuridica(cnpj: string) {
  "use cache";
  cacheLife("days");
  cacheTag("transparencia", `pj:${onlyDigits(cnpj)}`);

  const result = await transparencia.GET("/api-de-dados/pessoa-juridica", {
    params: { query: { cnpj: onlyDigits(cnpj) } },
  });
  // CNPJ sem registro: a API responde 200 com corpo vazio.
  if (result.response.ok && result.data === undefined) return null;
  return unwrap(result);
}

/** Contratos do Poder Executivo Federal firmados com um CPF/CNPJ. */
export async function getContratosPorFornecedor(cpfCnpj: string, pagina = 1) {
  "use cache";
  cacheLife("hours");
  cacheTag("transparencia", `contratos:${onlyDigits(cpfCnpj)}`);

  return unwrap(
    await transparencia.GET("/api-de-dados/contratos/cpf-cnpj", {
      params: { query: { cpfCnpj: onlyDigits(cpfCnpj), pagina } },
    }),
  );
}

/** Sanções no Cadastro de Empresas Inidôneas e Suspensas (CEIS). */
export async function getSancoesCeis(cnpjOuCpf: string, pagina = 1) {
  "use cache";
  cacheLife("hours");
  cacheTag("transparencia", `ceis:${onlyDigits(cnpjOuCpf)}`);

  return unwrap(
    await transparencia.GET("/api-de-dados/ceis", {
      params: { query: { codigoSancionado: onlyDigits(cnpjOuCpf), pagina } },
    }),
  );
}

/** Sanções no Cadastro Nacional de Empresas Punidas (CNEP). */
export async function getSancoesCnep(cnpjOuCpf: string, pagina = 1) {
  "use cache";
  cacheLife("hours");
  cacheTag("transparencia", `cnep:${onlyDigits(cnpjOuCpf)}`);

  return unwrap(
    await transparencia.GET("/api-de-dados/cnep", {
      params: { query: { codigoSancionado: onlyDigits(cnpjOuCpf), pagina } },
    }),
  );
}

/** Órgãos do SIAFI, com filtro opcional por código ou descrição. */
export async function getOrgaosSiafi(
  filtro: { codigo?: string; descricao?: string } = {},
  pagina = 1,
) {
  "use cache";
  cacheLife("weeks");
  cacheTag("transparencia", "orgaos-siafi");

  return unwrap(
    await transparencia.GET("/api-de-dados/orgaos-siafi", {
      params: { query: { ...filtro, pagina } },
    }),
  );
}

/** Despesas consolidadas por órgão em um ano. */
export async function getDespesasPorOrgao(
  ano: number,
  filtro: { orgaoSuperior?: string; orgao?: string } = {},
  pagina = 1,
) {
  "use cache";
  cacheLife("days");
  cacheTag("transparencia", `despesas-orgao:${ano}`);

  return unwrap(
    await transparencia.GET("/api-de-dados/despesas/por-orgao", {
      params: { query: { ano, ...filtro, pagina } },
    }),
  );
}

/** Emendas parlamentares; a API devolve 15 por página e não filtra por localidade. */
export async function getEmendas(
  filtro: { ano?: number; nomeAutor?: string; tipoEmenda?: string; codigoFuncao?: string } = {},
  pagina = 1,
) {
  "use cache";
  cacheLife("days");
  cacheTag("transparencia", "emendas");

  return unwrap(
    await transparencia.GET("/api-de-dados/emendas", {
      params: { query: { ...filtro, pagina } },
    }),
  );
}
