/**
 * Assuntos do menu lateral. Parlamentares, Leis e Estados e cidades aparecem sempre; os outros a pessoa
 * liga em "Personalizar menu". A escolha fica no localStorage (vale para o aparelho, com ou sem login) e
 * vira `data-menu-<id>` no <html> antes da primeira pintura (SCRIPT_MENU), para o menu não piscar.
 * O CSS em app/globals.css esconde o item opcional que não tem o atributo, menos o da página aberta.
 */
export const ASSUNTOS_OPCIONAIS = [
  { id: "cnpj", rotulo: "Consulta CNPJ", descricao: "Contratos e sanções de empresas" },
  { id: "comparar", rotulo: "Comparar parlamentares", descricao: "Dois parlamentares lado a lado" },
  { id: "ranking", rotulo: "Ranking da cota", descricao: "Quem mais gastou da cota no ano" },
  { id: "emendas", rotulo: "Emendas no orçamento", descricao: "Emendas por ano, autor e destino" },
  { id: "loa", rotulo: "Orçamento federal (LOA)", descricao: "O orçamento do ano por área do governo" },
  { id: "glossario", rotulo: "Entenda os termos", descricao: "O glossário com todos os termos" },
] as const;

export type AssuntoOpcional = (typeof ASSUNTOS_OPCIONAIS)[number]["id"];

const CHAVE = "jabuti-menu";
const IDS: readonly string[] = ASSUNTOS_OPCIONAIS.map((a) => a.id);

/** Lê o que está salvo ("comparar,ranking"), ignorando o que não for um assunto opcional. */
export function lerMenu(valor: string | null | undefined): AssuntoOpcional[] {
  if (!valor) return [];
  return [...new Set(valor.split(","))].filter((id): id is AssuntoOpcional => IDS.includes(id));
}

/** Assuntos ligados neste aparelho (só no navegador). */
export function menuSalvo(): AssuntoOpcional[] {
  try {
    return lerMenu(localStorage.getItem(CHAVE));
  } catch {
    return [];
  }
}

/** Grava a escolha e aplica no <html> na hora; lista vazia volta ao padrão. */
export function salvarMenu(ligados: readonly AssuntoOpcional[]) {
  const dataset = document.documentElement.dataset;
  for (const { id } of ASSUNTOS_OPCIONAIS) {
    const chave = `menu${id[0].toUpperCase()}${id.slice(1)}`;
    if (ligados.includes(id)) dataset[chave] = "";
    else delete dataset[chave];
  }
  try {
    if (ligados.length === 0) localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, ligados.join(","));
  } catch {}
  window.dispatchEvent(new Event(EVENTO_MENU));
}

/** Avisa os componentes abertos (o dialog e o menu) que a escolha mudou. */
export const EVENTO_MENU = "jabuti-menu";

/** Roda no <head> antes de pintar: liga os `data-menu-<id>` salvos. */
export const SCRIPT_MENU = `try{var m=(localStorage.getItem(${JSON.stringify(CHAVE)})||"").split(","),ok=${JSON.stringify(IDS)};for(var i=0;i<m.length;i++)if(ok.indexOf(m[i])>-1)document.documentElement.setAttribute("data-menu-"+m[i],"")}catch(e){}`;
