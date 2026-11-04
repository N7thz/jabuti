import { ComposicaoParlamento } from "@/components/composicao-parlamento";
import { Termo } from "@/components/termo";
import { type Composicao, composicaoAtual, type ParlamentarAtual } from "@/lib/eleicoes/eleitos";
import { UFS, type SiglaUf } from "@/lib/ufs";

const NOME_DA_CASA = { camara: "A Câmara", senado: "O Senado" } as const;
const QUEM = { camara: "deputados", senado: "senadores" } as const;

/** Explica quando o total não fecha com o número de cadeiras da casa (ou da bancada do estado no Senado). */
function notaDoTotal({ casa, total, esperado }: Composicao) {
  if (esperado === null || total === esperado) return undefined;
  return (
    <p>
      {NOME_DA_CASA[casa]} tem {esperado} cadeiras{esperado === 3 ? " por estado" : ""}, mas a lista oficial trouxe {total}{" "}
      {QUEM[casa]} em exercício agora: pode haver alguém afastado sem <Termo id="suplente">suplente</Termo> no lugar.
    </p>
  );
}

/**
 * Composição de hoje da Câmara e do Senado, pelo partido atual de quem está em exercício. Segue os mesmos
 * filtros de casa e de estado da lista; partido, nome e fixados não mudam o gráfico. Uma casa cuja API não
 * respondeu fica de fora (o aviso de fonte fora do ar já aparece acima).
 */
export function ComposicaoAtual({
  parlamentares,
  casa,
  uf,
}: {
  parlamentares: ParlamentarAtual[];
  casa?: "camara" | "senado";
  uf?: string;
}) {
  const composicao = composicaoAtual(parlamentares, uf);
  const estado = uf ? UFS[uf as SiglaUf] : null;
  const temDados = { camara: parlamentares.some((p) => p.casa === "camara"), senado: parlamentares.some((p) => p.casa === "senado") };
  const mostrar = (c: "camara" | "senado") => (!casa || casa === c) && temDados[c];
  if (!mostrar("camara") && !mostrar("senado")) return null;

  return (
    <section aria-labelledby="composicao" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="composicao" className="text-lg font-semibold">
          <Termo id="composicao-casa">Composição</Termo> atual {estado ? `da bancada de ${estado}` : "das casas"}
        </h2>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Pelo partido de hoje de cada parlamentar em exercício. Os filtros de partido e de nome não mudam os gráficos
          {uf ? "; o de estado mostra a bancada daquele estado." : "."}
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {mostrar("camara") && (
          <ComposicaoParlamento
            composicao={composicao.camara}
            titulo={estado ? `Deputados federais de ${estado}` : "Câmara dos Deputados"}
            subtitulo="Em exercício hoje, pelo partido atual."
            nota={notaDoTotal(composicao.camara)}
          />
        )}
        {mostrar("senado") && (
          <ComposicaoParlamento
            composicao={composicao.senado}
            titulo={estado ? `Senadores de ${estado}` : "Senado Federal"}
            subtitulo="Em exercício hoje, pelo partido atual."
            nota={notaDoTotal(composicao.senado)}
          />
        )}
      </div>
    </section>
  );
}
