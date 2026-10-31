import Link from "next/link";

import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { Rolavel, Secao } from "@/components/perfil-parlamentar";
import { Termo } from "@/components/termo";
import { formatarMesAno } from "@/lib/format/datas";
import type { Casa } from "@/lib/generated/prisma/enums";
import type { IdTermo } from "@/lib/glossario";
import { getCampanhaParlamentar, getPatrimonioParlamentar } from "@/lib/tse/queries";

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

type Patrimonio = Awaited<ReturnType<typeof getPatrimonioParlamentar>>;

const variacao = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });

/** "cresceu 104%", "caiu 12%", "ficou igual"; de zero não há percentual, só o valor novo. */
function mudou(antes: number, depois: number) {
  if (antes === depois) return "ficou igual";
  if (antes === 0) return `passou de zero para ${reaisDeCentavos(depois)}`;
  const taxa = Math.abs(depois / antes - 1);
  return `${depois > antes ? "cresceu" : "caiu"} ${percentual.format(taxa)}`;
}

/** Frases em linguagem simples comparando a última eleição com a anterior e, se houver mais, com a primeira. */
function resumoPatrimonio({ eleicoes }: Patrimonio) {
  const ultima = eleicoes.at(-1)!;
  const comparar = (de: (typeof eleicoes)[number]) => {
    const declarado = `De ${de.ano} para ${ultima.ano}, o patrimônio declarado ${mudou(de.totalBens, ultima.totalBens)}`;
    const real =
      de.corrigido !== null && ultima.corrigido !== null && de.totalBens > 0
        ? `; descontada a inflação, ${mudou(de.corrigido, ultima.corrigido)}`
        : "";
    return `${declarado}${real}.`;
  };
  const frases = [comparar(eleicoes.at(-2)!)];
  if (eleicoes.length > 2) frases.push(comparar(eleicoes[0]));
  return frases;
}

const onde = (e: Patrimonio["eleicoes"][number]) => (e.municipio ? `${titulo(e.municipio)} (${e.uf})` : e.uf);

function EvolucaoPatrimonio({ patrimonio, nome }: { patrimonio: Patrimonio; nome: string }) {
  const { eleicoes, corrigidoAte } = patrimonio;
  const corrigir = corrigidoAte !== null && eleicoes.some((e) => e.corrigido !== null);
  const hoje = corrigidoAte && formatarMesAno(corrigidoAte.ano, corrigidoAte.mes);
  return (
    <section aria-labelledby="evolucao-patrimonio" className="flex flex-col gap-3">
      <h3 id="evolucao-patrimonio" className="text-lg font-semibold">
        Como o patrimônio declarado mudou
      </h3>
      <div className="flex max-w-[70ch] flex-col gap-2 text-sm">
        {eleicoes.length > 1 &&
          resumoPatrimonio(patrimonio).map((frase) => (
            <p key={frase} className="text-base">
              {frase}
            </p>
          ))}
        <p className="text-muted-foreground">
          Soma dos <Termo id="bens-declarados">bens declarados</Termo> ao TSE em cada eleição que {nome} disputou desde
          2014, inclusive para prefeito e vereador. É o valor que a própria pessoa informou ao se candidatar, não uma
          avaliação de mercado.
          {corrigir && (
            <>
              {" "}
              A última coluna mostra o <Termo id="valor-corrigido">valor corrigido</Termo> pelo{" "}
              <Termo id="ipca">IPCA</Termo> até {hoje}.
            </>
          )}
        </p>
      </div>
      <Tabela legenda={`Bens declarados por ${nome} ao TSE em cada eleição`}>
        <THead>
          <Tr>
            <Th>Eleição</Th>
            <Th>Disputou</Th>
            <Th numero>Bens declarados</Th>
            <Th numero>Mudança desde a anterior</Th>
            {corrigir && <Th numero>Em reais de {hoje}</Th>}
          </Tr>
        </THead>
        <TBody>
          {eleicoes.map((e, i) => {
            const anterior = eleicoes[i - 1];
            const diferenca = anterior && e.totalBens - anterior.totalBens;
            return (
              <Tr key={e.ano}>
                <Th scope="row">{e.ano}</Th>
                <Td rotulo="Disputou">
                  {titulo(e.cargo)} em {onde(e)} · {e.partido}
                  {e.resultado && <span className="block text-xs text-muted-foreground">{titulo(e.resultado)}</span>}
                </Td>
                <Td numero rotulo="Bens declarados">
                  {reaisDeCentavos(e.totalBens)}
                  <span className="block text-xs text-muted-foreground">
                    {e.quantidadeBens === 1 ? "1 bem" : `${e.quantidadeBens} bens`}
                  </span>
                </Td>
                <Td numero rotulo="Mudança desde a anterior">
                  {anterior === undefined ? (
                    "—"
                  ) : (
                    <>
                      {diferenca > 0 ? "+" : diferenca < 0 ? "−" : ""}
                      {reaisDeCentavos(Math.abs(diferenca))}
                      {anterior.totalBens > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {variacao.format(e.totalBens / anterior.totalBens - 1)}
                        </span>
                      )}
                    </>
                  )}
                </Td>
                {corrigir && <Td numero rotulo={`Em reais de ${hoje}`}>{e.corrigido === null ? "—" : reaisDeCentavos(e.corrigido)}</Td>}
              </Tr>
            );
          })}
        </TBody>
      </Tabela>
    </section>
  );
}

/** Seção "Eleição e campanha" do perfil, com os dados do TSE. A seção sempre aparece, porque a navegação do perfil aponta para ela. */
export async function CampanhaParlamentar({ casa, idExterno, nome }: { casa: Casa; idExterno: string; nome: string }) {
  const [campanha, patrimonio] = await Promise.all([
    getCampanhaParlamentar({ casa, idExterno }),
    getPatrimonioParlamentar({ casa, idExterno }),
  ]);
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

        {patrimonio.eleicoes.length > 0 && <EvolucaoPatrimonio patrimonio={patrimonio} nome={nome} />}

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
          {patrimonio.corrigidoAte && " Inflação: IPCA mensal do IBGE, série 433 do Banco Central (SGS), desde setembro do ano de cada eleição."}
        </p>
      </div>
    </Secao>
  );
}
