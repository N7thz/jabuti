import Link from "next/link";

import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { Secao } from "@/components/perfil-parlamentar";
import { Termo } from "@/components/termo";
import { getVotosEEmendas, type VotosEEmendas } from "@/lib/cruzamentos/queries";
import type { Casa } from "@/lib/generated/prisma/enums";

const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-BR");

/** Seção do perfil que cruza onde o parlamentar foi votado com para onde mandou emendas. */
export async function VotosEEmendasParlamentar({ casa, idExterno }: { casa: Casa; idExterno: string }) {
  const dados = await getVotosEEmendas(casa, idExterno);

  return (
    <Secao
      id="votos-e-emendas"
      titulo="Onde foi votado e para onde mandou emendas"
      descricao={
        <>
          Votos da eleição (TSE) cruzados com as <Termo id="emenda">emendas</Termo> destinadas a cidades depois dela
        </>
      }
    >
      {!dados ? (
        <p className="text-muted-foreground">
          Ainda não temos os votos por cidade deste parlamentar. Eles vêm da carga do TSE, que roda toda semana.
        </p>
      ) : (
        <Cruzamento dados={dados} />
      )}
    </Secao>
  );
}

function Cruzamento({ dados: d }: { dados: VotosEEmendas }) {
  const parteVotos = d.totalVotos ? d.votosNasMaisVotadas / d.totalVotos : 0;
  const parteEmendas = d.totalEmpenhado ? d.empenhadoNasMaisVotadas / d.totalEmpenhado : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[75ch] flex-col gap-2">
        <p>
          Na eleição de {d.eleicao}, teve <strong>{num.format(d.totalVotos)} votos</strong> em {num.format(d.cidadesComVoto)}{" "}
          cidades. As 10 cidades onde foi mais votado deram <strong>{pct.format(parteVotos)}</strong> desses votos.
        </p>
        {d.totalEmpenhado > 0 ? (
          <p>
            Depois disso, destinou <strong className="font-mono">{reaisDeCentavos(d.totalEmpenhado)}</strong>{" "}
            <Termo id="empenho">empenhados</Termo> em emendas para {num.format(d.cidadesComEmenda)} cidades.{" "}
            <strong>{pct.format(parteEmendas)}</strong> desse valor foi para aquelas 10 cidades onde teve mais votos
            {d.cidadesComEmendaSemVoto > 0 &&
              `, e ${num.format(d.cidadesComEmendaSemVoto)} ${d.cidadesComEmendaSemVoto === 1 ? "cidade recebeu" : "cidades receberam"} emenda sem ter dado nenhum voto a ele`}
            .
          </p>
        ) : (
          <p>Não encontramos emendas destinadas diretamente a cidades depois dessa eleição.</p>
        )}
        <p className="text-sm text-muted-foreground">
          Mandar emenda para a própria base eleitoral não é ilegal. O cruzamento ajuda a ver a quem o mandato tem servido.
          Emendas para o estado inteiro ou para vários locais não entram na conta.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TabelaCidades titulo="As 10 cidades com mais votos" linhas={d.maisVotadas} totalVotos={d.totalVotos} />
        {d.maisEmendas.length > 0 && (
          <TabelaCidades titulo="As 10 cidades que mais receberam emendas" linhas={d.maisEmendas} totalVotos={d.totalVotos} />
        )}
      </div>
    </div>
  );
}

function TabelaCidades({ titulo, linhas, totalVotos }: { titulo: string; linhas: VotosEEmendas["maisVotadas"]; totalVotos: number }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{titulo}</h3>
      <Tabela legenda={titulo}>
        <THead>
          <Tr>
            <Th>Cidade</Th>
            <Th numero>Votos</Th>
            <Th numero>Empenhado</Th>
            <Th numero>Pago</Th>
          </Tr>
        </THead>
        <TBody>
          {linhas.map((l) => (
            <Tr key={l.ibge}>
              <Th scope="row" className="font-normal">
                {l.uf ? (
                  <Link href={`/estados/${l.uf}/${l.ibge}`} className="text-link underline">
                    {l.nome} ({l.uf})
                  </Link>
                ) : (
                  l.nome
                )}
              </Th>
              <Td numero rotulo="Votos">
                {num.format(l.votos)}
                <span className="block text-xs text-muted-foreground">{totalVotos ? pct.format(l.votos / totalVotos) : "—"}</span>
              </Td>
              <Td numero rotulo="Empenhado">{reaisDeCentavos(l.empenhado)}</Td>
              <Td numero rotulo="Pago">{reaisDeCentavos(l.pago)}</Td>
            </Tr>
          ))}
        </TBody>
      </Tabela>
    </section>
  );
}
