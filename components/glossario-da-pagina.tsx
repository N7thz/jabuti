import Link from "next/link";

import { GLOSSARIO } from "@/lib/glossario";

// Cada verbete só aparece se a página tiver um <Termo> que aponte para ele (data-termo-ref), e a
// seção inteira some quando não há nenhum. Feito em CSS com :has() para funcionar sem JavaScript,
// com streaming (seções que chegam depois também contam) e com componentes em cache.
const CSS = [
  "#termos-da-pagina, #termos-da-pagina [data-verbete] { display: none; }",
  ":root:has([data-termo-ref]) #termos-da-pagina { display: flex; }",
  ...GLOSSARIO.map(
    (v) => `:root:has([data-termo-ref="${v.id}"]) #termos-da-pagina [data-verbete="${v.id}"] { display: block; }`,
  ),
].join("\n");

/** "Termos desta página": as explicações de cada termo usado, no fim da página. Fica no layout. */
export function GlossarioDaPagina() {
  return (
    <>
      <style href="glossario-da-pagina" precedence="default">
        {CSS}
      </style>
      <aside
        id="termos-da-pagina"
        aria-labelledby="titulo-termos-da-pagina"
        className="mx-auto w-full max-w-7xl flex-col gap-4 border-t px-4 py-10 xs:px-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id="titulo-termos-da-pagina" className="text-xl font-bold">
            Termos desta página
          </h2>
          <p className="text-sm text-muted-foreground">
            O que significam as palavras sublinhadas acima. Para voltar ao ponto em que estava, use o botão voltar do
            navegador.
          </p>
        </div>
        <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          {GLOSSARIO.map((v) => (
            <div key={v.id} id={`glossario-${v.id}`} data-verbete={v.id} className="scroll-mt-24 target:rounded-lg target:bg-accent target:p-3">
              <dt className="font-semibold">{v.termo}</dt>
              <dd className="text-muted-foreground">
                {v.curto}{" "}
                <Link href={`/glossario?termo=${v.id}#${v.id}`} className="text-link underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Entender melhor
                </Link>
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    </>
  );
}
