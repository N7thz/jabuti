/**
 * Preferências de leitura da pessoa: tamanho do texto e espaçamento. Ficam no localStorage e viram
 * `data-texto` / `data-espacamento` no <html> antes da primeira pintura (ver SCRIPT_ACESSIBILIDADE);
 * o CSS em app/acessibilidade.css lê dali. Mesmo formato de lib/animacoes.ts.
 */
export const PREFERENCIAS_LEITURA = {
  texto: {
    chave: "jabuti-texto",
    atributo: "texto",
    opcoes: ["normal", "grande", "maior"],
  },
  espacamento: {
    chave: "jabuti-espacamento",
    atributo: "espacamento",
    opcoes: ["normal", "amplo"],
  },
} as const;

export type PreferenciaLeitura = keyof typeof PREFERENCIAS_LEITURA;
export type ValorLeitura<P extends PreferenciaLeitura> = (typeof PREFERENCIAS_LEITURA)[P]["opcoes"][number];

/** Valor salvo, ou "normal" se não houver ou não for reconhecido. */
export function lerLeitura<P extends PreferenciaLeitura>(preferencia: P, valor: string | null | undefined): ValorLeitura<P> {
  const opcoes: readonly string[] = PREFERENCIAS_LEITURA[preferencia].opcoes;
  return (valor && opcoes.includes(valor) ? valor : "normal") as ValorLeitura<P>;
}

/** Grava a preferência e aplica no <html> na hora. "normal" apaga a chave e o atributo. */
export function salvarLeitura<P extends PreferenciaLeitura>(preferencia: P, valor: ValorLeitura<P>) {
  const { chave, atributo } = PREFERENCIAS_LEITURA[preferencia];
  if (valor === "normal") delete document.documentElement.dataset[atributo];
  else document.documentElement.dataset[atributo] = valor;
  try {
    if (valor === "normal") localStorage.removeItem(chave);
    else localStorage.setItem(chave, valor);
  } catch {}
}

/** Roda no <head> antes de pintar: sem ele a página apareceria com o texto pequeno e só depois cresceria. */
export const SCRIPT_ACESSIBILIDADE = `try{${Object.values(PREFERENCIAS_LEITURA)
  .map(
    ({ chave, atributo, opcoes }) =>
      `var v=localStorage.getItem(${JSON.stringify(chave)});if(${JSON.stringify(opcoes.filter((o) => o !== "normal"))}.indexOf(v)>-1)document.documentElement.dataset.${atributo}=v;`,
  )
  .join("")}}catch(e){}`;
