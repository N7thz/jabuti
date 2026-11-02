import { ExternalLinkIcon, FileTextIcon, ReceiptIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { BaixarCsv } from "@/components/baixar-csv";
import { Compartilhar } from "@/components/compartilhar";
import { VotosEEmendasParlamentar } from "@/components/cruzamentos/votos-emendas";
import { EmendasLista } from "@/components/emendas-lista";
import { CampanhaParlamentar } from "@/components/fiscalizacao/campanha-parlamentar";
import { FiscalizacaoParlamentar } from "@/components/fiscalizacao/fiscalizacao-parlamentar";
import { alvosDoParlamentar, BotoesFixar } from "@/components/fixar";
import { BotaoSeguir } from "@/components/seguir";
import { LeisParlamentar } from "@/components/leis-parlamentar";
import { Cabecalho, NavSecoes, PerfilSkeleton, Rolavel, Secao, Voltar } from "@/components/perfil-parlamentar";
import { PartidoEFidelidade } from "@/components/partido-fidelidade";
import { SecaoProtegida } from "@/components/secao-protegida";
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
  getLeisDeputado,
  getPresencaDeputado,
  getProposicoesDeputado,
} from "@/lib/parlamentares/queries";
import { getVotosDeputado, ultimaCarga } from "@/lib/votacoes/queries";
import { metadados } from "@/lib/metadados";
import { AnoDoPerfil } from "@/components/navegacao-anos";
import { anoDaUrl, anoEmAndamento, anosDesde, inicioDaLegislatura, rotuloAno } from "@/lib/anos";

export async function generateMetadata({ params }: PageProps<"/parlamentares/deputado/[id]">): Promise<Metadata> {
  const deputado = await getDeputado((await params).id);
  if (!deputado) return metadados({ titulo: "Deputado · Jabuti", imagemPropria: true });
  const s = deputado.ultimoStatus;
  const partido = [s.siglaPartido, s.siglaUf].filter(Boolean).join("/");
  return metadados({
    titulo: `${s.nomeEleitoral || s.nome}${partido ? ` (${partido})` : ""} · Jabuti`,
    descricao: "Presença no plenário, como votou, gastos da cota, emendas e campanha deste deputado federal, com dados oficiais.",
    imagemPropria: true,
  });
}

export default function DeputadoPage({ params, searchParams }: PageProps<"/parlamentares/deputado/[id]">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Voltar />
      <Suspense fallback={<PerfilSkeleton />}>
        {Promise.all([params, searchParams]).then(([{ id }, { ano }]) => (
          <Deputado id={id} anoUrl={ano} />
        ))}
      </Suspense>
    </div>
  );
}

async function Deputado({ id, anoUrl }: { id: string; anoUrl?: string | string[] }) {
  // O ano corrente depende do relógio: a página é montada a cada visita, não no build.
  await connection();
  const deputado = await getDeputado(id);
  if (!deputado) notFound();
  const s = deputado.ultimoStatus;
  // Anos da legislatura atual: a API da cota só responde dentro da legislatura do ano pedido.
  const anos = anosDesde(inicioDaLegislatura(s.idLegislatura));
  const ano = anoDaUrl(anoUrl, anos);
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
            <div className="flex flex-wrap items-start gap-2">
              <BotaoSeguir tipo="PARLAMENTAR" chave={`camara-${deputado.id}`} rotulo={s.nome} nome="parlamentar" />
              <BotoesFixar alvos={alvosDoParlamentar({ casa: "camara", id: deputado.id, nome: s.nome, partido: s.siglaPartido, uf: s.siglaUf })} />
            </div>
          </Suspense>
        }
      />

      <NavSecoes />

      <AnoDoPerfil anos={anos} ano={ano} caminho={`/parlamentares/deputado/${deputado.id}`} />

      <SecaoProtegida titulo="Resumo" id="resumo" fonte="das APIs da Câmara e do Portal da Transparência" carregando={<ResumoSkeleton />}>
        <ResumoDeputado id={deputado.id} inicio={s.data} nome={s.nomeEleitoral || s.nome} ano={ano} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Como votou" id="votacoes" fonte="das votações da Câmara guardadas no portal">
        <VotosDeputado id={String(deputado.id)} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Partido e fidelidade" id="fidelidade" fonte="das votações guardadas no portal">
        <PartidoEFidelidade casa="CAMARA" idExterno={String(deputado.id)} nome={s.nomeEleitoral || s.nome} />
      </SecaoProtegida>

      {/* Sem items-start: os dois cards esticam até a mesma altura (a da cota). */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SecaoProtegida titulo="Cota parlamentar" id="cota" fonte="da API da Câmara">
          <Cota id={deputado.id} ano={ano} />
        </SecaoProtegida>
        <SecaoProtegida titulo="Proposições" id="proposicoes" fonte="da API da Câmara">
          <Proposicoes id={deputado.id} ano={ano} />
        </SecaoProtegida>
      </div>

      <SecaoProtegida titulo="Leis" id="leis" fonte="das APIs da Câmara e do Senado">
        <LeisDeputado id={deputado.id} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Emendas" id="emendas" fonte="do Portal da Transparência">
        <Emendas nome={s.nomeEleitoral || s.nome} ano={ano} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Votos e emendas" id="votos-e-emendas" fonte="do TSE e do Portal da Transparência, guardados no portal">
        <VotosEEmendasParlamentar casa="CAMARA" idExterno={String(deputado.id)} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Eleição e campanha" id="campanha" fonte="do TSE, guardados no portal">
        <CampanhaParlamentar casa="CAMARA" idExterno={String(deputado.id)} nome={s.nome} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Fiscalização" id="fiscalizacao" fonte="do TCU e do Transferegov">
        <FiscalizacaoParlamentar
          casa="CAMARA"
          idExterno={String(deputado.id)}
          nome={s.nome}
          nomeCivil={deputado.nomeCivil}
          cpf={deputado.cpf}
          uf={s.siglaUf}
        />
      </SecaoProtegida>
    </>
  );
}

async function ResumoDeputado({ id, inicio, nome, ano }: { id: number; inicio: string | null; nome: string; ano: number }) {
  const [presenca, cota, proposicoes, emendas] = await Promise.all([
    getPresencaDeputado(id, inicio, ano),
    getDespesasDeputado(id, ano),
    getProposicoesDeputado(id, ano),
    getEmendasDoAutor(nome, ano),
  ]);
  const ateAgora = anoEmAndamento(ano) ? " até agora" : "";
  const faltas = presenca.sessoes - presenca.presencas;
  const tipos = classificarProposicoes(proposicoes.map((p) => p.siglaTipo));
  const empenhado = somar(emendas.emendas.map((e) => reaisDoTexto(e.valorEmpenhado)));
  const pago = somar(emendas.emendas.map((e) => reaisDoTexto(e.valorPago)));
  const gastoCota = formatarReais(somar(cota.despesas.map((d) => reais(d.valorLiquido))));

  return (
    <>
      <Resumo
        titulo={`Resumo de ${rotuloAno(ano)}`}
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
            detalhe: `${cota.despesas.length} reembolsos em ${ano}${ateAgora}`,
          },
          {
            rotulo: `Proposições em ${ano}`,
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
              {formatarData(presenca.desde)}
              {anoEmAndamento(ano) ? " até hoje" : ` até o fim de ${ano}`} e verificamos em quais o deputado aparece como presente na
              API da Câmara. Audiências, sessões solenes e comissões ficam fora. A Câmara não publica as
              justificativas, então uma sessão sem registro pode ter sido falta justificada (licença,
              missão oficial).
            </p>
            <p>
              <strong>Cota:</strong> soma dos valores líquidos reembolsados no ano. <strong>Proposições:</strong>{" "}
              apresentadas no ano; projetos são PL, PLP, PEC e PDL; requerimentos incluem REQ, RIC e INC.{" "}
              <strong>Emendas:</strong> emendas do ano no Portal da Transparência com o nome parlamentar
              exato.
            </p>
            <p>Dados consultados nas APIs oficiais em {formatarData(presenca.consultadoEm)}.</p>
          </>
        }
      />
      <Compartilhar
        caminho={`/parlamentares/deputado/${id}${anoEmAndamento(ano) ? "" : `?ano=${ano}`}`}
        texto={`${nome} esteve em ${porcentagem(presenca.presencas, presenca.sessoes)} das sessões deliberativas do plenário em ${ano}${ateAgora} e gastou ${gastoCota} da cota parlamentar. Veja os votos, gastos e emendas:`}
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

async function Cota({ id, ano }: { id: number; ano: number }) {
  const { despesas } = await getDespesasDeputado(id, ano);
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
          Gastos de {rotuloAno(ano)} da <Termo id="cota-parlamentar">cota</Termo> reembolsados pela Câmara:{" "}
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

          <BaixarCsv href={`/api/csv/cota?id=${id}&ano=${ano}`} rotulo={`Baixar os gastos de ${ano}`} />

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

async function Proposicoes({ id, ano }: { id: number; ano: number }) {
  const proposicoes = await getProposicoesDeputado(id, ano);

  return (
    <Secao id="proposicoes" titulo="Proposições"
      descricao={
        <>
          {proposicoes.length} <Termo id="proposicao">proposições</Termo> apresentadas em {rotuloAno(ano)}
        </>
      }>
      {proposicoes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nenhuma proposição</EmptyTitle>
            <EmptyDescription>Sem proposições de autoria em {rotuloAno(ano)}.</EmptyDescription>
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

async function LeisDeputado({ id }: { id: number }) {
  const { leis, naoVerificados } = await getLeisDeputado(id);
  return <LeisParlamentar casa="camara" leis={leis} naoVerificados={naoVerificados} />;
}

async function Emendas({ nome, ano }: { nome: string; ano: number }) {
  const { emendas } = await getEmendasDoAutor(nome, ano);
  return (
    <Secao id="emendas" titulo="Emendas" descricao={
        <>
          <Termo id="emenda">Emendas parlamentares</Termo> de {rotuloAno(ano)} no Portal da Transparência
        </>
      }>
      <Rolavel>
        <EmendasLista emendas={emendas} vazio={`Nenhuma emenda de ${ano} encontrada em nome de ${nome}.`} />
      </Rolavel>
    </Secao>
  );
}
