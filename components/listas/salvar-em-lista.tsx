import { BookmarkIcon, CheckIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { TipoItemLista } from "@/lib/generated/prisma/enums";
import { salvarNaLista } from "@/lib/meu/actions";
import { getListasParaSalvar } from "@/lib/meu/listas";
import { getDono } from "@/lib/meu/perfil";

/**
 * "Salvar em lista" para qualquer página (votação, empresa, emenda...). Lê a sessão: use dentro de
 * <Suspense>. Visitante vê o convite para entrar. É um <details> com formulário comum: funciona sem
 * JavaScript e volta para a mesma página com o aviso.
 */
export async function SalvarEmLista({
  tipo,
  chave,
  rotulo,
  url,
  de = url,
}: {
  tipo: TipoItemLista;
  chave: string;
  rotulo: string;
  url: string;
  /** Página para onde voltar depois de salvar (padrão: a do próprio item). */
  de?: string;
}) {
  const usuario = await getDono().catch(() => null);
  if (!usuario) {
    return (
      <Button variant="outline" size="sm" render={<Link href={`/entrar?de=${encodeURIComponent(de)}`} />} nativeButton={false}>
        <BookmarkIcon data-icon="inline-start" aria-hidden="true" />
        Entrar para salvar em lista
      </Button>
    );
  }

  const listas = await getListasParaSalvar(usuario, tipo, chave).catch(() => []);
  const ja = listas.filter((l) => l.temItem);
  const id = `salvar-${tipo.toLowerCase()}-${chave.replace(/\W/g, "")}`;

  return (
    <details className="group w-fit max-w-full rounded-lg border bg-card open:w-full open:max-w-md">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {ja.length > 0 ? <CheckIcon aria-hidden="true" className="size-4 text-secao" /> : <BookmarkIcon aria-hidden="true" className="size-4" />}
        {ja.length > 0 ? `Salvo em ${ja.map((l) => l.nome).join(", ")}` : "Salvar em lista"}
      </summary>
      <form action={salvarNaLista} className="flex flex-col gap-3 border-t p-3">
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="chave" value={chave} />
        <input type="hidden" name="rotulo" value={rotulo} />
        <input type="hidden" name="url" value={url} />
        <input type="hidden" name="de" value={de} />
        {listas.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-lista`} className="text-sm font-medium">
              Lista
            </label>
            <NativeSelect id={`${id}-lista`} name="lista" defaultValue={listas[0].id} className="w-full">
              {listas.map((l) => (
                <NativeSelectOption key={l.id} value={l.id}>
                  {l.nome}
                  {l.temItem ? " (já salvo)" : ""}
                </NativeSelectOption>
              ))}
              <NativeSelectOption value="nova">Nova lista…</NativeSelectOption>
            </NativeSelect>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-nova`} className="text-sm font-medium">
            {listas.length > 0 ? "Nome da lista nova (se escolheu “Nova lista”)" : "Nome da lista"}
          </label>
          <Input id={`${id}-nova`} name="novaLista" maxLength={80} required={listas.length === 0} placeholder="Ex.: Para a reportagem" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-nota`} className="text-sm font-medium">
            Anotação (opcional, só você vê)
          </label>
          <Textarea id={`${id}-nota`} name="nota" maxLength={2000} rows={3} />
        </div>
        <Button type="submit" className="w-fit">
          Salvar
        </Button>
      </form>
    </details>
  );
}
