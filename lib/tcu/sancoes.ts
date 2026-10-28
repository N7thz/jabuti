import { normalizarNome } from "../sync/run";

// Listas do TCU (contas.tcu.gov.br/ords/condenacao/consulta): quem está inabilitado para cargo
// em comissão ou função de confiança e quem está declarado inidôneo para licitar.

export type InabilitadoTcu = {
  nome: string;
  cpf: string;
  processo: string;
  deliberacao: string;
  data_transito_julgado: string | null;
  data_final: string | null;
  data_acordao: string | null;
  uf: string | null;
  municipio: string | null;
};

export type InidoneoTcu = Omit<InabilitadoTcu, "cpf"> & { cpf_cnpj: string };

/** Condenação como o portal mostra. Sem CPF: ele só serve para casar o registro e nunca é exibido. */
export type SancaoTcu = {
  nome: string;
  processo: string;
  deliberacao: string;
  acordao: string | null;
  transitoEmJulgado: string | null;
  ate: string | null;
  uf: string | null;
  municipio: string | null;
};

const apenasDigitos = (valor: string) => valor.replace(/\D/g, "");

function paraSancao(s: InabilitadoTcu | InidoneoTcu): SancaoTcu {
  return {
    nome: s.nome,
    processo: s.processo,
    deliberacao: s.deliberacao,
    acordao: s.data_acordao,
    transitoEmJulgado: s.data_transito_julgado,
    ate: s.data_final,
    uf: s.uf,
    municipio: s.municipio,
  };
}

/**
 * Inabilitações de uma pessoa. Com CPF o casamento é exato; só com o nome civil pode haver homônimo,
 * por isso o resultado diz como casou (`"nome"` pede um aviso na tela). UF, quando informada, filtra
 * homônimos de outros estados.
 */
export function inabilitacoesDaPessoa(
  lista: InabilitadoTcu[],
  pessoa: { nomeCivil: string; cpf?: string | null; uf?: string | null },
) {
  if (pessoa.cpf) {
    const cpf = apenasDigitos(pessoa.cpf);
    return { casamento: "cpf" as const, sancoes: lista.filter((s) => apenasDigitos(s.cpf) === cpf).map(paraSancao) };
  }
  const nome = normalizarNome(pessoa.nomeCivil);
  return {
    casamento: "nome" as const,
    sancoes: lista
      .filter((s) => normalizarNome(s.nome) === nome && (!pessoa.uf || !s.uf || s.uf === pessoa.uf))
      .map(paraSancao),
  };
}

/** Declarações de inidoneidade de uma empresa ou pessoa pelo CPF/CNPJ. */
export function inidoneidadesDe(lista: InidoneoTcu[], cpfCnpj: string) {
  const alvo = apenasDigitos(cpfCnpj);
  return lista.filter((s) => apenasDigitos(s.cpf_cnpj) === alvo).map(paraSancao);
}
