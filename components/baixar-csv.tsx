import { DownloadIcon } from "lucide-react";

import { Termo } from "@/components/termo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Link de download (funciona sem JavaScript) para a versão em planilha dos dados da seção. */
export function BaixarCsv({ href, rotulo, className }: { href: string; rotulo: string; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground", className)}>
      <a href={href} download className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-foreground")}>
        <DownloadIcon data-icon="inline-start" aria-hidden="true" />
        {rotulo}
      </a>
      <span>
        Arquivo <Termo id="csv">CSV</Termo>, abre no Excel, LibreOffice ou Google Planilhas.
      </span>
    </p>
  );
}
