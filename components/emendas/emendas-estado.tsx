import Link from "next/link";

import { SeletorAno } from "@/components/emendas/seletor-ano";
import { Termo } from "@/components/termo";
import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { percentualPago, reaisDeCentavos, ResumoValores } from "@/components/emendas/valores";
import { formatarData } from "@/lib/format/datas";
import { linkAno } from "@/lib/filtros/formularios";
import { getAnosEmendas, getResumoEmendasUf, getUltimaSyncEmendas } from "@/lib/emendas/queries";
import { anoEscolhido, ROTULO_ABRANGENCIA } from "@/lib/emendas/rotulos";
import type { SiglaUf } from "@/lib/ufs";
import { UFS } from "@/lib/ufs";

const MAIS_CIDADES = 20;

/** Seção "Emendas parlamentares" da página do estado, lida do banco sincronizado. */
export async function EmendasEstado({ uf, anoUrl }: { uf: SiglaUf; anoUrl?: string | string[] }) {
  const anos = await getAnosEmendas();

  if (anos.length === 0) {
    return (
      <SecaoEmendas uf={uf}>
        <p className="text-muted-foreground">As emendas ainda não foram carregadas. Volte em breve.</p>
      </SecaoEmendas>
    );
  }

  const ano = anoEscolhido(anoUrl, anos);
  const [resumo, atualizadoEm] = await Promise.all([getResumoEmendasUf(uf, ano), getUltimaSyncEmendas()]);
  const porNome = [...resumo.municipios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <SecaoEmendas uf={uf}>
      <SeletorAno anos={anos} ano={ano} acao={`/estados/${uf}`} />

      <ResumoValores totais={resumo.totais} quantidade={resumo.quantidade} />

      {resumo.quantidade > 0 && (
        <>
          <section aria-labelledby="destinos" className="flex flex-col gap-3">
            <h3 id="destinos" className="text-lg font-semibold">
              Para onde foi o dinheiro
            </h3>
            <Tabela legenda={`Emendas de ${ano} para ${UFS[uf]} por destino`}>
              <THead>
                <Tr>
                  <Th>Destino</Th>
                  <Th numero>Registros</Th>
                  <Th numero>Empenhado</Th>
                  <Th numero>Pago</Th>
                </Tr>
              </THead>
              <TBody>
                {resumo.porAbrangencia.map((a) => (
                  <Tr key={a.abrangencia}>
                    <Th scope="row" className="font-normal">
                      {ROTULO_ABRANGENCIA[a.abrangencia]}
                    </Th>
                    <Td numero rotulo="Registros">{a.quantidade.toLocaleString("pt-BR")}</Td>
                    <Td numero rotulo="Empenhado">{reaisDeCentavos(a.totais.empenhado)}</Td>
                    <Td numero rotulo="Pago">{reaisDeCentavos(a.totais.pago)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Tabela>
          </section>

          {resumo.municipios.length > 0 && (
            <section aria-labelledby="cidades" className="flex flex-col gap-3">
              <h3 id="cidades" className="text-lg font-semibold">
                Cidades que mais receberam
              </h3>
              <TabelaCidades
                uf={uf}
                ano={ano}
                cidades={resumo.municipios.slice(0, MAIS_CIDADES)}
                legenda={`As ${Math.min(MAIS_CIDADES, resumo.municipios.length)} cidades de ${UFS[uf]} com mais valor pago em ${ano}`}
              />
              {resumo.municipios.length > MAIS_CIDADES && (
                <details className="group rounded-lg border bg-card">
                  <summary className="cursor-pointer rounded-lg px-4 py-3 font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    Ver todas as {resumo.municipios.length} cidades em ordem alfabética
                  </summary>
                  <ul className="grid gap-x-6 gap-y-1 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                    {porNome.map((m) => (
                      <li key={m.ibge}>
                        <Link
                          href={linkAno(`/estados/${uf}/${m.ibge}`, { ano })}
                          className="text-link underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {m.nome}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}

          <section aria-labelledby="autores" className="flex flex-col gap-3">
            <h3 id="autores" className="text-lg font-semibold">
              Quem mandou mais dinheiro pago
            </h3>
            <Tabela legenda={`Autores das emendas de ${ano} para ${UFS[uf]}, por valor pago`}>
              <THead>
                <Tr>
                  <Th>Autor</Th>
                  <Th numero>Registros</Th>
                  <Th numero>Empenhado</Th>
                  <Th numero>Pago</Th>
                </Tr>
              </THead>
              <TBody>
                {resumo.autores.map((a) => (
                  <Tr key={a.nome}>
                    <Th scope="row" className="font-normal">
                      {a.nome}
                    </Th>
                    <Td numero rotulo="Registros">{a.quantidade.toLocaleString("pt-BR")}</Td>
                    <Td numero rotulo="Empenhado">{reaisDeCentavos(a.totais.empenhado)}</Td>
                    <Td numero rotulo="Pago">{reaisDeCentavos(a.totais.pago)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Tabela>
          </section>
        </>
      )}

      <SobreOsDados atualizadoEm={atualizadoEm} />
    </SecaoEmendas>
  );
}

function SecaoEmendas({ uf, children }: { uf: SiglaUf; children: React.ReactNode }) {
  return (
    <section aria-labelledby="emendas" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="emendas" className="text-2xl font-bold">
          Emendas parlamentares para {UFS[uf]}
        </h2>
        <p className="max-w-[65ch] text-muted-foreground">
          <Termo id="emenda">Emendas</Termo> são a parte do <Termo id="orcamento">orçamento federal</Termo> que deputados
          e senadores escolhem para onde vai. Aqui estão as destinadas ao governo do estado e às cidades de {UFS[uf]}.
        </p>
      </div>
      {children}
    </section>
  );
}

export function TabelaCidades({
  uf,
  ano,
  cidades,
  legenda,
}: {
  uf: SiglaUf;
  ano: number;
  cidades: { ibge: number; nome: string; quantidade: number; totais: { empenhado: number; liquidado: number; pago: number } }[];
  legenda: string;
}) {
  return (
    <Tabela legenda={legenda}>
      <THead>
        <Tr>
          <Th>Cidade</Th>
          <Th numero>Registros</Th>
          <Th numero>Empenhado</Th>
          <Th numero>Pago</Th>
          <Th numero>% pago</Th>
        </Tr>
      </THead>
      <TBody>
        {cidades.map((m) => (
          <Tr key={m.ibge}>
            <Th scope="row" className="font-normal">
              <Link
                href={linkAno(`/estados/${uf}/${m.ibge}`, { ano })}
                className="text-link underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {m.nome}
              </Link>
            </Th>
            <Td numero rotulo="Registros">{m.quantidade.toLocaleString("pt-BR")}</Td>
            <Td numero rotulo="Empenhado">{reaisDeCentavos(m.totais.empenhado)}</Td>
            <Td numero rotulo="Pago">{reaisDeCentavos(m.totais.pago)}</Td>
            <Td numero rotulo="% pago">{percentualPago(m.totais) ?? "—"}</Td>
          </Tr>
        ))}
      </TBody>
    </Tabela>
  );
}

export function SobreOsDados({ atualizadoEm }: { atualizadoEm: Date | null }) {
  return (
    <details className="rounded-lg border bg-card text-sm">
      <summary className="cursor-pointer rounded-lg px-4 py-3 font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        Sobre estes dados
      </summary>
      <div className="flex max-w-[70ch] flex-col gap-2 px-4 pb-4 text-muted-foreground">
        <p>
          Fonte: Portal da Transparência do Governo Federal. Dados atualizados em{" "}
          {atualizadoEm ? formatarData(atualizadoEm) : "data ainda não registrada"}.
        </p>
        <p>
          Os valores são somados por ano do orçamento. Uma mesma emenda pode aparecer em mais de um registro quando o
          dinheiro vai para lugares ou áreas diferentes.
        </p>
        <p>
          Emendas marcadas pelo governo como &quot;nacionais&quot; ou para &quot;vários locais&quot; não dizem em qual
          cidade o dinheiro foi gasto, então não aparecem aqui.
        </p>
      </div>
    </details>
  );
}
