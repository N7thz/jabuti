// Gravação em lote para as cargas rodadas longe do banco (GitHub Actions nos EUA, Neon em São Paulo).
// Cada ida e volta custa ~100 ms; um `$transaction([...50 upserts])` executa as queries uma a uma
// dentro de uma transação interativa e estoura o limite de 5 s do Prisma. Aqui o trabalho vira
// poucas queries: uma busca dos existentes, um `createMany` dos novos e `update` só do que mudou.

export function emLotes<T>(itens: T[], tamanho: number) {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

/** Executa `fn` sobre os itens com no máximo `limite` chamadas simultâneas, mantendo a ordem. */
export async function emParalelo<T, R>(itens: T[], limite: number, fn: (item: T) => Promise<R>) {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;

  async function trabalhador() {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await fn(itens[indice]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

function ehDecimal(valor: unknown): valor is { toString(): string } {
  return typeof valor === "object" && valor !== null && "toFixed" in valor && "isZero" in valor;
}

/**
 * Compara o valor gravado com o novo, tolerando as diferenças de representação do Prisma:
 * datas como `Date` ou texto ISO, decimais como `Decimal` ou texto ("10.50" e "10.5"), nulo e indefinido.
 */
export function valoresIguais(atual: unknown, novo: unknown): boolean {
  if (atual === null || atual === undefined || novo === null || novo === undefined) {
    return (atual ?? null) === (novo ?? null);
  }
  if (atual instanceof Date || novo instanceof Date) {
    const a = new Date(atual as string | Date).getTime();
    const b = new Date(novo as string | Date).getTime();
    return a === b;
  }
  if (ehDecimal(atual) || ehDecimal(novo)) {
    return Number(String(atual)) === Number(String(novo));
  }
  if (typeof atual === "object" || typeof novo === "object") {
    return JSON.stringify(atual) === JSON.stringify(novo);
  }
  return atual === novo;
}

/** Campos de `novo` (os indefinidos ficam de fora, como no `update` do Prisma) que diferem de `atual`. */
export function camposAlterados(atual: Record<string, unknown>, novo: Record<string, unknown>) {
  return Object.keys(novo).filter((campo) => novo[campo] !== undefined && !valoresIguais(atual[campo], novo[campo]));
}

/**
 * Separa o lote entre linhas novas (não estão no banco) e existentes com algum campo diferente.
 * As existentes iguais ficam de fora: não há o que gravar.
 */
export function separarNovosEAlterados<D, L extends Record<string, unknown>>(
  dados: D[],
  existentes: Map<string, L>,
  chave: (dado: D) => string,
  paraAtualizar: (dado: D) => Record<string, unknown>,
) {
  const novos: D[] = [];
  const alterados: { linha: L; dados: Record<string, unknown> }[] = [];
  for (const dado of dados) {
    const linha = existentes.get(chave(dado));
    if (!linha) {
      novos.push(dado);
      continue;
    }
    const atualizacao = paraAtualizar(dado);
    if (camposAlterados(linha, atualizacao).length > 0) alterados.push({ linha, dados: atualizacao });
  }
  return { novos, alterados };
}

/** A lista pode repetir a mesma chave; vale o último, como faria uma sequência de upserts. */
export function unicosPorChave<D>(dados: D[], chave: (dado: D) => string) {
  return [...new Map(dados.map((d) => [chave(d), d])).values()];
}

/** Atualizações simultâneas por lote; cada `update` é atômico por linha e a carga é idempotente. */
export const CONCORRENCIA_ATUALIZACAO = 8;

interface GravarOpcoes<D, L extends Record<string, unknown>> {
  dados: D[];
  chave: (dado: D) => string;
  /** Linhas já gravadas com as chaves dadas; precisa trazer os campos comparados e o que `chaveDaLinha` lê. */
  buscar: (chaves: string[]) => Promise<L[]>;
  chaveDaLinha: (linha: L) => string;
  criar: (novos: D[]) => Promise<unknown>;
  atualizar: (linha: L, dados: Record<string, unknown>) => Promise<unknown>;
  /** Dados do `update`; por padrão, o próprio dado. */
  paraAtualizar?: (dado: D) => Record<string, unknown>;
  tamanhoLote?: number;
}

/**
 * Upsert em lote sem transação interativa: por lote, 1 busca + 1 `createMany` + 1 `update` por linha
 * que mudou (em paralelo). Cada comando é atômico, então uma falha no meio não deixa linha pela metade,
 * e rodar de novo completa o que faltou.
 */
export async function gravarEmLote<D, L extends Record<string, unknown>>({
  dados,
  chave,
  buscar,
  chaveDaLinha,
  criar,
  atualizar,
  paraAtualizar = (dado) => dado as Record<string, unknown>,
  tamanhoLote = 500,
}: GravarOpcoes<D, L>) {
  let criados = 0;
  let atualizados = 0;
  for (const lote of emLotes(unicosPorChave(dados, chave), tamanhoLote)) {
    const existentes = new Map((await buscar(lote.map(chave))).map((linha) => [chaveDaLinha(linha), linha]));
    const { novos, alterados } = separarNovosEAlterados(lote, existentes, chave, paraAtualizar);
    if (novos.length > 0) await criar(novos);
    await emParalelo(alterados, CONCORRENCIA_ATUALIZACAO, ({ linha, dados: d }) => atualizar(linha, d));
    criados += novos.length;
    atualizados += alterados.length;
  }
  return { criados, atualizados };
}
