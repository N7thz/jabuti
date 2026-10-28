import { normalizarNome } from "../sync/run";

// O Transferegov grava o beneficiário como "MUNICIPIO DE PAU D:ARCO DO PIAUI" ou "ESTADO DO PIAUI":
// sem acento, em maiúsculas e com ":" no lugar do apóstrofo.
const PREFIXO_MUNICIPIO = /^(MUNICIPIO|PREFEITURA MUNICIPAL) (DE|DA|DO|DOS|DAS) /;

/** Nome do município beneficiário já normalizado (para comparar com `Municipio.nomeBusca`), ou `null` se não for município. */
export function municipioDoBeneficiario(nomeBeneficiario: string) {
  const nome = normalizarNome(nomeBeneficiario);
  return PREFIXO_MUNICIPIO.test(nome) ? nome.replace(PREFIXO_MUNICIPIO, "") : null;
}

/**
 * Padrão `ilike` do PostgREST que acha o município sem depender de acento nem de pontuação
 * ("Pau D'Arco do Piauí" → `*PAU*D*ARCO*DO*PIAUI`). Pode trazer nomes que só começam igual
 * ("PORTO" casa "PORTO SEGURO"); confira o resultado com `municipioDoBeneficiario`.
 */
export function padraoBeneficiarioMunicipio(nomeMunicipio: string) {
  return `ilike.*${normalizarNome(nomeMunicipio).replace(/ /g, "*")}`;
}

/** Valor em reais (número com casas decimais) para centavos inteiros, como o resto do portal. */
export const centavos = (valor: number | null | undefined) => Math.round((valor ?? 0) * 100);
