import { BellIcon, DownloadIcon, ListIcon, MegaphoneIcon, VoteIcon } from "lucide-react";
import Link from "next/link";
import { after, connection } from "next/server";
import { Suspense } from "react";

import { Aviso } from "@/components/meu/aviso";
import { EmpresasVigiadas } from "@/components/meu/empresas-vigiadas";
import { Novidades } from "@/components/meu/novidades";
import { MeusRepresentantes } from "@/components/meu/representantes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { anoCorrente } from "@/lib/anos";
import { db } from "@/lib/db";
import { formatarData } from "@/lib/format/datas";
import { conferirEmpresas } from "@/lib/meu/empresas";
import { desdeUltimaVisita, getNovidades } from "@/lib/meu/novidades";
import { getDono, getPerfil, marcarPainelVisto } from "@/lib/meu/perfil";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({
  titulo: "Meu painel · Jabuti",
  descricao: "O que fizeram os parlamentares que você acompanha, seus representantes, empresas vigiadas e suas listas.",
});

const SECOES = [
  { id: "novidades", rotulo: "Novidades" },
  { id: "representantes", rotulo: "Meus representantes" },
  { id: "empresas", rotulo: "Empresas vigiadas" },
  { id: "listas", rotulo: "Minhas listas" },
  { id: "mais", rotulo: "Mais" },
];

export default function MeuPage({ searchParams }: PageProps<"/meu">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <Painel searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Painel({ searchParams }: Pick<PageProps<"/meu">, "searchParams">) {
  const [params, usuario] = await Promise.all([searchParams, getDono()]);
  if (!usuario) return <Convite />;
  await connection();

  const ano = anoCorrente();
  const perfil = await getPerfil(usuario);
  const desde = desdeUltimaVisita(perfil?.painelVistoEm ?? null);
  after(() => marcarPainelVisto(usuario, perfil?.painelVistoEm ?? null));

  const [fixados, seguidos, listas] = await Promise.all([
    db.fixado.findMany({ where: { usuario, tipo: "PARLAMENTAR" }, select: { chave: true } }),
    db.seguido.findMany({ where: { usuario, tipo: "PARLAMENTAR" }, select: { chave: true } }),
    db.lista.findMany({
      where: { usuario },
      orderBy: { criadaEm: "desc" },
      take: 6,
      select: { id: true, nome: true, _count: { select: { itens: true } } },
    }),
  ]);
  const chaves = [...new Set([...fixados, ...seguidos].map((f) => f.chave))];
  const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  return (
    <>
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Meu painel</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">O que mudou desde a sua última visita</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          Os parlamentares que você fixou ou segue, quem representa a sua cidade e o seu estado, as empresas que você vigia e
          as suas listas, num lugar só.
        </p>
        <nav aria-label="Seções do painel">
          <ul className="flex flex-wrap gap-2">
            {SECOES.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-11 items-center rounded-full border bg-card px-4 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {s.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Aviso codigo={params.aviso} />

      <Secao id="novidades" titulo="Novidades" descricao={`Desde ${formatarData(desde)}, a partir dos dados oficiais carregados todo dia.`}>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <NovidadesCarregadas chaves={chaves} desde={desde} ano={ano} />
        </Suspense>
      </Secao>

      <Secao id="representantes" titulo="Meus representantes">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <MeusRepresentantes
            municipioIbge={perfil?.municipioIbge ?? null}
            ufUrl={texto(params.uf)}
            trocar={params.trocar === "1"}
            ano={ano}
          />
        </Suspense>
      </Secao>

      <Secao id="empresas" titulo="Empresas vigiadas">
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
          <EmpresasCarregadas usuario={usuario} />
        </Suspense>
      </Secao>

      <Secao id="listas" titulo="Minhas listas" descricao="Votações, leis, empresas e emendas que você salvou, com as suas anotações.">
        {listas.length === 0 ? (
          <p className="text-muted-foreground">
            Você ainda não tem listas. Use o botão &quot;Salvar em lista&quot; nas páginas de votações, empresas e emendas, ou
            crie uma em <Link href="/listas" className="text-link underline">Minhas listas</Link>.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {listas.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/listas/${l.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-lg border bg-card p-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <ListIcon aria-hidden="true" className="size-4 text-secao" />
                    {l.nome}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {l._count.itens} {l._count.itens === 1 ? "item" : "itens"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" className="w-fit" render={<Link href="/listas" />} nativeButton={false}>
          Ver todas as listas
        </Button>
      </Secao>

      <Secao id="mais" titulo="Mais">
        <ul className="grid gap-3 sm:grid-cols-2">
          <Atalho href="/notificacoes" icone={<BellIcon aria-hidden="true" />} titulo="Notificações" texto="Votos, projetos e mudanças de quem e do que você segue." />
          <Atalho href="/como-eu-votaria" icone={<VoteIcon aria-hidden="true" />} titulo="Como eu votaria" texto="Responda votações importantes e veja com quem você concorda. As respostas ficam só no seu aparelho." />
          <Atalho href="/parlamentares/cobrar" icone={<MegaphoneIcon aria-hidden="true" />} titulo="Cobrar um parlamentar" texto="Monte uma mensagem a partir de um fato e envie do seu email." />
          <Atalho href="/api/meus-dados" icone={<DownloadIcon aria-hidden="true" />} titulo="Baixar meus dados" texto="Um arquivo com tudo o que o portal guarda da sua conta." baixar />
        </ul>
      </Secao>
    </>
  );
}

async function NovidadesCarregadas({ chaves, desde, ano }: { chaves: string[]; desde: Date; ano: number }) {
  const itens = await getNovidades(chaves, desde, ano);
  return <Novidades itens={itens} desde={desde} ano={ano} />;
}

async function EmpresasCarregadas({ usuario }: { usuario: string }) {
  return <EmpresasVigiadas empresas={await conferirEmpresas(usuario)} />;
}

function Secao({ id, titulo, descricao, children }: { id: string; titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-titulo`} id={id} className="flex scroll-mt-24 flex-col gap-4 animate-enter">
      <div className="flex flex-col gap-1 border-b pb-3">
        <h2 id={`${id}-titulo`} className="text-2xl font-bold">
          {titulo}
        </h2>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

function Atalho({
  href,
  icone,
  titulo,
  texto,
  baixar,
}: {
  href: string;
  icone: React.ReactNode;
  titulo: string;
  texto: string;
  baixar?: boolean;
}) {
  const classe =
    "flex h-full min-h-11 items-start gap-3 rounded-xl border bg-card p-4 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-secao";
  const conteudo = (
    <>
      {icone}
      <span className="flex flex-col gap-1">
        <span className="font-semibold">{titulo}</span>
        <span className="text-sm text-muted-foreground">{texto}</span>
      </span>
    </>
  );
  return (
    <li>
      {baixar ? (
        <a href={href} download className={classe}>
          {conteudo}
        </a>
      ) : (
        <Link href={href} className={classe}>
          {conteudo}
        </Link>
      )}
    </li>
  );
}

function Convite() {
  return (
    <section aria-labelledby="convite" className="mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl border bg-card p-6 text-center shadow-soft">
      <h1 id="convite" className="text-3xl font-bold">
        Seu painel no Jabuti
      </h1>
      <p className="text-muted-foreground">
        Com uma conta gratuita você acompanha os parlamentares que escolher, vê quem representa a sua cidade e o seu estado,
        vigia empresas e guarda listas com anotações. Tudo continua aberto para quem não entra.
      </p>
      <Button className="mx-auto w-fit" render={<Link href="/entrar?de=%2Fmeu" />} nativeButton={false}>
        Entrar ou criar conta
      </Button>
    </section>
  );
}
