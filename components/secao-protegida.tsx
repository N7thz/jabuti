import { Suspense } from "react";

import { ErroSecao } from "@/components/erro-secao";
import { SecaoSkeleton } from "@/components/perfil-parlamentar";

/**
 * Seção que carrega sozinha (Suspense) e falha sozinha (ErroSecao). Use em volta de cada parte da
 * página que depende de uma fonte externa diferente.
 */
export function SecaoProtegida({
  titulo,
  fonte,
  id,
  carregando,
  children,
}: {
  titulo: string;
  fonte: string;
  id?: string;
  /** Esqueleto enquanto carrega; o padrão é o bloco de SecaoSkeleton. */
  carregando?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ErroSecao titulo={titulo} fonte={fonte} id={id}>
      <Suspense fallback={carregando ?? <SecaoSkeleton titulo={titulo} />}>{children}</Suspense>
    </ErroSecao>
  );
}
