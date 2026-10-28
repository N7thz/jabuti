import { Termo } from "@/components/termo";
import { Badge } from "@/components/ui/badge";
import { deCentavos, formatarReais } from "@/lib/format/dinheiro";
import type { Totais } from "@/lib/emendas/queries";

export const reaisDeCentavos = (centavos: number) => formatarReais(deCentavos(centavos));

const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

/** Parte do empenhado que já foi paga, em texto ("38%"); vazio quando nada foi empenhado. */
export function percentualPago({ empenhado, pago }: Totais) {
  return empenhado > 0 ? percentual.format(pago / empenhado) : null;
}

const ETAPAS = [
  {
    chave: "empenhado",
    titulo: "Empenhado",
    termo: "empenho",
    explicacao: "Dinheiro reservado no orçamento para a emenda. É uma promessa de gasto.",
  },
  {
    chave: "liquidado",
    titulo: "Liquidado",
    termo: "liquidacao",
    explicacao: "O governo conferiu que a obra, o serviço ou a compra foi entregue.",
  },
  {
    chave: "pago",
    titulo: "Pago",
    termo: "pagamento",
    explicacao: "O dinheiro saiu de fato dos cofres federais.",
  },
] as const;

/** Os três estágios do gasto público, cada um com a explicação em linguagem simples e o termo explicado no glossário. */
export function ResumoValores({ totais, quantidade }: { totais: Totais; quantidade: number }) {
  const pago = percentualPago(totais);

  return (
    // Container queries: valores na casa dos bilhões só cabem em três colunas quando sobra largura,
    // e a sidebar aberta estreita o conteúdo mesmo em telas grandes.
    <div className="@container flex flex-col gap-3">
      <dl className="grid gap-3 @2xl:grid-cols-3">
        {ETAPAS.map(({ chave, titulo, termo, explicacao }) => (
          <div key={chave} className="@container flex flex-col gap-1 rounded-lg border bg-card p-4 shadow-soft">
            <dt className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
              <Termo id={termo}>{titulo}</Termo>
              {chave === "pago" && pago && <Badge variant="success">{pago} do empenhado</Badge>}
            </dt>
            <dd className="font-mono text-xl font-bold tabular-nums [overflow-wrap:anywhere] @2xs:text-2xl">
              {reaisDeCentavos(totais[chave])}
            </dd>
            <dd className="text-sm text-muted-foreground">{explicacao}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        {quantidade.toLocaleString("pt-BR")} {quantidade === 1 ? "registro de emenda" : "registros de emenda"}.
      </p>
    </div>
  );
}
