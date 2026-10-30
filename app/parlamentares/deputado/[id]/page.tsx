import { ExternalLinkIcon, FileTextIcon, ReceiptIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BaixarCsv } from "@/components/baixar-csv";
import { Compartilhar } from "@/components/compartilhar";
import { VotosEEmendasParlamentar } from "@/components/cruzamentos/votos-emendas";
import { EmendasLista } from "@/components/emendas-lista";
import { CampanhaParlamentar } from "@/components/fiscalizacao/campanha-parlamentar";
import { FiscalizacaoParlamentar } from "@/components/fiscalizacao/fiscalizacao-parlamentar";
import { alvosDoParlamentar, BotoesFixar } from "@/components/fixar";
import { Cabecalho, NavSecoes, PerfilSkeleton, Rolavel, Secao, SecaoSkeleton, Voltar } from "@/components/perfil-parlamentar";
import { Termo } from "@/components/termo";
import { HistoricoVotos } from "@/components/votacoes/historico";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarData } from "@/lib/format/datas";
import { classificarProposicoes, porcentagem, Resumo, ResumoSkeleton } from "@/components/resumo-parlamentar";
import { formatarReais, reais, reaisDoTexto, somar } from "@/lib/format/dinheiro";
import {
  getDeputado,
  getDespesasDeputado,
  getEmendasDoAutor,
  getPresencaDeputado,
  getProposicoesDeputado,
} from "@/lib/parlamentares/queries";
import { getVotosDeputado, ultimaCarga } from "@/lib/votacoes/queries";

export async function generateMetadata({ params }: PageProps<"/parlamentares/deputado/[id]">): Promise<Metadata> {
  const deputado = await getDeputado((await params).id);
  return { title: `${deputado?.ultimoStatus.nome ?? "Deputado"} · Jabuti` };
}

export default function DeputadoPage({ params }: PageProps<"/parlamentares/deputado/[id]">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Voltar />
      <Suspense fallback={<PerfilSkeleton />}>
        {params.then(({ id }) => (
          <Deputado id={id} />
        ))}
      </Suspense>
    </div>
  );
}

async function Deputado({ id }: { id: string }) {
  const deputado = await getDeputado(id);
  if (!deputado) notFound();
  const s = deputado.ultimoStatus;
  const naturalidade = [deputado.municipioNascimento, deputado.ufNascimento].filter(Boolean).join("/");

  const dados: [string, React.ReactNode][] = [["Nome civil", deputado.nomeCivil]];
  if (deputado.dataNascimento) {
    dados.push(["Nascimento", `${formatarData(deputado.dataNascimento)}${naturalidade && ` em ${naturalidade}`}`]);
  }
  if (deputado.escolaridade) dados.push(["Escolaridade", deputado.escolaridade]);
  if (s.email) {
    dados.push([
      "E-mail",
      <a key="email" className="text-link underline" href={`mailto:${s.email}`}>
        {s.email}
      </a>,
    ]);
  }
  if (s.gabinete?.telefone) {
    dados.push(["Gabinete", `Sala ${s.gabinete.sala}, prédio ${s.gabinete.predio} · (61) ${s.gabinete.telefone}`]);
  }

  return (
    <>
      <Cabecalho
        nome={s.nome}
        fotoUrl={s.urlFoto}
        cargo="Deputado(a) federal"
        partido={s.siglaPartido}
        uf={s.siglaUf}
        situacao={s.situacao}
        dados={dados}
        acoes={
          // Lê a sessão: fica fora do shell estático e não aparece para visitantes.
          <Suspense fallback={null}>
            <BotoesFixar alvos={alvosDoParlamentar({ casa: "camara", id: deputado.id, nome: s.nome, partido: s.siglaPartido, uf: s.siglaUf })} />
          </Suspense>
        }
      />

      <NavSecoes />

      <Suspense fallback={<ResumoSkeleton />}>
        <ResumoDeputado
          id={deputado.id}
          idLegislatura={s.idLegislatura}
          inicio={s.data}
          nome={s.nomeEleitoral || s.nome}
        />
      </Suspense>

      <Suspense fallback={<SecaoSkeleton titulo="Como votou" />}>
        <VotosDeputado id={String(deputado.id)} />
      </Suspense>

      {/* Sem items-start: os dois cards esticam até a mesma altura (a da cota). */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SecaoSkeleton titulo="Cota parlamentar" />}>
          <Cota id={deputado.id} idLegislatura={s.idLegislatura} />
        </Suspense>
        <Suspense fallback={<SecaoSkeleton titulo="Proposições" />}>
          <Proposicoes id={deputado.id} />
        </Suspense>
      </div>

      <Suspense fallback={<SecaoSkeleton titulo="Emendas" />}>
        <Emendas nome={s.nomeEleitoral || s.nome} />
      </Suspense>

      <Suspense fallback={<SecaoSkeleton titulo="Votos e emendas" />}>
        <VotosEEmendasParlamentar casa="CAMARA" idExterno={String(deputado.id)} />
      </Suspense>

      <Suspense fallback={<SecaoSkeleton titulo="Eleição e campanha" />}>
        <CampanhaParlamentar casa="CAMARA" idExterno={String(deputado.id)} nome={s.nome} />
      </Suspense>

      <Suspense fallback={<SecaoSkeleton titulo="Fiscalização" />}>
        <FiscalizacaoParlamentar
          casa="CAMARA"
          idExterno={String(deputado.id)}
          nome={s.nome}
          nomeCivil={deputado.nomeCivil}
          cpf={deputado.cpf}
          uf={s.siglaUf}
        />
      </Suspense>
    </>
  );
}

async function ResumoDeputado({
  id,
  idLegislatura,
  inicio,
  nome,
}: {
  id: number;
  idLegislatura: number;
  inicio: string | null;
  nome: string;
}) {
  const [presenca, cota, proposicoes, emendas] = await Promise.all([
    getPresencaDeputado(id, inicio),
    getDespesasDeputado(id, idLegislatura),
    getProposicoesDeputado(id),
    getEmendasDoAutor(nome),
  ]);
  const faltas = presenca.sessoes - presenca.presencas;
  const tipos = classificarProposicoes(proposicoes.map((p) => p.siglaTipo));
  const empenhado = somar(emendas.emendas.map((e) => reaisDoTexto(e.valorEmpenhado)));
  const pago = somar(emendas.emendas.map((e) => reaisDoTexto(e.valorPago)));
  const gastoCota = formatarReais(somar(cota.despesas.map((d) => reais(d.valorLiquido))));

  return (
    <>
      <Resumo
        titulo={`Resumo de ${cota.ano}`}
        indicadores={[
          {
            rotulo: "Presença no plenário",
            termo: "presenca",
            valor: porcentagem(presenca.presencas, presenca.sessoes),
            medidor: { parte: presenca.presencas, total: presenca.sessoes },
            detalhe: `Esteve em ${presenca.presencas} de ${presenca.sessoes} sessões deliberativas`,
          },
          {
            rotulo: "Sessões sem registro de presença",
            termo: "presenca",
            valor: String(faltas),
            detalhe: "A Câmara não informa quais ausências foram justificadas",
          },
          {
            rotulo: "Gasto da cota parlamentar",
            termo: "cota-parlamentar",
            valor: gastoCota,
            detalhe: `${cota.despesas.length} reembolsos em ${cota.ano}`,
          },
          {
            rotulo: "Proposições em 12 meses",
            termo: "proposicao",
            valor: String(proposicoes.length),
            detalhe: `${tipos.projetos} projetos · ${tipos.requerimentos} requerimentos e indicações · ${tipos.outros} outras`,
          },
          {
            rotulo: "Emendas empenhadas",
            termo: "empenho",
            valor: formatarReais(empenhado),
            detalhe: `${emendas.emendas.length} emendas · ${formatarReais(pago)} já pagos`,
          },
        ]}
        metodologia={
          <>
            <p>
              <strong>Presença:</strong> contamos as sessões deliberativas encerradas do plenário desde{" "}
              {formatarData(presenca.desde)} e verificamos em quais o deputado aparece como presente na
              API da Câmara. Audiências, sessões solenes e comissões ficam fora. A Câmara não publica as
              justificativas, então uma sessão sem registro pode ter sido falta justificada (licença,
              missão oficial).
            </p>
            <p>
              <strong>Cota:</strong> soma dos valores líquidos reembolsados no ano. <strong>Proposições:</strong>{" "}
              projetos são PL, PLP, PEC e PDL; requerimentos incluem REQ, RIC e INC.{" "}
              <strong>Emendas:</strong> emendas do ano no Portal da Transparência com o nome parlamentar
              exato.
            </p>
            <p>Dados consultados nas APIs oficiais em {formatarData(presenca.consultadoEm)}.</p>
          </>
        }
      />
      <Compartilhar
        caminho={`/parlamentares/deputado/${id}`}
        texto={`${nome} esteve em ${porcentagem(presenca.presencas, presenca.sessoes)} das sessões deliberativas do plenário em ${cota.ano} e gastou ${gastoCota} da cota parlamentar. Veja os votos, gastos e emendas:`}
      />
    </>
  );
}

async function VotosDeputado({ id }: { id: string }) {
  const [votos, atualizadoEm] = await Promise.all([getVotosDeputado(id), ultimaCarga("CAMARA")]);
  return (
    <HistoricoVotos
      casa="camara"
      idExterno={id}
      votos={votos}
      origem={atualizadoEm ? `dados da Câmara carregados em ${formatarData(atualizadoEm)}` : "dados da Câmara"}
    />
  );
}

async function Cota({ id, idLegislatura }: { id: number; idLegislatura: number }) {
  const { ano, despesas } = await getDespesasDeputado(id, idLegislatura);
  const total = somar(despesas.map((d) => reais(d.valorLiquido)));

  const porTipo = Object.entries(Object.groupBy(despesas, (d) => d.tipoDespesa))
    .map(([tipo, itens = []]) => ({
      tipo,
      total: somar(itens.map((d) => reais(d.valorLiquido))),
      ordem: itens.reduce((soma, d) => soma + d.valorLiquido, 0),
    }))
    .sort((a, b) => b.ordem - a.ordem);
  const recentes = despesas.toSorted((a, b) => (b.dataDocumento ?? "").localeCompare(a.dataDocumento ?? ""));

  return (
    <Secao
      id="cota"
      titulo="Cota parlamentar"
      descricao={
        <>
          Gastos de {ano} da <Termo id="cota-parlamentar">cota</Termo> reembolsados pela Câmara:{" "}
          <strong className="text-foreground">{formatarReais(total)}</strong> em {despesas.length}{" "}
          {despesas.length === 1 ? "lançamento" : "lançamentos"}
        </>
      }
    >
      {despesas.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Sem gastos em {ano}</EmptyTitle>
            <EmptyDescription>Nenhuma despesa da cota registrada neste ano.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-1 flex-col gap-6">
          <Table>
            <TableCaption className="sr-only">Gastos por tipo de despesa em {ano}</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="pl-0 text-muted-foreground">
                  Tipo
                </TableHead>
                <TableHead scope="col" className="pr-0 text-right text-muted-foreground">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porTipo.map((t) => (
                <TableRow key={t.tipo}>
                  <TableHead scope="row" className="h-auto py-2 pl-0 font-normal whitespace-normal">
                    {t.tipo}
                  </TableHead>
                  <TableCell className="pr-0 text-right font-mono">{formatarReais(t.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <BaixarCsv href={`/api/csv/cota?id=${id}&legislatura=${idLegislatura}`} rotulo="Baixar os gastos" />

          <div className="flex flex-1 flex-col gap-3">
            <h3 className="font-semibold">Lançamentos, do mais recente</h3>
            <Rolavel preencher className="lg:min-h-[min(28rem,65dvh)]">
              <ItemGroup className="gap-2">
                {recentes.map((d, i) => (
                  <Item key={`${d.codDocumento}-${i}`} variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle>{d.nomeFornecedor ?? "Fornecedor não informado"}</ItemTitle>
                      <ItemDescription>
                        {formatarData(d.dataDocumento)} · {d.tipoDespesa}
                      </ItemDescription>
                    </ItemContent>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="font-mono">
                        {formatarReais(reais(d.valorLiquido))}
                      </Badge>
                      {d.urlDocumento && (
                        <a
                          href={d.urlDocumento}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-link underline"
                        >
                          Nota fiscal <ExternalLinkIcon aria-hidden="true" className="size-3" />
                          <span className="sr-only">(abre em nova aba)</span>
                        </a>
                      )}
                    </div>
                  </Item>
                ))}
              </ItemGroup>
            </Rolavel>
          </div>
        </div>
      )}
    </Secao>
  );
}

async function Proposicoes({ id }: { id: number }) {
  const proposicoes = await getProposicoesDeputado(id);

  return (
    <Secao id="proposicoes" titulo="Proposições"
      descricao={
        <>
          {proposicoes.length} <Termo id="proposicao">proposições</Termo> apresentadas nos últimos 12 meses
        </>
      }>
      {proposicoes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nenhuma proposição</EmptyTitle>
            <EmptyDescription>Sem proposições de autoria nos últimos 12 meses.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Rolavel preencher>
          <ItemGroup className="gap-2">
            {proposicoes.map((p) => (
              <Item
                key={p.id}
                variant="outline"
                size="sm"
                render={
                  <a
                    href={`https://www.camara.leg.br/propostas-legislativas/${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <ItemContent>
                  <ItemTitle>
                    {p.siglaTipo} {p.numero}/{p.ano}
                    <span className="sr-only">(abre em nova aba)</span>
                  </ItemTitle>
                  <ItemDescription className="line-clamp-2">{p.ementa}</ItemDescription>
                  <ItemDescription>Apresentada em {formatarData(p.dataApresentacao)}</ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </Rolavel>
      )}
    </Secao>
  );
}

async function Emendas({ nome }: { nome: string }) {
  const { ano, emendas } = await getEmendasDoAutor(nome);
  return (
    <Secao id="emendas" titulo="Emendas" descricao={
        <>
          <Termo id="emenda">Emendas parlamentares</Termo> de {ano} no Portal da Transparência
        </>
      }>
      <Rolavel>
        <EmendasLista emendas={emendas} vazio={`Nenhuma emenda de ${ano} encontrada em nome de ${nome}.`} />
      </Rolavel>
    </Secao>
  );
}
