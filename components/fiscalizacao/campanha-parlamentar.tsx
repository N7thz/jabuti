import Link from "next/link";

import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { Rolavel, Secao } from "@/components/perfil-parlamentar";
import { Termo } from "@/components/termo";
import type { Casa } from "@/lib/generated/prisma/enums";
import type { IdTermo } from "@/lib/glossario";
import { getCampanhaParlamentar } from "@/lib/tse/queries";

const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

// O TSE chama o fundo eleitoral de "FUNDO ESPECIAL"; em linguagem simples, dizendo que é dinheiro público.
const FONTES: Record<string, [string, IdTermo]> = {
  "FUNDO ESPECIAL": ["Fundo eleitoral (dinheiro público)", "fundo-eleitoral"],
  "FUNDO PARTIDARIO": ["Fundo partidário (dinheiro público)", "fundo-partidario"],
  "OUTROS RECURSOS": ["Doações e recursos próprios", "doacao"],
};
const fonte = (f: string) => FONTES[f]?.[0] ?? f;

function Fonte({ fonte: f }: { fonte: string }) {
  const conhecida = FONTES[f];
  return conhecida ? <Termo id={conhecida[1]}>{conhecida[0]}</Termo> : <>{f}</>;
}

const titulo = (texto: string) => texto.charAt(0) + texto.slice(1).toLowerCase();

/** Seção "Eleição e campanha" do perfil, com os dados do TSE. A seção sempre aparece, porque a navegação do perfil aponta para ela. */
export async function CampanhaParlamentar({ casa, idExterno, nome }: { casa: Casa; idExterno: string; nome: string }) {
  const campanha = await getCampanhaParlamentar({ casa, idExterno });
  if (!campanha) {
    return (
      <Secao id="campanha" titulo="Eleição e campanha">
        <p className="text-muted-foreground">Os dados do TSE sobre a eleição de {nome} ainda não foram carregados.</p>
      </Secao>
    );
  }

  const numeros: [string, IdTermo | null, string][] = [
    ["Votos recebidos", null, campanha.totalVotos.toLocaleString("pt-BR")],
    ["Arrecadou na campanha", "doacao", reaisDeCentavos(campanha.totalReceitas)],
    ["Bens declarados", "bens-declarados", reaisDeCentavos(campanha.totalBens)],
  ];
  // "ELEITO POR QP" / "ELEITO POR MÉDIA" só fazem sentido com a explicação do sistema proporcional.
  const proporcional = campanha.resultado && /QP|M[ÉE]DIA/.test(campanha.resultado);

  return (
    <Secao
      id="campanha"
      titulo="Eleição e campanha"
      descricao={
        <>
          {titulo(campanha.cargo)} em {campanha.ano} por {campanha.uf} · {campanha.partido} {campanha.numero}
          {campanha.resultado && " · "}
          {campanha.resultado &&
            (proporcional ? (
              <Termo id="sistema-proporcional">{titulo(campanha.resultado)}</Termo>
            ) : (
              titulo(campanha.resultado)
            ))}
        </>
      }
    >
      <div className="flex flex-col gap-8">
        <dl className="@container grid gap-3 sm:grid-cols-3">
          {numeros.map(([rotulo, termo, valor]) => (
            <div key={rotulo} className="flex flex-col gap-1 rounded-lg border bg-card p-4">
              <dt className="text-sm text-muted-foreground">{termo ? <Termo id={termo}>{rotulo}</Termo> : rotulo}</dt>
              <dd className="font-mono text-xl font-bold tabular-nums [overflow-wrap:anywhere]">{valor}</dd>
            </div>
          ))}
        </dl>

        {campanha.cidades.length > 0 && (
          <section aria-labelledby="votos-emendas" className="flex flex-col gap-3">
            <h3 id="votos-emendas" className="text-lg font-semibold">
              Onde foi votado e quanto mandou para lá
            </h3>
            <p className="max-w-[70ch] text-sm text-muted-foreground">
              As cidades que mais votaram em {nome} em {campanha.ano} e as emendas pagas que esse parlamentar destinou a
              cada uma (todos os anos carregados).
            </p>
            <Tabela legenda={`Cidades que mais votaram em ${nome} e emendas pagas para cada uma`}>
              <THead>
                <Tr>
                  <Th>Cidade</Th>
                  <Th numero>Votos</Th>
                  <Th numero>% dos votos</Th>
                  <Th numero>Emendas pagas</Th>
                </Tr>
              </THead>
              <TBody>
                {campanha.cidades.map((c) => (
                  <Tr key={c.ibge}>
                    <Th scope="row" className="font-normal">
                      <Link
                        href={`/estados/${c.uf}/${c.ibge}`}
                        className="text-link underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {c.nome}
                      </Link>
                    </Th>
                    <Td numero rotulo="Votos">{c.votos.toLocaleString("pt-BR")}</Td>
                    <Td numero rotulo="% dos votos">
                      {campanha.totalVotos ? percentual.format(c.votos / campanha.totalVotos) : "—"}
                    </Td>
                    <Td numero rotulo="Emendas pagas">{c.emendasPagas ? reaisDeCentavos(c.emendasPagas) : "—"}</Td>
                  </Tr>
                ))}
              </TBody>
            </Tabela>
          </section>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-2">
          <section aria-labelledby="financiamento" className="flex flex-col gap-3">
            <h3 id="financiamento" className="text-lg font-semibold">
              Quem pagou a campanha
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {campanha.receitasPorFonte.map((r) => (
                <li key={r.fonte} className="flex justify-between gap-4">
                  <span>
                    <Fonte fonte={r.fonte} />
                  </span>
                  <span className="font-mono tabular-nums">{reaisDeCentavos(r.valor)}</span>
                </li>
              ))}
            </ul>
            {campanha.doadores.length > 0 && (
              <Rolavel>
                <Tabela legenda={`Maiores doadores da campanha de ${nome} em ${campanha.ano}`}>
                  <THead>
                    <Tr>
                      <Th>Doador</Th>
                      <Th>Origem</Th>
                      <Th numero>Valor</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {campanha.doadores.map((d) => (
                      <Tr key={d.doador + d.origem + d.fonte}>
                        <Th scope="row" className="font-normal">
                          {d.doador}
                        </Th>
                        <Td rotulo="Origem">
                          {titulo(d.origem)}
                          <span className="block text-xs text-muted-foreground">{fonte(d.fonte)}</span>
                        </Td>
                        <Td numero rotulo="Valor">{reaisDeCentavos(d.valor)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Tabela>
              </Rolavel>
            )}
          </section>

          {campanha.bens.length > 0 && (
            <section aria-labelledby="bens" className="flex flex-col gap-3">
              <h3 id="bens" className="text-lg font-semibold">
                Maiores <Termo id="bens-declarados">bens declarados</Termo>
              </h3>
              <Rolavel>
                <Tabela legenda={`Maiores bens declarados por ${nome} ao TSE em ${campanha.ano}`}>
                  <THead>
                    <Tr>
                      <Th>Bem</Th>
                      <Th numero>Valor</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {campanha.bens.map((b, i) => (
                      <Tr key={i}>
                        <Th scope="row" className="font-normal">
                          {b.tipo}
                          <span className="block text-xs text-muted-foreground">{b.descricao}</span>
                        </Th>
                        <Td numero rotulo="Valor">{reaisDeCentavos(b.valor)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Tabela>
              </Rolavel>
            </section>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Fonte: Dados Abertos do TSE (candidaturas, bens, prestação de contas e votação por município, 1º turno).
        </p>
      </div>
    </Secao>
  );
}
