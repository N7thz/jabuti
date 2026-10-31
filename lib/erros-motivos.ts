// Tipo e explicação em português de cada falha. Sem dependências: é usado no servidor (inclusive nos
// scripts de carga, fora do Next) e nas telas de erro, no navegador.

/** Tipo da falha, independente da fonte. Vira a frase em português de `MOTIVOS`. */
export type CodigoErro =
  | "tempo"
  | "rede"
  | "limite"
  | "fora-do-ar"
  | "recusou"
  | "nao-encontrado"
  | "formato"
  | "configuracao"
  | "banco"
  | "desconhecido";

export type MotivoErro = {
  codigo: CodigoErro;
  /** O que aconteceu, numa frase para o público. */
  motivo: string;
  /** Falha passageira: vale tentar de novo daqui a pouco. */
  passageiro: boolean;
};

const MOTIVOS: Record<CodigoErro, (status?: number) => Omit<MotivoErro, "codigo">> = {
  tempo: () => ({ motivo: "A fonte demorou mais do que o tempo limite e não respondeu.", passageiro: true }),
  rede: () => ({ motivo: "Não foi possível conectar ao servidor da fonte.", passageiro: true }),
  limite: () => ({
    motivo: "A fonte recusou a consulta porque o limite de pedidos por minuto foi atingido.",
    passageiro: true,
  }),
  "fora-do-ar": (status) => ({
    motivo: `O servidor da fonte está com problema e respondeu com erro${status ? ` (código ${status})` : ""}.`,
    passageiro: true,
  }),
  recusou: (status) => ({
    motivo: `A fonte recusou a consulta${status ? ` (código ${status})` : ""}.`,
    passageiro: false,
  }),
  "nao-encontrado": () => ({ motivo: "A fonte não encontrou o registro pedido.", passageiro: false }),
  formato: () => ({ motivo: "A fonte respondeu num formato que não conseguimos ler.", passageiro: true }),
  configuracao: () => ({
    motivo: "Falta configurar o acesso a esta fonte no nosso servidor. O problema é do nosso lado.",
    passageiro: false,
  }),
  banco: () => ({ motivo: "O banco de dados do portal não respondeu.", passageiro: true }),
  desconhecido: () => ({ motivo: "Aconteceu um erro inesperado ao buscar os dados.", passageiro: true }),
};

const motivoDe = (codigo: CodigoErro, status?: number): MotivoErro => ({ codigo, ...MOTIVOS[codigo](status) });

// O Next troca a mensagem dos erros do servidor por uma genérica em produção, mas mantém o `digest` que o
// erro já tiver. Por isso o tipo da falha viaja nele: "jabuti:<codigo>:<status>:<id>". O id final é o
// que aparece na tela como "Código do erro" e serve para achar o erro no log.
const PREFIXO = "jabuti";

/** Digest de um erro do portal, com o tipo da falha para a tela de erro conseguir explicá-la. */
export function digestDoErro(codigo: CodigoErro, status = 0) {
  return `${PREFIXO}:${codigo}:${status}:${Math.random().toString(36).slice(2, 10)}`;
}

/** HTTP de erro → tipo da falha. */
export function codigoDoStatus(status: number): CodigoErro {
  if (status === 404) return "nao-encontrado";
  if (status === 429) return "limite";
  if (status === 401 || status === 403) return "configuracao";
  if (status === 408 || status === 504) return "tempo";
  if (status >= 500) return "fora-do-ar";
  return "recusou";
}

/** Erro de configuração do servidor (chave ou variável de ambiente faltando). */
export class ErroConfiguracao extends Error {
  readonly digest = digestDoErro("configuracao");
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroConfiguracao";
  }
}

const temDigest = (erro: unknown): erro is { digest: unknown } =>
  typeof erro === "object" && erro !== null && "digest" in erro;

/**
 * Explica em português o que deu errado. Funciona no servidor, com o erro original, e no navegador, com o
 * erro que o Next repassa às telas de erro (só o `digest` sobrevive em produção).
 */
export function descreverErro(erro: unknown): MotivoErro {
  if (temDigest(erro) && typeof erro.digest === "string" && erro.digest.startsWith(`${PREFIXO}:`)) {
    const [, codigo, status] = erro.digest.split(":");
    if (codigo in MOTIVOS) return motivoDe(codigo as CodigoErro, Number(status) || undefined);
  }
  if (!(erro instanceof Error)) return motivoDe("desconhecido");

  const causa = erro.cause instanceof Error ? erro.cause : null;
  const status = "status" in erro && typeof erro.status === "number" ? erro.status : null;

  if (erro.name === "TimeoutError" || causa?.name === "TimeoutError") return motivoDe("tempo");
  if (status) return motivoDe(codigoDoStatus(status), status);
  if (erro.name === "FalhaDeRede" || erro.name === "AbortError" || erro instanceof TypeError) return motivoDe("rede");
  if (erro instanceof SyntaxError) return motivoDe("formato");
  if (erro.name.startsWith("Prisma") || erro.name === "NeonDbError") return motivoDe("banco");
  return motivoDe("desconhecido");
}

/** Identificador do erro para mostrar na tela e achar no log. */
export function codigoParaSuporte(erro: unknown) {
  if (!temDigest(erro) || erro.digest == null) return null;
  const digest = String(erro.digest);
  return digest.startsWith(`${PREFIXO}:`) ? (digest.split(":").at(-1) ?? digest) : digest;
}
