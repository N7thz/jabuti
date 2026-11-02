import { LandmarkIcon, MapPinIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

import { percentualPago, reaisDeCentavos } from "@/components/emendas/valores";
import { SelectFormulario } from "@/components/form/select-formulario";
import { Termo } from "@/components/termo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { rotuloAno } from "@/lib/anos";
import { salvarMunicipio, tirarMunicipio } from "@/lib/meu/actions";
import { getMunicipiosDaUf, getRepresentantes, type Representantes } from "@/lib/meu/representantes";
import { isUf, UFS } from "@/lib/ufs";

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** "Meus representantes": a cidade escolhida e o estado dela. Sem cidade, mostra a escolha. */
export async function MeusRepresentantes({
  municipioIbge,
  ufUrl,
  trocar,
  ano,
}: {
  municipioIbge: number | null;
  ufUrl?: string;
  trocar: boolean;
  ano: number;
}) {
  const dados = municipioIbge && !trocar ? await getRepresentantes(municipioIbge, ano) : null;
  if (!dados) return <EscolherCidade ufUrl={ufUrl} temCidade={municipioIbge !== null} />;
  return <Painel dados={dados} />;
}

async function EscolherCidade({ ufUrl, temCidade }: { ufUrl?: string; temCidade: boolean }) {
  const uf = ufUrl && isUf(ufUrl) ? ufUrl : undefined;
  const cidades = uf ? await getMunicipiosDaUf(uf) : [];

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[65ch] text-muted-foreground">
        Escolha onde você mora para ver os deputados federais e senadores do seu estado, quem teve mais votos na sua cidade
        e quanto de <Termo id="emenda">emendas</Termo> chegou lá. A cidade fica só na sua conta.
      </p>
      {/* Passo 1: o estado (GET, funciona sem JavaScript). Passo 2: a cidade daquele estado. */}
      <form method="get" action="/meu#representantes" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uf" className="text-sm font-medium">
            Estado
          </label>
          <SelectFormulario
            id="uf"
            name="uf"
            opcoes={Object.entries(UFS)}
            placeholder="Escolha o estado"
            defaultValue={uf}
            className="w-56"
          />
        </div>
        <input type="hidden" name="trocar" value="1" />
        <Button type="submit" variant="outline" className="h-10">
          {uf ? "Trocar estado" : "Ver cidades"}
        </Button>
      </form>

      {uf && (
        <form action={salvarMunicipio} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="municipio" className="text-sm font-medium">
              Cidade em {UFS[uf]}
            </label>
            <SelectFormulario
              id="municipio"
              name="municipio"
              opcoes={cidades.map((c) => [c.ibge, c.nome] as const)}
              placeholder="Escolha a cidade"
              required
              className="w-72"
            />
          </div>
          <Button type="submit" className="h-10">
            Salvar cidade
          </Button>
        </form>
      )}
      {temCidade && (
        <Link href="/meu#representantes" className="w-fit text-sm text-link underline underline-offset-4">
          Cancelar e manter a cidade atual
        </Link>
      )}
    </div>
  );
}

function Painel({ dados }: { dados: Representantes }) {
  const { municipio, cidade, estado } = dados;
  const nomeUf = UFS[municipio.uf as keyof typeof UFS];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <MapPinIcon aria-hidden="true" className="size-5 text-secao" />
          {municipio.nome} ({municipio.uf})
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/meu?trocar=1&uf=${municipio.uf}#representantes`} />} nativeButton={false}>
            Trocar cidade
          </Button>
          <form action={tirarMunicipio}>
            <Button type="submit" variant="ghost" size="sm">
              Tirar cidade
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="dinheiro-cidade" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <h3 id="dinheiro-cidade" className="flex items-center gap-2 font-semibold">
            <LandmarkIcon aria-hidden="true" className="size-4 text-secao" />
            <span>
              <Termo id="emenda">Emendas</Termo> para {municipio.nome} em {rotuloAno(dados.ano)}
            </span>
          </h3>
          {cidade.quantidade === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma emenda destinada diretamente à cidade neste ano.</p>
          ) : (
            <>
              <p>
                <strong className="font-mono">{reaisDeCentavos(cidade.totais.empenhado)}</strong>{" "}
                <Termo id="empenho">empenhados</Termo> em {cidade.quantidade} emendas, dos quais{" "}
                <strong className="font-mono">{reaisDeCentavos(cidade.totais.pago)}</strong> já{" "}
                <Termo id="pagamento">pagos</Termo> ({percentualPago(cidade.totais)}).
              </p>
              <p className="text-sm font-medium">Quem mais mandou dinheiro</p>
              <ol className="flex flex-col gap-1 text-sm">
                {cidade.autores.map((a) => (
                  <li key={a.autor} className="flex justify-between gap-3">
                    <span>{a.autor}</span>
                    <span className="font-mono text-muted-foreground">{reaisDeCentavos(a.pago || a.empenhado)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          <p className="text-sm text-muted-foreground">
            No estado todo ({nomeUf}): {reaisDeCentavos(estado.totais.empenhado)} empenhados em {estado.quantidade} emendas.
          </p>
          <Link href={`/estados/${municipio.uf}/${municipio.ibge}`} className="w-fit text-sm text-link underline underline-offset-4">
            Ver todas as emendas de {municipio.nome}
          </Link>
        </section>

        <section aria-labelledby="mais-votados" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <h3 id="mais-votados" className="flex items-center gap-2 font-semibold">
            <UsersIcon aria-hidden="true" className="size-4 text-secao" />
            Mais votados em {municipio.nome} ({dados.anoEleicao})
          </h3>
          {dados.maisVotados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não temos os votos por cidade desta eleição.</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm">
              {dados.maisVotados.map((p) => (
                <li key={`${p.casa}-${p.idExterno}`} className="flex justify-between gap-3">
                  <Link href={p.perfil} className="text-link underline underline-offset-2">
                    {p.nome}
                  </Link>
                  <span className="text-muted-foreground">
                    {p.votos.toLocaleString("pt-BR")} votos · {p.partido ?? "sem partido"}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="text-xs text-muted-foreground">Só parlamentares que estão no mandato hoje.</p>
        </section>
      </div>

      <Bancada titulo={`Senadores de ${nomeUf}`} pessoas={dados.senadores} />
      <Bancada titulo={`Deputados federais de ${nomeUf}`} pessoas={dados.deputados} termo />
    </div>
  );
}

function Bancada({
  titulo,
  pessoas,
  termo,
}: {
  titulo: string;
  pessoas: Representantes["deputados"];
  termo?: boolean;
}) {
  const id = titulo.toLowerCase().replace(/\W+/g, "-");
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="font-semibold">
        {titulo} {termo && <span className="text-sm font-normal text-muted-foreground">(a <Termo id="bancada">bancada</Termo> do estado)</span>}
      </h3>
      {pessoas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum parlamentar em exercício encontrado.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pessoas.map((p) => (
            <li key={p.idExterno}>
              <Link
                href={p.perfil}
                className="flex min-h-11 items-center gap-3 rounded-lg border bg-card p-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="size-9">
                  {p.fotoUrl && <AvatarImage src={p.fotoUrl} alt="" />}
                  <AvatarFallback>{iniciais(p.nome)}</AvatarFallback>
                </Avatar>
                <span className="flex flex-col">
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-xs text-muted-foreground">{p.partido ?? "sem partido"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
