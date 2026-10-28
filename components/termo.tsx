import { verbete, type IdTermo } from "@/lib/glossario";

import { TermoPopover } from "./termo-popover";

/**
 * Palavra técnica com explicação ao alcance (ver TermoPopover). Fica no servidor para que só o
 * verbete usado vá para o navegador, e não o glossário inteiro.
 */
export function Termo({ id, children, className }: { id: IdTermo; children?: React.ReactNode; className?: string }) {
  const v = verbete(id);
  return (
    <TermoPopover id={v.id} termo={v.termo} curto={v.curto} className={className}>
      {children ?? v.termo}
    </TermoPopover>
  );
}
