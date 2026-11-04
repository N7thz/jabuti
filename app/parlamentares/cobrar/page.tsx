import { ExternalLinkIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoFonte } from "@/components/aviso-fonte";
import { Mensagem } from "@/components/cobrar/mensagem";
import { ErroSecao } from "@/components/erro-secao";
import { iniciais } from "@/components/parlamentar-item";
import { Termo } from "@/components/termo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { getContato, getFatos, type Contato } from "@/lib/cobrar/queries";
import { montarMensagem } from "@/lib/cobrar/texto";
import { anoCorrente } from "@/lib/anos";
import { metadados } from "@/lib/metadados";
import { listarParlamentares } from "@/lib/parlamentares/queries";

export const metadata = metadados({
  titulo: "Cobrar o parlamentar · Jabuti",
  caminho: "/parlamentares/cobrar",
  descricao:
    "Escreva para o seu deputado ou senador com base num fato concreto do mandato: presença, gastos, votos e projetos. A mensagem sai do seu email.",
});

const primeiro = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor);

export default function CobrarPage({ searchParams }: PageProps<"/parlamentares/cobrar">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Parlamentares</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Cobrar o parlamentar</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          Escolha um fato do mandato e nós montamos uma mensagem educada pedindo explicação. Você revisa, edita e envia
          do seu próprio email ou liga para o <Termo id="gabinete">gabinete</Termo>. O portal não envia nada e não guarda
          o que você escrever; não precisa de conta.
        </p>
      </header>

      <ErroSecao titulo="Cobrar o parlamentar" fonte="das APIs da Câmara e do Senado">
        <Suspense
          fallback={
            <div role="status" aria-label="Carregando" className="flex flex-col gap-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-60" />
              <Skeleton className="h-80" />
            </div>
          }
        >
          <Conteudo searchParams={searchParams} />
        </Suspense>
      </ErroSecao>
    </div>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/parlamentares/cobrar">, "searchParams">) {
  // Os fatos são do ano corrente, que depende do relógio: a página é montada a cada visita.
  await connection();
  const params = await searchParams;
  const chave = primeiro(params.p);
  const contato = await getContato(chave);
  if (!contato) return <EscolherParlamentar invalido={Boolean(chave)} />;
  return <Cobranca contato={contato} fatoEscolhido={primeiro(params.fato)} />;
}

async function EscolherParlamentar({ invalido }: { invalido: boolean }) {
  const { lista, indisponiveis } = await listarParlamentares();
  const opcao = (p: (typeof lista)[number]) => (
    <NativeSelectOption key={`${p.casa}-${p.id}`} value={`${p.casa}-${p.id}`}>
      {p.nome} ({p.partido ?? "sem partido"}/{p.uf ?? "—"})
    </NativeSelectOption>
  );
  return (
    <section aria-labelledby="escolher" className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-6">
      <h2 id="escolher" className="text-xl font-semibold">
        Para quem você quer escrever?
      </h2>
      {invalido && (
        <p role="alert" className="text-destructive">
          Não encontramos esse parlamentar. Escolha na lista abaixo.
        </p>
      )}
      <AvisoFonte fontes={indisponiveis} consequencia="A lista de escolha está incompleta." />
      <form method="get" action="/parlamentares/cobrar" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="p" className="font-medium">
            Deputado(a) ou senador(a)
          </label>
          <NativeSelect id="p" name="p" required defaultValue="" className="w-full">
            <NativeSelectOption value="" disabled>
              Escolha um nome
            </NativeSelectOption>
            <NativeSelectOptGroup label="Deputados">{lista.filter((p) => p.casa === "camara").map(opcao)}</NativeSelectOptGroup>
            <NativeSelectOptGroup label="Senadores">{lista.filter((p) => p.casa === "senado").map(opcao)}</NativeSelectOptGroup>
          </NativeSelect>
        </div>
        <Button type="submit" size="lg" className="min-h-11">
          Continuar
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Não sabe quem são os seus? Veja a{" "}
        <Link href="/parlamentares" className="text-link underline underline-offset-4">
          lista de parlamentares por estado
        </Link>
        .
      </p>
    </section>
  );
}

async function Cobranca({ contato: c, fatoEscolhido }: { contato: Contato; fatoEscolhido: string | undefined }) {
  const { fatos, indisponiveis } = await getFatos(c);
  const fato = fatos.find((f) => f.id === fatoEscolhido) ?? fatos[0];

  return (
    <>
      <section aria-labelledby="parlamentar" className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {c.fotoUrl && <AvatarImage src={c.fotoUrl} alt="" />}
            <AvatarFallback>{iniciais(c.nome)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h2 id="parlamentar" className="text-xl font-bold">
              {c.nome}
            </h2>
            <span className="text-muted-foreground">
              {c.cargo} · {c.partido ?? "sem partido"}
              {c.uf && `/${c.uf}`}
            </span>
            <span className="flex flex-wrap gap-x-4 text-sm">
              <Link href={c.perfil} className="text-link underline underline-offset-4">
                Ver o perfil
              </Link>
              <Link href="/parlamentares/cobrar" className="text-link underline underline-offset-4">
                Escolher outro parlamentar
              </Link>
            </span>
          </div>
        </div>

        <h3 className="font-semibold">Canais oficiais do gabinete</h3>
        <ul className="flex flex-col gap-2">
          {c.email && (
            <li className="flex items-center gap-2">
              <MailIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Email: </span>
              <a href={`mailto:${c.email}`} className="break-all text-link underline underline-offset-4">
                {c.email}
              </a>
            </li>
          )}
          {c.telefone && (
            <li className="flex items-center gap-2">
              <PhoneIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Telefone: </span>
              <a href={c.telefone.href} className="text-link underline underline-offset-4">
                {c.telefone.exibir}
              </a>
            </li>
          )}
          {c.gabinete && (
            <li className="flex items-center gap-2">
              <MapPinIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Endereço: </span>
              {c.gabinete}
            </li>
          )}
          {c.redes.map((url) => (
            <li key={url} className="flex items-center gap-2">
              <ExternalLinkIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <a href={url} target="_blank" rel="noreferrer" className="break-all text-link underline underline-offset-4">
                {url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </li>
          ))}
          {!c.email && !c.telefone && !c.gabinete && c.redes.length === 0 && (
            <li className="text-muted-foreground">A casa não publica canais de contato deste gabinete.</li>
          )}
        </ul>
        <p className="text-sm text-muted-foreground">
          Dados de contato publicados pela {c.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal"}.
        </p>
      </section>

      <AvisoFonte fontes={indisponiveis} consequencia="Alguns fatos podem não aparecer na lista." />

      {fatos.length === 0 || !fato ? (
        <p className="rounded-lg border bg-card p-4">
          Não conseguimos montar nenhum fato do mandato agora. Você ainda pode escrever pelos canais acima.
        </p>
      ) : (
        <>
          <section aria-labelledby="fato" className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-6">
            <h2 id="fato" className="text-xl font-semibold">
              1. Escolha um fato
            </h2>
            <form method="get" action="/parlamentares/cobrar#mensagem" className="flex flex-col gap-4">
              <input type="hidden" name="p" value={c.chave} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-muted-foreground">
                  Dados oficiais de {anoCorrente()}. A mensagem cita o fato com o número e a fonte.
                </legend>
                {fatos.map((f) => (
                  <label
                    key={f.id}
                    className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2"
                  >
                    <input
                      type="radio"
                      name="fato"
                      value={f.id}
                      defaultChecked={f.id === fato.id}
                      className="mt-1 size-4 shrink-0 accent-primary"
                    />
                    <span>{f.titulo}</span>
                  </label>
                ))}
              </fieldset>
              <Button type="submit" size="lg" variant="outline" className="min-h-11 self-start">
                Usar este fato
              </Button>
            </form>
          </section>

          <section aria-labelledby="mensagem-titulo" id="mensagem" className="flex scroll-mt-20 flex-col gap-4 rounded-lg border bg-card p-4 sm:p-6">
            <h2 id="mensagem-titulo" className="text-xl font-semibold">
              2. Revise e envie
            </h2>
            <p className="text-muted-foreground">
              A mensagem sai do seu email, com o seu nome. Seja respeitoso(a) e específico(a): o gabinete responde
              melhor a quem pergunta sobre um fato concreto. Ofensas e ameaças não ajudam e podem ser crime.
            </p>
            <Mensagem
              key={fato.id}
              textoInicial={montarMensagem(c, fato)}
              assunto={fato.assunto}
              email={c.email}
              telefone={c.telefone}
              nome={c.nome}
            />
          </section>
        </>
      )}
    </>
  );
}
