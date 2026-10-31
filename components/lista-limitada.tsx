/**
 * Limite das listas longas dos perfis. Mandar centenas de itens de uma vez deixava o perfil com cerca de
 * 3 MB de HTML, pesado demais para celular simples e internet fraca; a lista completa continua a um
 * clique (planilha, página com paginação ou site oficial).
 */
export const LIMITE_LISTA = 30;

export function primeiros<T>(itens: T[], limite = LIMITE_LISTA) {
  return itens.slice(0, limite);
}

/** "Mostrando os 30 mais recentes de 384." com o caminho para ver o resto. Não renderiza se cabe tudo. */
export function AvisoLimite({
  total,
  limite = LIMITE_LISTA,
  oQue,
  children,
}: {
  total: number;
  limite?: number;
  /** Plural do item, já com o critério: "lançamentos mais recentes", "proposições mais recentes". */
  oQue: string;
  /** Onde ver todos (link ou BaixarCsv). */
  children: React.ReactNode;
}) {
  if (total <= limite) return null;
  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
      <p>
        Mostrando {limite} {oQue} de {total.toLocaleString("pt-BR")}.
      </p>
      {children}
    </div>
  );
}
