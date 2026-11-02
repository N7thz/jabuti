import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import { HeroFundo } from "@/components/hero-fundo";
import { Termo } from "@/components/termo";
import { LIMITE_FIXADOS } from "@/lib/fixados";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({
  titulo: "Ajuda · Jabuti",
  descricao:
    "Como encontrar um político, comparar, baixar os dados, fixar quem você acompanha, ajustar o texto e falar com a gente.",
});

const stagger = (i: number) => ({ "--stagger": i }) as React.CSSProperties;

type Pergunta = { pergunta: string; resposta: React.ReactNode };
type Grupo = { id: string; titulo: string; perguntas: Pergunta[] };

const ESTILO_LINK =
  "font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function L({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={ESTILO_LINK}>
      {children}
    </Link>
  );
}

const GRUPOS: Grupo[] = [
  {
    id: "comecar",
    titulo: "Por onde começar",
    perguntas: [
      {
        pergunta: "Para que serve o Jabuti?",
        resposta: (
          <p>
            Para acompanhar e cobrar quem você elegeu com dados públicos oficiais: como votou, quanto gastou, para onde
            mandou dinheiro e como estão as contas da sua cidade e do seu estado. Tudo vem de órgãos do governo, como
            Câmara, Senado, TSE e Portal da Transparência.
          </p>
        ),
      },
      {
        pergunta: "Como acho um deputado ou senador?",
        resposta: (
          <p>
            Abra <L href="/parlamentares">Parlamentares</L> e busque pelo nome ou filtre por estado e partido. Na página de cada um
            aparecem votos, presença, gastos da <Termo id="cota-parlamentar">cota parlamentar</Termo>, emendas e dados
            de campanha.
          </p>
        ),
      },
      {
        pergunta: "Como vejo o que chegou à minha cidade?",
        resposta: (
          <p>
            Em <L href="/estados">Estados e cidades</L>, escolha o estado e depois a cidade. Ali estão as emendas
            enviadas para lá (inclusive as <Termo id="emenda-pix">emendas Pix</Termo>), quem mandou e as contas do
            município.
          </p>
        ),
      },
      {
        pergunta: "Não entendi uma palavra. Onde vejo o que ela significa?",
        resposta: (
          <p>
            Palavras técnicas aparecem sublinhadas com pontinhos: toque ou clique nelas para ver uma explicação curta. A
            lista completa está em <L href="/glossario">Entenda os termos</L>.
          </p>
        ),
      },
    ],
  },
  {
    id: "consultas",
    titulo: "Consultas e comparações",
    perguntas: [
      {
        pergunta: "Dá para comparar dois políticos?",
        resposta: (
          <p>
            Sim. Em <L href="/comparar">Comparar parlamentares</L>, escolha quem você quer colocar lado a lado e veja
            votos, presença e gastos juntos.
          </p>
        ),
      },
      {
        pergunta: "Quem gasta mais com a cota parlamentar?",
        resposta: (
          <p>
            O <L href="/rankings/cota">Ranking da cota</L> ordena deputados e senadores pelo valor gasto. Dá para
            filtrar por ano, por Câmara ou Senado e por tipo de gasto.
          </p>
        ),
      },
      {
        pergunta: "Como consulto uma empresa?",
        resposta: (
          <p>
            Em <L href="/empresas">Consulta CNPJ</L>, digite o CNPJ para ver os contratos da empresa com o governo
            federal e se ela tem sanções registradas, como as do <Termo id="ceis">CEIS</Termo> e do{" "}
            <Termo id="tcu">TCU</Termo>.
          </p>
        ),
      },
      {
        pergunta: "Os filtros somem quando recarrego a página?",
        resposta: (
          <p>
            Não. Os filtros ficam no endereço da página, então o link que você copiar abre exatamente a mesma consulta,
            para você ou para quem recebê-lo.
          </p>
        ),
      },
    ],
  },
  {
    id: "dados",
    titulo: "Baixar e compartilhar",
    perguntas: [
      {
        pergunta: "Como baixo os dados?",
        resposta: (
          <p>
            Nas páginas com tabelas (votos, gastos da cota, ranking, emendas de cada cidade) há o botão para baixar em{" "}
            <Termo id="csv">CSV</Termo>. O arquivo abre no Excel, no Google Planilhas ou no LibreOffice.
          </p>
        ),
      },
      {
        pergunta: "Como mando uma página para alguém?",
        resposta: (
          <p>
            Use o botão de compartilhar da página ou copie o endereço do navegador. O link chega no WhatsApp e nas redes
            com título, resumo e imagem próprios.
          </p>
        ),
      },
    ],
  },
  {
    id: "conta",
    titulo: "Conta e fixados",
    perguntas: [
      {
        pergunta: "Preciso criar conta?",
        resposta: (
          <p>
            Não. Tudo no portal pode ser consultado sem login. A conta só serve para fixar quem você acompanha. Dá para{" "}
            <L href="/entrar">entrar</L> com o Google ou com email e senha.
          </p>
        ),
      },
      {
        pergunta: "O que é fixar?",
        resposta: (
          <p>
            É guardar atalhos para parlamentares, partidos e <Termo id="bancada">bancadas</Termo> que você acompanha.
            Eles aparecem no menu lateral e viram filtros prontos nas consultas. Cada conta pode fixar até{" "}
            {LIMITE_FIXADOS} itens.
          </p>
        ),
      },
      {
        pergunta: "Esqueci minha senha.",
        resposta: (
          <p>
            Em <L href="/recuperar-senha">Recuperar senha</L>, informe seu email e enviaremos um link para criar uma
            senha nova.
          </p>
        ),
      },
      {
        pergunta: "Como apago minha conta e meus dados?",
        resposta: (
          <p>
            Em <L href="/configuracoes#conta">Configurações</L>, na parte Conta, você pode apagar seus fixados e manter a
            conta, ou excluir a conta inteira junto com tudo o que ela guardava.
          </p>
        ),
      },
    ],
  },
  {
    id: "leitura",
    titulo: "Leitura e acessibilidade",
    perguntas: [
      {
        pergunta: "Como deixo o texto maior?",
        resposta: (
          <p>
            Em <L href="/configuracoes#acessibilidade">Configurações</L>, escolha o tamanho do texto e o espaçamento
            entre linhas. A escolha fica salva neste navegador e vale mesmo sem login.
          </p>
        ),
      },
      {
        pergunta: "Dá para usar o modo escuro ou desligar as animações?",
        resposta: (
          <p>
            Sim, também em <L href="/configuracoes#aparencia">Configurações</L>. Por padrão o portal segue o tema e a
            preferência de movimento do seu aparelho.
          </p>
        ),
      },
      {
        pergunta: "Funciona com leitor de tela e só com o teclado?",
        resposta: (
          <p>
            Sim. Use Tab para navegar; o primeiro Tab mostra o atalho &ldquo;Pular para o conteúdo&rdquo;. Os formulários
            funcionam mesmo com o JavaScript desligado. Se algo não funcionar com a sua tecnologia assistiva, conte para
            a gente.
          </p>
        ),
      },
    ],
  },
  {
    id: "fontes",
    titulo: "Sobre os dados",
    perguntas: [
      {
        pergunta: "De onde vêm os números?",
        resposta: (
          <p>
            Só de fontes oficiais: Portal da Transparência (CGU), Câmara, Senado, TSE, Transferegov, Siconfi (Tesouro
            Nacional), TCU e IBGE. Sempre que possível o portal consulta o órgão na hora, então o dado é o mesmo que
            está no site oficial.
          </p>
        ),
      },
      {
        pergunta: "Apareceu um aviso de que a fonte está fora do ar.",
        resposta: (
          <p>
            Às vezes o sistema do órgão público cai ou demora. Nesse caso o portal avisa em vez de mostrar uma lista
            vazia, para você não achar que não existe nada. Tente de novo em alguns minutos.
          </p>
        ),
      },
      {
        pergunta: "Achei um dado errado. O que faço?",
        resposta: (
          <p>
            Avise em <L href="/feedback">Sugestões e problemas</L> dizendo a página e o que parece errado. Se o erro
            estiver na fonte oficial, indicamos a quem reclamar.
          </p>
        ),
      },
    ],
  },
];

export default function AjudaPage() {
  return (
    <div data-secao="glossario" className="mx-auto flex w-full max-w-7xl flex-col gap-[clamp(2.5rem,5vw,4rem)] px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      {/* Mesmo hero da Consulta CNPJ: bloco que segue o tema (oliva claro no claro, charcoal no escuro) com círculos e grade. */}
      <section
        aria-labelledby="titulo"
        className="relative isolate flex flex-col items-center justify-center gap-8 overflow-hidden rounded-2xl bg-muted dark:bg-card px-5 py-[clamp(3.5rem,9vw,7rem)] text-center text-foreground ring-1 ring-border"
      >
        <HeroFundo />
        <div className="flex flex-col items-center gap-5 animate-enter">
          <p className="text-sm font-medium tracking-wide text-secao uppercase">Ajuda</p>
          <h1 id="titulo" className="flex max-w-[18ch] flex-col text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.95]">
            <span className="font-bold tracking-[-0.04em]">Como usar</span>
            <span className="font-serif font-normal tracking-normal italic">o portal sem complicação</span>
          </h1>
          <p className="max-w-[52ch] text-lg text-muted-foreground">
            Respostas curtas para as dúvidas mais comuns. Escolha um assunto ou toque numa pergunta para abrir a
            resposta.
          </p>
        </div>
        <nav aria-label="Assuntos da ajuda" className="animate-enter" style={stagger(1)}>
          <ul className="flex max-w-2xl flex-wrap justify-center gap-2">
            {GRUPOS.map((grupo) => (
              <li key={grupo.id}>
                <a
                  href={`#${grupo.id}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-medium outline-none transition-colors hover:bg-accent/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted dark:focus-visible:ring-offset-card"
                >
                  {grupo.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        {GRUPOS.map((grupo, i) => (
          <section
            key={grupo.id}
            aria-labelledby={grupo.id}
            className="flex flex-col gap-3 animate-enter"
            style={stagger(i + 1)}
          >
            <h2 id={grupo.id} className="scroll-mt-24 border-b pb-3 text-2xl font-bold">
              {grupo.titulo}
            </h2>
            <div className="flex flex-col gap-2">
              {grupo.perguntas.map(({ pergunta, resposta }) => (
                // <details> nativo: abre e fecha sem JavaScript e o leitor de tela anuncia expandido/recolhido.
                <details key={pergunta} className="group rounded-xl border bg-card shadow-soft">
                  <summary
                    className={
                      "flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3 font-semibold " +
                      "outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
                    }
                  >
                    {pergunta}
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="max-w-[70ch] px-4 pb-4 text-muted-foreground">{resposta}</div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section
          aria-labelledby="contato"
          className="flex flex-col gap-2 rounded-2xl border-2 border-secao bg-secao-suave p-4 animate-enter sm:p-6"
          style={stagger(GRUPOS.length + 1)}
        >
          <h2 id="contato" className="text-xl font-bold">
            Não achou o que procurava?
          </h2>
          <p className="max-w-[65ch]">
            Escreva em <L href="/feedback?de=/ajuda">Sugestões e problemas</L>. Lemos tudo e respondemos pelo email, se você
            deixar um.
          </p>
        </section>
      </div>
    </div>
  );
}
