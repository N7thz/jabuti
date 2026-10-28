import { cn } from "@/lib/utils";

/**
 * Tabela semântica com rolagem horizontal acessível: a área rola, recebe foco pelo teclado (tabIndex)
 * e é anunciada pela legenda.
 *
 * Quando o espaço é menor que 42rem (container query, porque a sidebar também estreita o conteúdo),
 * cada linha vira um cartão: o cabeçalho sai da tela (fica para leitores de tela) e cada célula mostra
 * o próprio rótulo (`rotulo` em Td). Os roles ARIA explícitos mantêm a semântica de tabela, que alguns
 * navegadores descartam quando o display muda.
 */
export function Tabela({ legenda, className, children }: { legenda: string; className?: string; children: React.ReactNode }) {
  return (
    <div className="@container">
      <div
        role="region"
        aria-label={legenda}
        tabIndex={0}
        className={cn(
          "overflow-x-auto rounded-lg border bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none @max-2xl:overflow-visible @max-2xl:border-0 @max-2xl:bg-transparent",
          className
        )}
      >
        <table role="table" className="w-full border-collapse text-sm @max-2xl:block">
          <caption className="sr-only">{legenda}</caption>
          {children}
        </table>
      </div>
    </div>
  );
}

export function THead(props: React.ComponentProps<"thead">) {
  return <thead role="rowgroup" className="@max-2xl:sr-only" {...props} />;
}

export function TBody(props: React.ComponentProps<"tbody">) {
  return <tbody role="rowgroup" className="@max-2xl:flex @max-2xl:flex-col @max-2xl:gap-3" {...props} />;
}

export function Tr(props: React.ComponentProps<"tr">) {
  return (
    <tr
      role="row"
      className="@max-2xl:flex @max-2xl:flex-col @max-2xl:gap-1 @max-2xl:rounded-lg @max-2xl:border @max-2xl:bg-card @max-2xl:p-4"
      {...props}
    />
  );
}

export function Th({ className, numero, scope = "col", ...props }: React.ComponentProps<"th"> & { numero?: boolean }) {
  return (
    <th
      role={scope === "row" ? "rowheader" : "columnheader"}
      scope={scope}
      className={cn(
        "border-b px-4 py-3 text-left font-semibold whitespace-nowrap",
        numero && "text-right",
        "@max-2xl:border-0 @max-2xl:p-0 @max-2xl:pb-2 @max-2xl:text-base @max-2xl:whitespace-normal",
        className
      )}
      {...props}
    />
  );
}

/** `rotulo`: nome da coluna, mostrado ao lado do valor quando a linha vira cartão. */
export function Td({ className, numero, rotulo, children, ...props }: React.ComponentProps<"td"> & { numero?: boolean; rotulo: string }) {
  return (
    <td
      role="cell"
      data-rotulo={rotulo}
      className={cn(
        "border-b px-4 py-3 align-top",
        numero && "text-right font-mono whitespace-nowrap tabular-nums",
        "@max-2xl:flex @max-2xl:items-baseline @max-2xl:justify-between @max-2xl:gap-4 @max-2xl:border-0 @max-2xl:p-0",
        "@max-2xl:before:shrink-0 @max-2xl:before:font-sans @max-2xl:before:text-muted-foreground @max-2xl:before:content-[attr(data-rotulo)]",
        className
      )}
      {...props}
    >
      {/* Wrapper: no cartão, o conteúdo (texto + spans em bloco) fica junto do lado direito. */}
      <div className="@max-2xl:min-w-0 @max-2xl:text-right">{children}</div>
    </td>
  );
}
