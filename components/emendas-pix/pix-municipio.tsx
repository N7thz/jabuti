import { Skeleton } from "@/components/ui/skeleton";
import type { Uf } from "@/lib/generated/prisma/enums";
import { getEmendasPixMunicipio } from "@/lib/transferegov/queries";

import { reaisDeCentavos } from "../emendas/valores";
import { SobreEmendasPix, TabelaEmendasPix } from "./tabela-pix";

/** Emendas Pix que a cidade recebeu no ano, de qualquer autor, com link para a execução de cada uma. */
export async function PixMunicipio({ municipio, ano }: { municipio: { nome: string; uf: Uf }; ano: number }) {
  const emendas = await getEmendasPixMunicipio(municipio, ano);
  const total = emendas.reduce((soma, e) => soma + e.total, 0);

  return (
    <section aria-labelledby="pix" className="flex flex-col gap-3">
      <h2 id="pix" className="text-xl font-bold">
        Emendas Pix de {ano}
      </h2>
      <SobreEmendasPix />
      {emendas.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-muted-foreground">
          {municipio.nome} não tem emendas Pix registradas no Transferegov em {ano}.
        </p>
      ) : (
        <>
          <p>
            {emendas.length} {emendas.length === 1 ? "emenda" : "emendas"}, somando{" "}
            <strong className="font-mono">{reaisDeCentavos(total)}</strong>. Abra uma para ver em que o dinheiro deve ser
            usado.
          </p>
          <TabelaEmendasPix
            emendas={emendas}
            quem="autor"
            legenda={`Emendas Pix de ${ano} para ${municipio.nome}, da maior para a menor`}
          />
        </>
      )}
    </section>
  );
}

export function PixSkeleton() {
  return (
    <div role="status" aria-label="Carregando emendas Pix" className="flex flex-col gap-3">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-48" />
    </div>
  );
}
