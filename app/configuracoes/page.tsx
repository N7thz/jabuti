import { CircleCheckIcon, LayoutDashboardIcon, PinIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { alternarFixado } from "@/app/fixados/actions";
import { BotaoEntrar } from "@/components/auth-buttons";
import { hrefParlamentar, iniciais } from "@/components/parlamentar-item";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ehAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { getFixados, LIMITE_FIXADOS, type TipoFixado } from "@/lib/fixados";
import { getDono, getPerfil } from "@/lib/meu/perfil";
import { metadados } from "@/lib/metadados";
import { getSession } from "@/lib/session";
import { PreferenciaEmail } from "@/app/notificacoes/preferencia-email";
import { emailLigado } from "@/lib/notificacoes/email";

import { apagarMeusDados } from "./actions";
import { BotaoAcaoConta } from "./acoes-conta";
import { CONFIRMACOES, lerAcaoConta } from "./confirmacoes";
import { PreferenciasAparencia, PreferenciasLeitura } from "./preferencias";

export const metadata = metadados({
  titulo: "Configurações · Jabuti",
  indexar: false,
  descricao: "Tema, animações, tamanho do texto, sua conta, o seu painel e os dados que o portal guarda sobre você.",
});

export default function ConfiguracoesPage({ searchParams }: PageProps<"/configuracoes">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Configurações</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          Ajuste o portal ao seu jeito de ler. Aparência e acessibilidade ficam guardadas neste navegador e valem mesmo
          sem login.
        </p>
      </header>

      <Secao id="aparencia" titulo="Aparência" stagger={1}>
        <PreferenciasAparencia />
      </Secao>

      <Secao id="acessibilidade" titulo="Acessibilidade" stagger={2}>
        <PreferenciasLeitura />
      </Secao>

      <Secao id="conta" titulo="Conta" stagger={3}>
        <Suspense fallback={<Skeleton className="h-16 w-full" />}>
          <Conta searchParams={searchParams} />
        </Suspense>
      </Secao>

      <Secao id="meu-painel" titulo="Meu painel" stagger={4}>
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <MeuPainel />
        </Suspense>
      </Secao>

      <Secao id="notificacoes" titulo="Notificações" stagger={5}>
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <Notificacoes searchParams={searchParams} />
        </Suspense>
      </Secao>

      <Secao id="dados-salvos" titulo="Dados salvos" stagger={6}>
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <DadosSalvos searchParams={searchParams} />
        </Suspense>
      </Secao>
    </div>
  );
}

function Secao({ id, titulo, stagger, children }: { id: string; titulo: string; stagger: number; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-5 rounded-2xl border bg-card p-4 shadow-soft animate-enter sm:p-6"
      style={{ "--stagger": stagger } as React.CSSProperties}
    >
      <h2 id={id} className="text-xl font-bold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Sem login: aviso do que acabou de acontecer (saiu ou excluiu) e o botão de entrar. */
function AvisoConta({ conta }: { conta: unknown }) {
  if (conta === "saiu") {
    return (
      <Alert role="status">
        <CircleCheckIcon aria-hidden="true" />
        <AlertTitle>Você saiu da conta.</AlertTitle>
      </Alert>
    );
  }
  if (conta === "excluida") {
    return (
      <Alert role="status">
        <CircleCheckIcon aria-hidden="true" />
        <AlertTitle>Sua conta no Jabuti foi excluída.</AlertTitle>
        <AlertDescription>
          <p>
            Apagamos sua conta, seus atalhos, o que você seguia e suas notificações. Se você entrava pelo Google, dá para tirar também a permissão
            que o Jabuti recebeu dele nas{" "}
            <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer">
              conexões da sua conta Google
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
            .
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

async function Conta({ searchParams }: Pick<PageProps<"/configuracoes">, "searchParams">) {
  const [sessao, { confirmar, conta }] = await Promise.all([getSession(), searchParams]);
  if (!sessao) {
    return (
      <div className="flex flex-col items-start gap-3">
        <AvisoConta conta={conta} />
        <p className="text-muted-foreground">
          Você está navegando sem login. Tudo no portal é aberto; entrar só serve para fixar políticos, partidos e
          bancadas e vê-los na barra lateral em qualquer aparelho.
        </p>
        <BotaoEntrar />
      </div>
    );
  }

  const { name, email, image } = sessao.user;
  const pedido = lerAcaoConta(confirmar);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar size="lg">
          {image && <AvatarImage src={image} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback>{iniciais(name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{name}</span>
          <span className="truncate text-sm text-muted-foreground">{email}</span>
        </div>
      </div>

      {pedido ? (
        <ConfirmarSemJs acao={pedido} />
      ) : (
        <div className="flex flex-wrap gap-3">
          <BotaoAcaoConta acao="sair" />
          <BotaoAcaoConta acao="excluir" />
        </div>
      )}
      {ehAdmin(sessao) && (
        <Link href="/admin/apoiadores" className="w-fit text-sm text-link underline underline-offset-4">
          Admin: mural de apoiadores
        </Link>
      )}
      <p className="text-sm text-muted-foreground">
        Excluir a conta apaga seus atalhos, seguidos, notificações, listas, empresas vigiadas e a cidade do painel, e sai. Para apagar só esses dados e continuar logado, use &quot;Apagar meus
        dados&quot; logo abaixo.
      </p>
    </div>
  );
}

/**
 * Confirmação sem JavaScript: os botões de Sair/Excluir são links para `?confirmar=`, e a página responde com
 * este painel. Com JavaScript o mesmo texto aparece num diálogo e este painel não é usado.
 */
function ConfirmarSemJs({ acao }: { acao: "sair" | "excluir" }) {
  const c = CONFIRMACOES[acao];
  return (
    <form
      action={c.acao}
      role="alertdialog"
      aria-labelledby="confirmar-titulo"
      aria-describedby="confirmar-descricao"
      className={`flex flex-col items-start gap-3 rounded-xl border p-4 ${acao === "excluir" ? "border-destructive/40" : ""}`}
    >
      <input type="hidden" name="confirmo" value="sim" />
      <h3 id="confirmar-titulo" className="font-semibold">
        {c.titulo}
      </h3>
      <p id="confirmar-descricao" className="text-sm text-muted-foreground">
        {c.descricao}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant={acao === "excluir" ? "destructive" : "default"}>
          <c.Icone data-icon="inline-start" aria-hidden="true" />
          {c.confirmar}
        </Button>
        <Link href="/configuracoes#conta" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/** O que o "Meu painel" usa da conta (cidade, empresas vigiadas, listas), com atalho para cada parte do painel. */
async function MeuPainel() {
  const usuario = await getDono();
  if (!usuario) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">
          Com login, o seu painel junta num lugar só os parlamentares que você acompanha, quem representa a sua cidade, as
          empresas que você vigia e as suas listas.
        </p>
        <Link href="/meu" className={buttonVariants({ variant: "outline" })}>
          <LayoutDashboardIcon data-icon="inline-start" aria-hidden="true" />
          Conhecer o painel
        </Link>
      </div>
    );
  }

  const [perfil, empresas, listas] = await Promise.all([
    getPerfil(usuario),
    db.empresaVigiada.count({ where: { usuario } }),
    db.lista.count({ where: { usuario } }),
  ]);
  const municipio = perfil?.municipioIbge
    ? await db.municipio.findUnique({ where: { ibge: perfil.municipioIbge }, select: { nome: true, uf: true } })
    : null;

  const itens = [
    {
      href: municipio ? `/meu?trocar=1&uf=${municipio.uf}#representantes` : "/meu#representantes",
      rotulo: "Sua cidade",
      valor: municipio ? `${municipio.nome} (${municipio.uf})` : "Nenhuma escolhida",
      acao: municipio ? "Trocar" : "Escolher",
    },
    {
      href: "/meu#empresas",
      rotulo: "Empresas vigiadas",
      valor: empresas === 0 ? "Nenhuma" : `${empresas} ${empresas === 1 ? "empresa" : "empresas"}`,
      acao: "Ver",
    },
    {
      href: "/listas",
      rotulo: "Listas",
      valor: listas === 0 ? "Nenhuma" : `${listas} ${listas === 1 ? "lista" : "listas"}`,
      acao: "Ver",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        O que o seu painel usa para mostrar as novidades. A cidade define os seus representantes; ela fica só na sua conta.
      </p>
      <ul className="flex flex-col divide-y rounded-xl border">
        {itens.map((item) => (
          <li key={item.rotulo} className="flex flex-wrap items-center justify-between gap-2 py-2 pr-2 pl-3">
            <span className="flex min-w-0 flex-col">
              <span className="text-sm text-muted-foreground">{item.rotulo}</span>
              <span className="truncate font-medium">{item.valor}</span>
            </span>
            <Link href={item.href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {item.acao}
              <span className="sr-only"> {item.rotulo.toLowerCase()}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/meu" className={`w-fit ${buttonVariants({ variant: "default" })}`}>
        <LayoutDashboardIcon data-icon="inline-start" aria-hidden="true" />
        Abrir meu painel
      </Link>
    </div>
  );
}

async function Notificacoes({ searchParams }: Pick<PageProps<"/configuracoes">, "searchParams">) {
  const [sessao, { email }] = await Promise.all([getSession(), searchParams]);
  if (!sessao) {
    return (
      <p className="text-muted-foreground">
        Com login, dá para seguir parlamentares e projetos e receber as novidades no portal e, se quiser, por email.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        As novidades de quem você segue ficam em <Link href="/notificacoes">Notificações</Link>. Aqui você vai poder
        escolher recebê-las também por email.
      </p>
      {emailLigado() ? (
        <PreferenciaEmail sessao={sessao} voltar="/configuracoes" salvo={email === "salvo"} />
      ) : (
        <p className="text-sm text-muted-foreground">O aviso por email ainda não está disponível.</p>
      )}
    </div>
  );
}

const TIPOS: Record<TipoFixado, string> = { PARLAMENTAR: "Parlamentares", PARTIDO: "Partidos", BANCADA: "Bancadas" };

async function DadosSalvos({ searchParams }: Pick<PageProps<"/configuracoes">, "searchParams">) {
  const [{ dados: aviso }, fixados] = await Promise.all([searchParams, getFixados()]);

  if (!fixados) {
    return (
      <p className="text-muted-foreground">
        Sem login, o portal não guarda nada sobre você no servidor. As preferências acima ficam só neste navegador.
      </p>
    );
  }

  const grupos = [
    {
      tipo: "PARLAMENTAR" as const,
      itens: fixados.parlamentares.map((f) => {
        const [casa, id] = f.chave.split("-");
        return { ...f, href: casa === "camara" || casa === "senado" ? hrefParlamentar({ casa, id }) : "/parlamentares" };
      }),
    },
    {
      tipo: "PARTIDO" as const,
      itens: fixados.partidos.map((f) => ({ ...f, href: `/parlamentares?partido=${encodeURIComponent(f.chave)}` })),
    },
    {
      tipo: "BANCADA" as const,
      itens: fixados.bancadas.map((f) => ({ ...f, href: `/parlamentares?uf=${encodeURIComponent(f.chave)}` })),
    },
  ].filter((g) => g.itens.length > 0);
  const total = grupos.reduce((soma, g) => soma + g.itens.length, 0);

  return (
    <div className="flex flex-col gap-6">
      {aviso === "apagados" && (
        <Alert role="status">
          <CircleCheckIcon aria-hidden="true" />
          <AlertTitle>Seus dados foram apagados.</AlertTitle>
        </Alert>
      )}

      <p className="text-muted-foreground">
        Além da sua conta (nome, email e, se você criou uma, a senha criptografada), o portal guarda só os atalhos que você
        fixou, o que você segue, as notificações dos últimos 180 dias, a sua escolha de receber ou não emails e, do seu
        painel, a cidade escolhida, as empresas vigiadas, as listas com as suas anotações e as preferências do site.
      </p>

      {total === 0 ? (
        <p className="flex items-center gap-2">
          <PinIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          Nenhum atalho fixado ainda.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} de {LIMITE_FIXADOS} atalhos fixados.
          </p>
          {grupos.map((grupo) => (
            <div key={grupo.tipo} className="flex flex-col gap-2">
              <h3 className="font-semibold">{TIPOS[grupo.tipo]}</h3>
              <ul className="flex flex-col divide-y rounded-xl border">
                {grupo.itens.map((item) => (
                  <li key={item.chave} className="flex items-center justify-between gap-2 py-1 pr-1 pl-3">
                    <Link href={item.href} className="min-w-0 truncate underline-offset-4 hover:underline">
                      {item.rotulo}
                    </Link>
                    <form action={alternarFixado}>
                      <input type="hidden" name="tipo" value={grupo.tipo} />
                      <input type="hidden" name="chave" value={item.chave} />
                      <input type="hidden" name="rotulo" value={item.rotulo} />
                      <Button type="submit" variant="ghost" size="icon" aria-label={`Desafixar ${item.rotulo}`}>
                        <XIcon aria-hidden="true" />
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      {/* Confirmação por caixa marcada em vez de diálogo: funciona sem JavaScript e não some ao rolar a página. */}
      <form action={apagarMeusDados} className="flex flex-col items-start gap-3 rounded-xl border border-destructive/40 p-4">
        <h3 className="font-semibold">Apagar meus dados</h3>
        <p className="text-sm text-muted-foreground">
          Remove todos os atalhos fixados, o que você segue, as notificações, a preferência de email, a cidade do painel,
          as empresas vigiadas, as listas e as preferências do site guardadas na conta. Não dá para desfazer. Sua conta
          continua existindo; se quiser uma cópia antes, use <a href="/api/meus-dados" download>Baixar meus dados</a>.
        </p>
        {aviso === "confirme" && (
          <Alert variant="destructive">
            <AlertDescription>Marque a caixa abaixo para confirmar.</AlertDescription>
          </Alert>
        )}
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="confirmo" value="sim" required className="size-4 accent-destructive" />
          Entendo que isso apaga meus atalhos, o que sigo, minhas notificações, listas e empresas vigiadas.
        </label>
        <Button type="submit" variant="destructive">
          <Trash2Icon data-icon="inline-start" aria-hidden="true" />
          Apagar meus dados
        </Button>
      </form>
    </div>
  );
}
