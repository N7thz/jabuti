import type { HistoricoDeputadoApi, MandatoExternoApi } from "../camara/types";
import type { MandatoSenado } from "../senado/types";

// Trajetória política: os cargos que o parlamentar exerceu e as eleições que disputou, juntando três fontes.
//  - Câmara/Senado: os mandatos na própria Casa (oficial).
//  - TSE: as eleições disputadas desde 2014 com o resultado, casadas por CPF ou título (oficial).
//  - Câmara, mandatosExternos: cargos fora da Câmara que o próprio deputado informou (incompleto).
// Quando duas fontes falam do mesmo mandato, fica a oficial.

export type FonteCargo = "camara" | "senado" | "tse" | "declarado";

export interface CargoExercido {
  cargo: string;
  /** "Boa Vista (RR)" nas eleições municipais, "RR" nas outras. */
  local: string;
  inicio: number;
  /** Ano de fim; `null` quando não se sabe (cargo informado pelo deputado sem o fim). */
  fim: number | null;
  /** É o mandato que ele exerce agora. */
  atual: boolean;
  partido: string | null;
  fonte: FonteCargo;
  /** "eleito em 2018", "como suplente". */
  nota: string | null;
}

export type Desfecho = "eleito" | "suplente" | "nao-eleito" | "segundo-turno" | "outro";

export interface EleicaoDisputada {
  ano: number;
  cargo: string;
  local: string;
  partido: string;
  /** Texto do TSE, já em formato de frase ("Eleito por QP"). */
  resultado: string | null;
  desfecho: Desfecho;
}

export interface EleicaoTse {
  ano: number;
  cargo: string;
  uf: string;
  municipio: string | null;
  partido: string;
  resultado: string | null;
}

const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "d'"]);

/** "BOA VISTA" → "Boa Vista", "SÃO JOÃO DO RIO DO PEIXE" → "São João do Rio do Peixe". */
export function nomeProprio(texto: string) {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** "DEPUTADO FEDERAL" → "Deputado federal"; "Deputado(a) Estadual" → "Deputado(a) estadual". */
export function nomeCargo(cargo: string) {
  const t = cargo.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Chave para comparar cargos de fontes diferentes: sem acento, sem "(a)", minúscula. */
const chaveCargo = (cargo: string) =>
  cargo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\(a\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

const ondeTse = (e: { uf: string; municipio: string | null }) => (e.municipio ? `${nomeProprio(e.municipio)} (${e.uf})` : e.uf);

/** DS_SIT_TOT_TURNO do TSE → desfecho. "2º TURNO" é o 1º turno de quem foi ao 2º: o resultado final não vem aqui. */
export function desfechoTse(resultado: string | null): Desfecho {
  const r = resultado?.trim().toUpperCase() ?? "";
  if (r.startsWith("ELEITO")) return "eleito";
  if (r === "SUPLENTE") return "suplente";
  if (r.startsWith("NÃO ELEITO") || r.startsWith("NAO ELEITO")) return "nao-eleito";
  if (r.includes("TURNO")) return "segundo-turno";
  return "outro";
}

/** Ano de início da legislatura da Câmara (a 57ª começou em 2023; cada uma dura 4 anos). */
export const inicioLegislatura = (n: number) => 2023 + (n - 57) * 4;

/** Um mandato por legislatura em que o deputado aparece no histórico da Câmara. */
export function mandatosCamara(historico: HistoricoDeputadoApi[], anoAtual: number): CargoExercido[] {
  const porLegislatura = new Map<number, HistoricoDeputadoApi[]>();
  for (const h of historico.toSorted((a, b) => a.dataHora.localeCompare(b.dataHora))) {
    porLegislatura.set(h.idLegislatura, [...(porLegislatura.get(h.idLegislatura) ?? []), h]);
  }
  return [...porLegislatura].map(([n, registros]) => {
    const inicio = inicioLegislatura(n);
    const primeiro = registros[0];
    const suplente = registros.every((r) => r.condicaoEleitoral?.trim() === "Suplente");
    return {
      cargo: "Deputado(a) federal",
      local: primeiro.siglaUf?.trim() || "",
      inicio,
      fim: inicio + 4,
      atual: anoAtual >= inicio && anoAtual < inicio + 4,
      partido: primeiro.siglaPartido?.trim() || null,
      fonte: "camara",
      nota: suplente ? "como suplente" : null,
    };
  });
}

/** Mandatos no Senado; suplente que nunca assumiu não exerceu o cargo e fica de fora. */
export function mandatosSenado(mandatos: MandatoSenado[], anoAtual: number): CargoExercido[] {
  return mandatos
    .filter((m) => m.exerceu)
    .map((m) => {
      const inicio = Number(m.inicio.slice(0, 4));
      const fim = Number(m.fim.slice(0, 4));
      return {
        cargo: "Senador(a)",
        local: m.uf,
        inicio,
        fim,
        atual: anoAtual >= inicio && anoAtual < fim,
        partido: null,
        fonte: "senado",
        nota: m.titular ? null : "como suplente",
      };
    });
}

/** Eleições vencidas no TSE viram cargos: o mandato começa no ano seguinte e dura 4 anos (senador, 8). */
function cargosTse(eleicoes: EleicaoTse[], anoAtual: number): CargoExercido[] {
  return eleicoes
    .filter((e) => desfechoTse(e.resultado) === "eleito" && !/SUPLENTE/i.test(e.cargo))
    .map((e) => {
      const inicio = e.ano + 1;
      const fim = inicio + (/^SENADOR/i.test(e.cargo) ? 8 : 4);
      return {
        cargo: nomeCargo(e.cargo),
        local: ondeTse(e),
        inicio,
        fim,
        atual: anoAtual >= inicio && anoAtual < fim,
        partido: e.partido,
        fonte: "tse",
        nota: `eleito em ${e.ano}`,
      };
    });
}

function cargosDeclarados(declarados: MandatoExternoApi[]): CargoExercido[] {
  const vistos = new Set<string>();
  return declarados.flatMap((d) => {
    const inicio = Number(d.anoInicio);
    if (!d.cargo?.trim() || !Number.isInteger(inicio) || inicio <= 0) return [];
    const fim = Number(d.anoFim);
    const local = d.municipio?.trim()
      ? `${nomeProprio(d.municipio.trim())}${d.siglaUf ? ` (${d.siglaUf})` : ""}`
      : (d.siglaUf ?? "");
    // A Câmara às vezes repete o mesmo mandato.
    const chave = `${chaveCargo(d.cargo)}|${local}|${inicio}`;
    if (vistos.has(chave)) return [];
    vistos.add(chave);
    return [
      {
        cargo: nomeCargo(d.cargo),
        local,
        inicio,
        fim: Number.isInteger(fim) && fim > 0 ? fim : null,
        atual: false,
        partido: d.siglaPartidoEleicao?.trim() || null,
        fonte: "declarado" as const,
        nota: "informado pelo deputado",
      },
    ];
  });
}

/** Mesmo cargo começando no mesmo ano (com um de folga: há quem informe o ano da eleição). */
const mesmoMandato = (a: CargoExercido, b: CargoExercido) =>
  chaveCargo(a.cargo) === chaveCargo(b.cargo) && Math.abs(a.inicio - b.inicio) <= 1;

export interface Trajetoria {
  /** Cargos exercidos, do mais recente ao mais antigo. */
  cargos: CargoExercido[];
  /** Eleições disputadas desde 2014 (TSE), da mais recente à mais antiga. */
  eleicoes: EleicaoDisputada[];
}

/**
 * Junta as fontes numa só trajetória. O mandato da Casa vence o do TSE (que só acrescenta "eleito em" e o
 * partido da eleição), e o oficial vence o informado pelo deputado.
 */
export function montarTrajetoria({
  casa = [],
  tse = [],
  declarados = [],
  anoAtual,
}: {
  casa?: CargoExercido[];
  tse?: EleicaoTse[];
  declarados?: MandatoExternoApi[];
  anoAtual: number;
}): Trajetoria {
  const cargos = casa.map((c) => ({ ...c }));
  for (const t of cargosTse(tse, anoAtual)) {
    const daCasa = cargos.find((c) => (c.fonte === "camara" || c.fonte === "senado") && mesmoMandato(c, t));
    if (daCasa) {
      daCasa.nota = [t.nota, daCasa.nota].filter(Boolean).join(", ");
      daCasa.partido ??= t.partido;
    } else cargos.push(t);
  }
  for (const d of cargosDeclarados(declarados)) {
    if (!cargos.some((c) => mesmoMandato(c, d))) cargos.push(d);
  }

  return {
    cargos: cargos.sort((a, b) => b.inicio - a.inicio || Number(b.atual) - Number(a.atual)),
    eleicoes: tse
      .map((e) => ({
        ano: e.ano,
        cargo: nomeCargo(e.cargo),
        local: ondeTse(e),
        partido: e.partido,
        resultado: e.resultado ? nomeCargo(e.resultado) : null,
        desfecho: desfechoTse(e.resultado),
      }))
      .sort((a, b) => b.ano - a.ano),
  };
}

const lista = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;

const periodo = (c: CargoExercido) => (c.fim === null ? `desde ${c.inicio}` : `${c.inicio}–${c.fim}`);

/**
 * Frases em linguagem simples: quantos mandatos tem na Casa, o que fez antes e como foi nas urnas.
 * `casaAtual` é "camara" ou "senado"; `nome` entra só na primeira frase.
 */
export function resumirTrajetoria({ cargos, eleicoes }: Trajetoria, casaAtual: "camara" | "senado"): string[] {
  const frases: string[] = [];
  const naCasa = cargos.filter((c) => c.fonte === casaAtual);
  const nomeCasa = casaAtual === "camara" ? "na Câmara" : "no Senado";
  if (naCasa.length > 1) frases.push(`Está no ${naCasa.length}º mandato ${nomeCasa}.`);
  else if (naCasa.length === 1) frases.push(`É o primeiro mandato ${nomeCasa}.`);

  const outros = cargos.filter((c) => c.fonte !== casaAtual && !c.atual);
  if (outros.length > 0) {
    const descricoes = outros
      .toSorted((a, b) => a.inicio - b.inicio)
      .map((c) => `${c.cargo.toLowerCase()} ${c.local.includes("(") ? "em " : "por "}${c.local} (${periodo(c)})`);
    frases.push(`Antes ou fora da ${casaAtual === "camara" ? "Câmara" : "Casa"}, exerceu: ${lista(descricoes)}.`);
  }

  if (eleicoes.length > 0) {
    const vencidas = eleicoes.filter((e) => e.desfecho === "eleito").length;
    const desde = Math.min(...eleicoes.map((e) => e.ano));
    frases.push(
      `Desde ${desde}, disputou ${eleicoes.length === 1 ? "1 eleição" : `${eleicoes.length} eleições`} e ` +
        `${vencidas === 0 ? "não venceu nenhuma" : vencidas === eleicoes.length ? `venceu ${vencidas === 1 ? "ela" : "todas"}` : `venceu ${vencidas}`}.`,
    );
  }
  return frases;
}
