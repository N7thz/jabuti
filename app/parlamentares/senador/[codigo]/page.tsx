import { FileTextIcon, ReceiptIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Compartilhar } from "@/components/compartilhar";
import { VotosEEmendasParlamentar } from "@/components/cruzamentos/votos-emendas";
import { EmendasLista } from "@/components/emendas-lista";
import { CampanhaParlamentar } from "@/components/fiscalizacao/campanha-parlamentar";
import { FiscalizacaoParlamentar } from "@/components/fiscalizacao/fiscalizacao-parlamentar";
import { alvosDoParlamentar, BotoesFixar } from "@/components/fixar";
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
import { deCentavos, formatarReais, reais, reaisDoTexto, somar } from "@/lib/format/dinheiro";
import {
  getDespesasSenador,
  getEmendasDoAutor,
  getProcessosSenador,
  getSenador,
  getVotacoesSenador,
  getVotosSenador,
} from "@/lib/parlamentares/queries";
import { votacoesSenadoNoBanco } from "@/lib/votacoes/queries";
import { metadados } from "@/lib/metadados";

export async function generateMetadata({ params }: PageProps<"/parlamentares/senador/[codigo]">): Promise<Metadata> {
  const senador = await getSenador((await params).codigo);
  if (!senador) return metadados({ titulo: "Senador · Jabuti", imagemPropria: true });
  const partido = [senador.partido, senador.uf].filter(Boolean).join("/");
  return metadados({
    titulo: `${senador.nome}${partido ? ` (${partido})` : ""} · Jabuti`,
    descricao: "Presença no plenário, como votou, gastos da cota, emendas e campanha deste senador, com dados oficiais.",
    imagemPropria: true,
  });
}

export default function SenadorPage({ params }: PageProps<"/parlamentares/senador/[codigo]">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Voltar />
      <Suspense fallback={<PerfilSkeleton />}>
        {params.then(({ codigo }) => (
          <Senador codigo={codigo} />
        ))}
      </Suspense>
    </div>
  );
}

async function Senador({ codigo }: { codigo: string }) {
  const senador = await getSenador(codigo);
  if (!senador) notFound();

  const dados: [string, React.ReactNode][] = [];
  if (senador.nomeCompleto) dados.push(["Nome civil", senador.nomeCompleto]);
  if (senador.email) {
    dados.push([
      "E-mail",
      <a key="email" className="text-link underline" href={`mailto:${senador.email}`}>
        {senador.email}
      </a>,
    ]);
  }

  return (
    <>
      <Cabecalho
        nome={senador.nome}
        fotoUrl={senador.fotoUrl}
        cargo="Senador(a)"
        partido={senador.partido}
        uf={senador.uf}
        dados={dados}
        acoes={
          // Lê a sessão: fica fora do shell estático e não aparece para visitantes.
          <Suspense fallback={null}>
            <BotoesFixar alvos={alvosDoParlamentar({ casa: "senado", id: codigo, nome: senador.nome, partido: senador.partido, uf: senador.uf })} />
          </Suspense>
        }
      />

      <NavSecoes />

      <SecaoProtegida titulo="Resumo" id="resumo" fonte="das APIs do Senado e do Portal da Transparência" carregando={<ResumoSkeleton />}>
        <ResumoSenador codigo={codigo} nome={senador.nome} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Como votou" id="votacoes" fonte="da API do Senado">
        <VotosSenador codigo={codigo} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Partido e fidelidade" id="fidelidade" fonte="das votações guardadas no portal">
        <PartidoEFidelidade casa="SENADO" idExterno={codigo} nome={senador.nome} />
      </SecaoProtegida>

      {/* Sem items-start: os dois cards esticam até a mesma altura (a da cota). */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SecaoProtegida titulo="Cota parlamentar" id="cota" fonte="da API de transparência do Senado">
          <Cota codigo={codigo} />
        </SecaoProtegida>
        <SecaoProtegida titulo="Proposições" id="proposicoes" fonte="da API do Senado">
          <Processos codigo={codigo} />
        </SecaoProtegida>
      </div>

      <SecaoProtegida titulo="Emendas" id="emendas" fonte="do Portal da Transparência">
        <Emendas nome={senador.nome} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Votos e emendas" id="votos-e-emendas" fonte="do TSE e do Portal da Transparência, guardados no portal">
        <VotosEEmendasParlamentar casa="SENADO" idExterno={codigo} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Eleição e campanha" id="campanha" fonte="do TSE, guardados no portal">
        <CampanhaParlamentar casa="SENADO" idExterno={codigo} nome={senador.nome} />
      </SecaoProtegida>

      <SecaoProtegida titulo="Fiscalização" id="fiscalizacao" fonte="do TCU e do Transferegov">
        <FiscalizacaoParlamentar
          casa="SENADO"
          idExterno={codigo}
          nome={senador.nome}
          nomeCivil={senador.nomeCompleto}
          uf={senador.uf}
        />
      </SecaoProtegida>
    </>
  );
}

async function ResumoSenador({ codigo, nome }: { codigo: string; nome: string }) {
  const [votacoes, cota, processos, emendas] = await Promise.all([
    getVotacoesSenador(codigo),
    getDespesasSenador(codigo),
    getProcessosSenador(codigo),
    getEmendasDoAutor(nome),
  ]);
  const { PRESENTE, AUSENCIA_JUSTIFICADA, AUSENTE } = votacoes.presenca;
  const contadas = PRESENTE + AUSENCIA_JUSTIFICADA + AUSENTE;
  const v = (tipo: string) => votacoes.votos[tipo] ?? 0;
  const tipos = classificarProposicoes(processos.map((p) => p.identificacao.split(" ")[0]));
  const empenhado = somar(emendas.emendas.map((e) => reaisDoTexto(e.valorEmpenhado)));
  const pago = somar(emendas.emendas.map((e) => reaisDoTexto(e.valorPago)));

  return (
    <>
      <Resumo
        titulo={`Resumo de ${cota.ano}`}
        indicadores={[
          {
            rotulo: "Presença nas votações",
            termo: "votacao-nominal",
            valor: porcentagem(PRESENTE, contadas),
            medidor: { parte: PRESENTE, total: contadas },
            detalhe: `Presente em ${PRESENTE} de ${contadas} votações nominais do plenário${
              AUSENCIA_JUSTIFICADA ? `; nas outras ${AUSENCIA_JUSTIFICADA}${AUSENTE ? ", parte" : ""} a ausência foi justificada` : ""
            }`,
          },
          {
            rotulo: "Faltas sem justificativa",
            termo: "presenca",
            valor: String(AUSENTE),
            detalhe: "Registradas como “não compareceu”",
          },
          {
            rotulo: "Ausências justificadas",
            termo: "presenca",
            valor: String(AUSENCIA_JUSTIFICADA),
            detalhe: "Licença, missão oficial ou atividade parlamentar",
          },
          {
            rotulo: "Como votou",
            termo: "votacao-nominal",
            valor: `${v("SIM")} sim · ${v("NAO")} não`,
            detalhe: `${v("ABSTENCAO")} abstenções · ${v("VOTO_SECRETO")} votos secretos · ${v("PRESENTE_SEM_VOTO")} presente sem votar`,
          },
          {
            rotulo: "Gasto da cota parlamentar",
            termo: "cota-parlamentar",
            valor: cota.resumo ? formatarReais(deCentavos(cota.resumo.total)) : formatarReais(reais(0)),
            detalhe: `${cota.resumo?.quantidade ?? 0} reembolsos em ${cota.ano}`,
          },
          {
            rotulo: "Proposições em 12 meses",
            termo: "proposicao",
            valor: String(processos.length),
            detalhe: `${tipos.projetos} projetos · ${tipos.requerimentos} requerimentos · ${tipos.outros} outras`,
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
              <strong>Presença:</strong> usamos as {votacoes.votacoes} votações nominais do plenário em{" "}
              {cota.ano}. Contam como presença os votos (sim, não, abstenção, secreto), presidir a sessão e
              estar presente sem votar. Faltas sem justificativa e ausências justificadas aparecem separadas
              e nunca são somadas.
              {votacoes.presenca.naoConta > 0 &&
                ` ${votacoes.presenca.naoConta} registros ficaram fora da conta por indicarem que o senador não estava em exercício no dia.`}
            </p>
            <p>
              <strong>Cota:</strong> soma dos reembolsos da CEAPS no ano. <strong>Proposições:</strong> projetos
              são PL, PEC, PDL e PRS; requerimentos incluem REQ e RQS. <strong>Emendas:</strong> emendas do ano
              no Portal da Transparência com o nome parlamentar exato.
            </p>
            <p>Dados consultados nas APIs oficiais em {formatarData(votacoes.consultadoEm)}.</p>
          </>
        }
      />
      <Compartilhar
        caminho={`/parlamentares/senador/${codigo}`}
        texto={`${nome} esteve presente em ${porcentagem(PRESENTE, contadas)} das votações nominais do plenário do Senado em ${cota.ano}, com ${AUSENTE} faltas sem justificativa. Veja os votos, gastos e emendas:`}
      />
    </>
  );
}

async function VotosSenador({ codigo }: { codigo: string }) {
  const { votos, consultadoEm } = await getVotosSenador(codigo);
  const noBanco = await votacoesSenadoNoBanco(votos.map((v) => v.votacaoId));
  return (
    <HistoricoVotos
      casa="senado"
      idExterno={codigo}
      votos={votos.map((v) => ({ ...v, temPagina: noBanco.has(v.votacaoId) }))}
      origem={`API do Senado, consultada em ${formatarData(consultadoEm)}`}
    />
  );
}

async function Cota({ codigo }: { codigo: string }) {
  const { ano, resumo } = await getDespesasSenador(codigo);

  if (!resumo) {
    return (
      <Secao id="cota" titulo="Cota parlamentar" descricao={`Gastos de ${ano} reembolsados pelo Senado (CEAPS)`}>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Sem gastos em {ano}</EmptyTitle>
            <EmptyDescription>Nenhuma despesa da cota registrada neste ano.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Secao>
    );
  }

  return (
    <Secao
      id="cota"
      titulo="Cota parlamentar"
      descricao={
        <>
          Gastos de {ano} da <Termo id="cota-parlamentar">cota</Termo> reembolsados pelo Senado:{" "}
          <strong className="text-foreground">{formatarReais(deCentavos(resumo.total))}</strong> em{" "}
          {resumo.quantidade} {resumo.quantidade === 1 ? "lançamento" : "lançamentos"}
        </>
      }
    >
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
            {resumo.porTipo.map((t) => (
              <TableRow key={t.tipo}>
                <TableHead scope="row" className="h-auto py-2 pl-0 font-normal whitespace-normal">
                  {t.tipo}
                </TableHead>
                <TableCell className="pr-0 text-right font-mono">{formatarReais(deCentavos(t.total))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-1 flex-col gap-3">
          <h3 className="font-semibold">Últimos lançamentos</h3>
          <Rolavel preencher className="lg:min-h-[min(28rem,65dvh)]">
            <ItemGroup className="gap-2">
              {resumo.ultimas.map((d) => (
                <Item key={d.id} variant="outline" size="sm">
                  <ItemContent>
                    <ItemTitle>{d.fornecedor ?? "Fornecedor não informado"}</ItemTitle>
                    <ItemDescription>
                      {formatarData(d.data)} · {d.tipoDespesa}
                    </ItemDescription>
                    {d.detalhamento && <ItemDescription className="line-clamp-2">{d.detalhamento}</ItemDescription>}
                  </ItemContent>
                  <Badge variant="secondary" className="self-start font-mono">
                    {formatarReais(reais(d.valorReembolsado))}
                  </Badge>
                </Item>
              ))}
            </ItemGroup>
          </Rolavel>
        </div>
      </div>
    </Secao>
  );
}

async function Processos({ codigo }: { codigo: string }) {
  const processos = await getProcessosSenador(codigo);

  return (
    <Secao id="proposicoes" titulo="Proposições"
      descricao={
        <>
          {processos.length} <Termo id="proposicao">proposições</Termo> apresentadas nos últimos 12 meses
        </>
      }>
      {processos.length === 0 ? (
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
            {processos.map((p) => (
              <Item
                key={p.id}
                variant="outline"
                size="sm"
                render={
                  p.codigoMateria ? (
                    <a
                      href={`https://www25.senado.leg.br/web/atividade/materias/-/materia/${p.codigoMateria}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  ) : undefined
                }
              >
                <ItemContent>
                  <ItemTitle>
                    {p.identificacao}
                    {p.codigoMateria && <span className="sr-only">(abre em nova aba)</span>}
                  </ItemTitle>
                  {p.ementa && <ItemDescription className="line-clamp-2">{p.ementa}</ItemDescription>}
                  <ItemDescription>
                    Apresentada em {formatarData(p.dataApresentacao)}
                    {p.situacaoAtual && <> · {p.situacaoAtual}</>}
                  </ItemDescription>
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
