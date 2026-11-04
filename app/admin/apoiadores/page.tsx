import { Trash2Icon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { exigirAdmin } from "@/lib/admin";
import { listarApoiadoresAdmin } from "@/lib/apoio/apoiadores";
import { formatarData } from "@/lib/format/datas";
import { metadados } from "@/lib/metadados";

import { removerApoiador } from "./actions";
import { FormularioApoiador } from "./formulario";

export const metadata = metadados({
  titulo: "Apoiadores (admin) · Jabuti",
  descricao: "Gerenciar o mural de apoiadores.",
  indexar: false,
});

export default function AdminApoiadoresPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  await exigirAdmin();
  const apoiadores = await listarApoiadoresAdmin();

  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Admin</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Mural de apoiadores</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          Os nomes aparecem em <Link href="/apoie#mural">Apoie o projeto</Link> assim que você adiciona. Só entre com quem
          pediu ou autorizou aparecer; quem preferir ficar anônimo não entra.
        </p>
      </header>

      <section aria-labelledby="adicionar" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-soft sm:p-6">
        <h2 id="adicionar" className="text-xl font-bold">
          Adicionar
        </h2>
        <FormularioApoiador />
      </section>

      <section aria-labelledby="no-mural" className="flex flex-col gap-4">
        <h2 id="no-mural" className="text-xl font-bold">
          No mural ({apoiadores.length})
        </h2>
        {apoiadores.length === 0 ? (
          <p className="text-muted-foreground">Nenhum nome ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {apoiadores.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 pr-2 pl-4">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{a.nome}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {formatarData(a.criadoEm)} · por {a.criadoPor}
                  </span>
                </span>
                <form action={removerApoiador}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button type="submit" variant="ghost" size="icon" aria-label={`Tirar ${a.nome} do mural`}>
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
