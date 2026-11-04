// Cores dos partidos no gráfico de composição. São as cores que cada partido usa na própria comunicação
// (PT vermelho, PL azul-marinho, MDB verde...), para o leitor reconhecer o partido de relance.
//
// Com 16 partidos não existe paleta em que todo vizinho seja distinguível por quem tem daltonismo, e a ordem
// das fatias depende do resultado da eleição. Por isso a cor nunca é a única pista: a legenda ao lado do
// gráfico é uma tabela com a sigla e o número de cadeiras em texto. Todas as cores têm contraste de pelo
// menos 3:1 contra o fundo do cartão nos dois temas (#ffffff e #222222), conferido com o validador da skill
// de visualização de dados.

export type CorPartido = { claro: string; escuro: string };

/** Cinza de "Outros" e de partido sem cor cadastrada. */
export const COR_OUTROS: CorPartido = { claro: "#6b7280", escuro: "#9ca3af" };

const CORES: Record<string, CorPartido> = {
  PL: { claro: "#1f3a8a", escuro: "#8088f5" },
  PT: { claro: "#c8102e", escuro: "#f0565f" },
  UNIAO: { claro: "#00829b", escuro: "#2cc0dc" },
  PSD: { claro: "#c25a0e", escuro: "#f08a3c" },
  PP: { claro: "#2563c9", escuro: "#4aaef2" },
  REPUBLICANOS: { claro: "#0f5257", escuro: "#2f8fa3" },
  MDB: { claro: "#2e7d32", escuro: "#4fbf5a" },
  PODE: { claro: "#5b8c1f", escuro: "#9ccc4a" },
  PSB: { claro: "#9a7600", escuro: "#e8c22c" },
  PSOL: { claro: "#7b2d9b", escuro: "#b97ae0" },
  PCDOB: { claro: "#8b1c2b", escuro: "#d86a7a" },
  PSDB: { claro: "#4a6f96", escuro: "#8fb0d6" },
  NOVO: { claro: "#c74b00", escuro: "#ff8a3d" },
  PV: { claro: "#2f8f46", escuro: "#5fcf7e" },
  PDT: { claro: "#b0305c", escuro: "#e8709a" },
};

/** Grafias diferentes da mesma sigla entre TSE, Câmara e Senado. */
const APELIDOS: Record<string, string> = { PODEMOS: "PODE", "UNIAO BRASIL": "UNIAO" };

/** "União" → "UNIAO", "PC do B" → "PCDOB": a sigla em maiúsculas, sem acento nem espaço. */
export function chavePartido(sigla: string) {
  const limpa = sigla
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .trim();
  return APELIDOS[limpa] ?? limpa.replace(/\s+/g, "");
}

/** Cor do partido nos dois temas; cinza quando o partido não tem cor cadastrada. */
export function corDoPartido(sigla: string): CorPartido {
  return CORES[chavePartido(sigla)] ?? COR_OUTROS;
}
