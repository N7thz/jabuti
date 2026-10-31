"use client";

import { MonitorIcon, MoonIcon, SparklesIcon, SunIcon, ZapIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useId, useSyncExternalStore } from "react";

import { useAnimacoes } from "@/components/animacoes-provider";
import { lerLeitura, PREFERENCIAS_LEITURA, salvarLeitura, type PreferenciaLeitura, type ValorLeitura } from "@/lib/acessibilidade";
import { lerPreferencia } from "@/lib/animacoes";
import { cn } from "@/lib/utils";

type Opcao<V extends string> = { valor: V; rotulo: string; descricao?: string; icone?: React.ReactNode; amostra?: string };

/**
 * Grupo de botões de rádio nativos em cartões: as setas do teclado trocam a opção e o leitor de tela anuncia
 * "x de y". Sem valor (antes de ler o que está salvo), nenhuma opção aparece marcada.
 */
function GrupoOpcoes<V extends string>({
  legenda,
  ajuda,
  valor,
  opcoes,
  onChange,
}: {
  legenda: string;
  ajuda?: string;
  valor: V | undefined;
  opcoes: Opcao<V>[];
  onChange: (valor: V) => void;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={ajuda ? `${id}-ajuda` : undefined}>
      <legend className="font-semibold">{legenda}</legend>
      {ajuda && (
        <p id={`${id}-ajuda`} className="-mt-1 text-sm text-muted-foreground">
          {ajuda}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        {opcoes.map((opcao) => (
          <label
            key={opcao.valor}
            className={cn(
              "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-colors",
              "has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              "hover:bg-accent/60",
            )}
          >
            <input
              type="radio"
              name={id}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => onChange(opcao.valor)}
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2 font-medium [&_svg]:size-4 [&_svg]:text-muted-foreground">
                {opcao.icone}
                {opcao.rotulo}
              </span>
              {opcao.descricao && <span className="text-sm text-muted-foreground">{opcao.descricao}</span>}
              {opcao.amostra && (
                <span aria-hidden="true" className="mt-1 font-semibold" style={{ fontSize: opcao.amostra }}>
                  Aa
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Tema e animações: os mesmos controles do menu de aparência do header, com mais explicação. */
export function PreferenciasAparencia() {
  const { theme, setTheme } = useTheme();
  const { preferencia, setPreferencia } = useAnimacoes();
  // O next-themes só sabe o tema salvo depois de montar; até lá nenhuma opção fica marcada.
  const montado = useMontado();

  return (
    <div className="flex flex-col gap-8">
      <GrupoOpcoes
        legenda="Tema"
        valor={montado ? (theme as "light" | "dark" | "system") : undefined}
        onChange={setTheme}
        opcoes={[
          { valor: "light", rotulo: "Claro", icone: <SunIcon aria-hidden="true" /> },
          { valor: "dark", rotulo: "Escuro", icone: <MoonIcon aria-hidden="true" /> },
          {
            valor: "system",
            rotulo: "Sistema",
            descricao: "Segue o modo claro ou escuro do celular ou computador.",
            icone: <MonitorIcon aria-hidden="true" />,
          },
        ]}
      />
      <GrupoOpcoes
        legenda="Animações"
        ajuda="Desligar deixa o site mais leve em aparelhos simples e ajuda quem sente enjoo com movimento na tela."
        valor={montado ? preferencia : undefined}
        onChange={(v) => setPreferencia(lerPreferencia(v))}
        opcoes={[
          { valor: "ligadas", rotulo: "Ligadas", icone: <SparklesIcon aria-hidden="true" /> },
          { valor: "desligadas", rotulo: "Desligadas", descricao: "Mais leve.", icone: <ZapIcon aria-hidden="true" /> },
          {
            valor: "sistema",
            rotulo: "Sistema",
            descricao: "Segue a opção \"reduzir movimento\" do aparelho.",
            icone: <MonitorIcon aria-hidden="true" />,
          },
        ]}
      />
    </div>
  );
}

/** Tamanho do texto e espaçamento, guardados neste navegador e aplicados antes de a página aparecer. */
export function PreferenciasLeitura() {
  const [texto, setTexto] = usePreferenciaLeitura("texto");
  const [espacamento, setEspacamento] = usePreferenciaLeitura("espacamento");

  return (
    <div className="flex flex-col gap-8">
      <GrupoOpcoes
        legenda="Tamanho do texto"
        ajuda="Aumenta o texto, os espaços e os botões juntos, sem quebrar o layout."
        valor={texto}
        onChange={setTexto}
        opcoes={[
          { valor: "normal", rotulo: "Normal", amostra: "1rem" },
          { valor: "grande", rotulo: "Grande", amostra: "1.125rem" },
          { valor: "maior", rotulo: "Maior", amostra: "1.25rem" },
        ]}
      />
      <GrupoOpcoes
        legenda="Espaçamento do texto"
        ajuda="Mais espaço entre linhas, letras e palavras. Ajuda quem tem dislexia ou baixa visão."
        valor={espacamento}
        onChange={setEspacamento}
        opcoes={[
          { valor: "normal", rotulo: "Normal" },
          { valor: "amplo", rotulo: "Amplo", descricao: "Linhas e palavras mais afastadas." },
        ]}
      />
    </div>
  );
}

const nada = () => () => {};

/** false no servidor e na hidratação, true depois: o next-themes só conhece o tema salvo no navegador. */
function useMontado() {
  return useSyncExternalStore(
    nada,
    () => true,
    () => false,
  );
}

/** Avisa os componentes desta aba quando uma preferência de leitura muda (o evento "storage" só chega às outras abas). */
const EVENTO_LEITURA = "jabuti-leitura";

function assinarLeitura(aviso: () => void) {
  window.addEventListener(EVENTO_LEITURA, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO_LEITURA, aviso);
    window.removeEventListener("storage", aviso);
  };
}

function usePreferenciaLeitura<P extends PreferenciaLeitura>(preferencia: P) {
  const valor = useSyncExternalStore(
    assinarLeitura,
    () => {
      try {
        return lerLeitura(preferencia, localStorage.getItem(PREFERENCIAS_LEITURA[preferencia].chave));
      } catch {
        return lerLeitura(preferencia, null);
      }
    },
    () => undefined,
  );

  const mudar = (novo: ValorLeitura<P>) => {
    salvarLeitura(preferencia, novo);
    window.dispatchEvent(new Event(EVENTO_LEITURA));
  };
  return [valor, mudar] as const;
}
