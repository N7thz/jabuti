import { Termo } from "@/components/termo";
import { termoDoTipo } from "@/lib/emendas/rotulos";

/** Tipo da emenda como o Portal publica, com a explicação do glossário quando o tipo é conhecido. */
export function TipoEmenda({ tipo }: { tipo?: string | null }) {
  if (!tipo) return <>Tipo não informado</>;
  const termo = termoDoTipo(tipo);
  return termo ? <Termo id={termo}>{tipo}</Termo> : <>{tipo}</>;
}
