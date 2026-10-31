import { CircleCheckIcon, PinIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { alternarFixado } from "@/app/fixados/actions";
import { BotaoEntrar } from "@/components/auth-buttons";
import { hrefParlamentar, iniciais } from "@/components/parlamentar-item";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFixados, LIMITE_FIXADOS, type TipoFixado } from "@/lib/fixados";
import { metadados } from "@/lib/metadados";
import { getSession } from "@/lib/session";

import { apagarMeusDados } from "./actions";
import { BotaoAcaoConta } from "./acoes-conta";
import { CONFIRMACOES, lerAcaoConta } from "./confirmacoes";
import { PreferenciasAparencia, PreferenciasLeitura } from "./preferencias";

export const metadata = metadados({
  titulo: "Configurações · Jabuti",
  descricao: "Tema, animações, tamanho do texto, sua conta e os dados que o portal guarda sobre você.",
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

      <Secao id="dados-salvos" titulo="Dados salvos" stagger={4}>
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
            Apagamos sua conta e seus atalhos fixados. Se você entrava pelo Google, dá para tirar também a permissão
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
      <p className="text-sm text-muted-foreground">
        Excluir a conta apaga seus atalhos e sai. Para apagar só os atalhos e continuar logado, use &quot;Apagar meus
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
        Além da sua conta (nome, email e, se você criou uma, a senha criptografada), o portal guarda só os atalhos que você fixou.
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
          Remove todos os atalhos fixados. Não dá para desfazer. Sua conta Google não é afetada.
        </p>
        {aviso === "confirme" && (
          <Alert variant="destructive">
            <AlertDescription>Marque a caixa abaixo para confirmar.</AlertDescription>
          </Alert>
        )}
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="confirmo" value="sim" required className="size-4 accent-destructive" />
          Entendo que isso apaga todos os meus atalhos fixados.
        </label>
        <Button type="submit" variant="destructive" disabled={total === 0}>
          <Trash2Icon data-icon="inline-start" aria-hidden="true" />
          Apagar meus dados
        </Button>
      </form>
    </div>
  );
}
