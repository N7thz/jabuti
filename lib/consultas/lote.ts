/** O que saiu de uma leitura em lote: o que foi lido e quantos itens ficaram sem resposta. */
export interface LeituraEmLote<R> {
  lidos: R[];
  /** Itens que falharam ou que nem foram tentados porque o prazo acabou. */
  faltaram: number;
}

/**
 * Lê os itens com no máximo `paralelo` pedidos ao mesmo tempo e um prazo para o lote inteiro.
 *
 * Cada vaga pega o próximo item assim que termina o anterior: uma página que trava ocupa uma vaga só, em vez
 * de segurar um lote fixo inteiro. Passado o prazo, nenhum item novo começa; os que já estão em andamento
 * terminam pelo timeout do próprio pedido. `ler` devolve null quando o item existe mas não tem o que guardar
 * (não conta como falta) e lança quando a fonte não respondeu (conta).
 */
export async function lerEmLote<T, R>(
  itens: readonly T[],
  { paralelo, prazoMs }: { paralelo: number; prazoMs: number },
  ler: (item: T) => Promise<R | null>,
): Promise<LeituraEmLote<R>> {
  const fim = Date.now() + prazoMs;
  const lidos: R[] = [];
  let proximo = 0;
  let faltaram = 0;

  async function vaga() {
    while (proximo < itens.length && Date.now() < fim) {
      const item = itens[proximo++];
      try {
        const lido = await ler(item);
        if (lido !== null) lidos.push(lido);
      } catch {
        faltaram++;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(paralelo, itens.length)) }, vaga));
  return { lidos, faltaram: faltaram + (itens.length - proximo) };
}
