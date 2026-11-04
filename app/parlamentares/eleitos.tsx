import { UsersIcon } from "lucide-react";
import Link from "next/link";

import { AvisoFonte } from "@/components/aviso-fonte";
import { ComposicaoParlamento } from "@/components/composicao-parlamento";
import { Paginacao } from "@/components/paginacao";
import { hrefParlamentar, iniciais } from "@/components/parlamentar-item";
import { RolarAoMudar } from "@/components/rolar-ao-mudar";
import { Termo } from "@/components/termo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { ANO_ELEICAO, type EleitoResumo, filtrarEleitos, SENADORES_QUE_FICAM } from "@/lib/eleicoes/eleitos";
import { getComposicao, listarEleitos } from "@/lib/eleicoes/queries";
import { lerFiltros } from "@/lib/filtros/schemas";
import { UFS, type SiglaUf } from "@/lib/ufs";

import { filtrosParlamentares, lerUrlParlamentares, linkParlamentares, paginaParlamentares } from "./filtros";

const POR_PAGINA = 30;

type Params = Awaited<PageProps<"/parlamentares">["searchParams"]>;

const CASA = { camara: "Deputado(a) federal", senado: "Senador(a)" } as const;
const CARGO = { camara: "deputado(a)", senado: "senador(a)" } as const;

function Selo({ eleito: e }: { eleito: EleitoResumo }) {
  switch (e.situacao) {
    case "reeleito":
      return <Badge>Reeleito(a)</Badge>;
    case "mesma-casa":
      return <Badge>{e.casa === "camara" ? "Já está na Câmara" : "Já está no Senado"}</Badge>;
    case "outra-casa":
      return <Badge variant="secondary">Hoje é {CARGO[e.casaAtual ?? "camara"]}</Badge>;
    case "ja-foi":
      return <Badge variant="outline">Já foi {CARGO[e.casaAtual ?? "camara"]}</Badge>;
    default:
      return <Badge variant="outline">Novo(a)</Badge>;
  }
}

function EleitoItem({ eleito: e }: { eleito: EleitoResumo }) {
  return (
    <Item variant="outline" render={e.perfil ? <Link href={hrefParlamentar(e.perfil)} /> : undefined}>
      <ItemMedia>
        <Avatar size="lg">
          {e.fotoUrl && <AvatarImage src={e.fotoUrl} alt="" />}
          <AvatarFallback>{iniciais(e.nomeUrna)}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{e.nomeUrna}</ItemTitle>
        <ItemDescription>
          {CASA[e.casa]} · {e.partido}/{e.uf}
          {e.resultado === "ELEITO POR MÉDIA" && " · por média"}
        </ItemDescription>
      </ItemContent>
      <Selo eleito={e} />
    </Item>
  );
}

/** Composição das casas a partir da posse: um gráfico por casa, ou só o da casa filtrada. */
async function Composicoes({ lista, casa, uf }: { lista: EleitoResumo[]; casa?: "camara" | "senado"; uf?: string }) {
  const composicao = await getComposicao(ANO_ELEICAO, lista, uf);
  const estado = uf ? UFS[uf as SiglaUf] : null;
  const { senado } = composicao;
  const posse = `A partir de 1º de fevereiro de ${ANO_ELEICAO + 1}`;
  const faltaNoSenado = senado.esperado !== null && senado.total !== senado.esperado;
  const esperadoQueFicam = uf ? 1 : SENADORES_QUE_FICAM;

  return (
    <section aria-labelledby="composicao" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="composicao" className="text-lg font-semibold">
          <Termo id="composicao-casa">Composição</Termo> {estado ? `da bancada de ${estado}` : "das casas"} a partir de{" "}
          {ANO_ELEICAO + 1}
        </h2>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Pelo partido com que cada um foi eleito. Os filtros de partido e de nome não mudam os gráficos
          {uf ? "; o de estado mostra a bancada daquele estado." : "."}
        </p>
      </div>
      {composicao.falhaSenado && (!casa || casa === "senado") && (
        <AvisoFonte
          fontes={[composicao.falhaSenado]}
          consequencia="O gráfico do Senado mostra só os eleitos agora, sem os senadores que continuam no mandato."
        />
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {(!casa || casa === "camara") && (
          <ComposicaoParlamento
            composicao={composicao.camara}
            titulo={estado ? `Deputados federais de ${estado}` : "Câmara dos Deputados"}
            subtitulo={`${posse}. Todas as cadeiras foram eleitas em ${ANO_ELEICAO}.`}
            nota={
              composicao.camara.esperado !== null && composicao.camara.total !== composicao.camara.esperado ? (
                <p>
                  A Câmara tem {composicao.camara.esperado} cadeiras, mas a lista do TSE trouxe {composicao.camara.total}{" "}
                  eleitos até agora: algum resultado pode estar em recurso na Justiça Eleitoral.
                </p>
              ) : undefined
            }
          />
        )}
        {(!casa || casa === "senado") && (
          <ComposicaoParlamento
            composicao={senado}
            titulo={estado ? `Senadores de ${estado}` : "Senado Federal"}
            subtitulo={`${posse}.`}
            nota={
              <>
                <p>
                  Pela <Termo id="renovacao-senado">renovação do Senado</Termo>, só{" "}
                  {uf ? "duas das três cadeiras do estado foram eleitas" : "54 das 81 cadeiras foram eleitas"} em{" "}
                  {ANO_ELEICAO}. {uf ? "A outra é" : `As outras ${SENADORES_QUE_FICAM} são`} de quem foi eleito em{" "}
                  {ANO_ELEICAO - 4} e fica até {ANO_ELEICAO + 5}
                  {uf ? "" : (
                    <>
                      {" "}
                      (ou do <Termo id="suplente">suplente</Termo> que assumiu)
                    </>
                  )}
                  , contada pelo partido de hoje.
                </p>
                {faltaNoSenado && (
                  <p className="mt-1">
                    O total não fecha em {senado.esperado}: encontramos {senado.total - (senado.queFicam ?? 0)} eleitos em{" "}
                    {ANO_ELEICAO} e {senado.queFicam ?? 0} de {esperadoQueFicam} {esperadoQueFicam === 1 ? "senador" : "senadores"}{" "}
                    em exercício com mandato até {ANO_ELEICAO + 5}, segundo o Senado. Pode faltar um senador afastado sem
                    suplente em exercício, ou algum resultado do TSE ainda estar em recurso.
                  </p>
                )}
              </>
            }
          />
        )}
      </div>
    </section>
  );
}

/** Lista dos eleitos (com a composição acima), no lugar da lista de parlamentares em exercício. */
export async function ListaEleitos({ params, querFixados }: { params: Params; querFixados: boolean }) {
  const resultado = await listarEleitos(ANO_ELEICAO);
  if (!resultado.ok) {
    return (
      <AvisoFonte
        fontes={[resultado.falha]}
        consequencia={
          resultado.naoCarregado
            ? "A lista e os gráficos de composição aparecem assim que a carga terminar. Enquanto isso, a lista de parlamentares em exercício continua disponível."
            : "Sem essa lista, não há como mostrar os eleitos agora."
        }
      />
    );
  }

  const todos = resultado.lista;
  // Filtro inválido: o erro aparece no formulário e a lista vem completa.
  const { nome, casa, uf, partido } = lerFiltros(filtrosParlamentares, params).valores ?? {};
  const lista = filtrarEleitos(todos, { nome, casa, uf, partido });
  const avisoFixados = querFixados && (
    <p className="text-sm text-muted-foreground">
      O filtro &quot;Só os fixados&quot; vale só para os parlamentares em exercício e foi ignorado aqui.
    </p>
  );

  const composicao = <Composicoes lista={todos} casa={casa} uf={uf} />;

  if (lista.length === 0) {
    return (
      <>
        {composicao}
        {avisoFixados}
        <Empty className="rounded-lg border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Ninguém encontrado</EmptyTitle>
            <EmptyDescription>Nenhum eleito em {ANO_ELEICAO} com esses filtros.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    );
  }

  const deputados = lista.filter((e) => e.casa === "camara").length;
  const totalPaginas = Math.ceil(lista.length / POR_PAGINA);
  const pagina = Math.min(lerFiltros(paginaParlamentares, params).valores?.pagina ?? 1, totalPaginas);
  const inicio = (pagina - 1) * POR_PAGINA;
  const link = (p: number) => linkParlamentares("/parlamentares", { ...lerUrlParlamentares(params), pagina: p });

  return (
    <>
      {composicao}
      <section id="resultados" aria-labelledby="resultado" className="flex scroll-mt-24 flex-col gap-4">
        <RolarAoMudar alvo="resultados" chave={`eleitos|${nome ?? ""}|${casa ?? ""}|${uf ?? ""}|${partido ?? ""}|${pagina}`} />
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b pb-3">
          <h2 id="resultado" className="text-lg font-semibold" aria-live="polite">
            {lista.length} {lista.length === 1 ? "eleito" : "eleitos"}
            {totalPaginas > 1 && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · página {pagina} de {totalPaginas}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {deputados} para a Câmara · {lista.length - deputados} para o Senado
          </p>
        </div>
        {avisoFixados}
        <ItemGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.slice(inicio, inicio + POR_PAGINA).map((e) => (
            <EleitoItem key={e.id} eleito={e} />
          ))}
        </ItemGroup>
        <Paginacao pagina={pagina} total={totalPaginas} href={link} scroll={false} />
        <div className="flex flex-col gap-1 border-t pt-3 text-sm text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">Reeleito(a)</strong>: foi eleito(a) titular da cadeira que ocupa
            hoje na mesma casa.{" "}
            <strong className="font-medium text-foreground">Já está na Câmara ou no Senado</strong>: está em exercício na
            mesma casa como <Termo id="suplente">suplente</Termo>, ou o portal não tem a candidatura anterior para
            confirmar.{" "}
            <strong className="font-medium text-foreground">Hoje é deputado(a) ou senador(a)</strong>: vai trocar de casa.{" "}
            <strong className="font-medium text-foreground">Já foi</strong>: está no cadastro do portal como ex-parlamentar e
            não está em exercício hoje. <strong className="font-medium text-foreground">Novo(a)</strong>: não aparece no
            cadastro do portal, que começa na <Termo id="legislatura">legislatura</Termo> atual (desde 2023); pode ter tido
            mandato antes. Quem já tem perfil no portal leva a ele.
          </p>
          <p>
            Deputados marcados &quot;por média&quot; ficaram com uma das vagas que sobraram na divisão pelo{" "}
            <Termo id="sistema-proporcional">sistema proporcional</Termo>; os outros, com as garantidas pelos votos do
            partido. Senadores são eleitos por maioria: vence quem tem mais votos no estado. Fonte: Tribunal Superior Eleitoral (TSE).
          </p>
        </div>
      </section>
    </>
  );
}

/** Siglas dos partidos com eleitos, para o filtro; lista vazia se os eleitos não estiverem disponíveis. */
export async function partidosDosEleitos() {
  const r = await listarEleitos(ANO_ELEICAO);
  if (!r.ok) return [];
  return [...new Set(r.lista.map((e) => e.partido))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
