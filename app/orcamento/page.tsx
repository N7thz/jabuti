import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmendasLista } from "@/components/emendas-lista";
import { Paginacao } from "@/components/paginacao";
import { Skeleton } from "@/components/ui/skeleton";
import { lerFiltros } from "@/lib/filtros/schemas";
import { getEmendas } from "@/lib/transparencia/queries";

import { filtrosOrcamento, lerUrlOrcamento, linkOrcamento, PRIMEIRO_ANO } from "./filtros";
import { FiltrosForm } from "./filtros-form";

export const metadata: Metadata = { title: "Orçamento · Jabuti" };

const ULTIMO_ANO = new Date().getFullYear();
const ANOS = Array.from({ length: ULTIMO_ANO - PRIMEIRO_ANO + 1 }, (_, i) => ULTIMO_ANO - i);
const POR_PAGINA = 15;

export default function OrcamentoPage({ searchParams }: PageProps<"/orcamento">) {
  return (
    <div data-secao="orcamento" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Emendas parlamentares</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Para onde vai o dinheiro das emendas</h1>
        <p className="max-w-[60ch] text-lg text-muted-foreground">
          Emendas são a parte do orçamento federal que deputados e senadores indicam. Veja o valor
          empenhado e o que já foi pago, direto do Portal da Transparência.
        </p>
        <Link
          href="/orcamento/loa"
          className="w-fit font-medium text-link underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver o orçamento federal inteiro (LOA) e quanto já foi gasto em cada área
        </Link>
      </header>

      <Suspense fallback={<FiltrosForm anos={ANOS} />}>
        {searchParams.then((params) => (
          <FiltrosForm
            anos={ANOS}
            valores={lerUrlOrcamento(params)}
            erros={lerFiltros(filtrosOrcamento, params).erros}
          />
        ))}
      </Suspense>

      <Suspense
        fallback={
          <div role="status" aria-label="Carregando emendas" className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        }
      >
        <Resultado searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Resultado({ searchParams }: Pick<PageProps<"/orcamento">, "searchParams">) {
  const { valores } = lerFiltros(filtrosOrcamento, await searchParams);
  // Filtro inválido: a mensagem já aparece no campo do formulário.
  if (!valores) return null;

  const { ano = ANOS[0], autor, pagina = 1 } = valores;
  const emendas = await getEmendas({ ano, nomeAutor: autor }, pagina);
  const link = (p: number) => linkOrcamento("/orcamento", { ano, autor, pagina: p });

  return (
    <section aria-labelledby="resultado" className="flex flex-col gap-4">
      <h2 id="resultado" className="text-sm text-muted-foreground" aria-live="polite">
        Emendas de {ano}
        {autor && <> de {autor}</>} · página {pagina}
      </h2>

      <EmendasLista
        emendas={emendas}
        vazio={
          autor
            ? `Nenhuma emenda de ${ano} em nome de ${autor}. Confira a grafia do nome.`
            : "Nenhuma emenda nesta página."
        }
      />

      {/* A API não informa o total: só há próxima página quando esta veio cheia. */}
      <Paginacao pagina={pagina} href={link} temProxima={emendas.length === POR_PAGINA} />
    </section>
  );
}
