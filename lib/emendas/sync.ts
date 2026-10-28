import { createHash } from "node:crypto";

import type { Prisma } from "../generated/prisma/client";
import type { PrismaClient } from "../prisma";
import { createFetcher, normalizarNome } from "../sync/run";
import type { components } from "../transparencia/schema";
import { criarIndiceMunicipios, interpretarLocalidade, type IndiceMunicipios } from "./localidade";

export type EmendaDTO = components["schemas"]["ConsultaEmendasDTO"];
export type EmendaRegistro = Prisma.EmendaCreateManyInput;

const BASE_URL = "https://api.portaldatransparencia.gov.br";
const TAMANHO_LOTE = 500;

const CAMPOS_VALOR = [
  "valorEmpenhado",
  "valorLiquidado",
  "valorPago",
  "valorRestoInscrito",
  "valorRestoCancelado",
  "valorRestoPago",
] as const;

/** Hora atual em Brasília: o limite do Portal é 90 req/min das 06h às 23h59 e 300 req/min no resto. */
function horarioComercial(agora = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(agora),
  );
  return hora >= 6;
}

/** `fetch` do Portal com a chave no header e intervalo conforme o horário (≈85 ou ≈240 req/min). */
export function createPortalFetcher() {
  const chave = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  if (!chave) throw new Error("PORTAL_TRANSPARENCIA_API_KEY não definida no .env.local.");

  // retries 6: backoff de até ~1 min, o suficiente para a janela do 429 do Portal virar.
  const headers = { "chave-api-dados": chave };
  const diurno = createFetcher({ minIntervalMs: 700, retries: 6, headers });
  const noturno = createFetcher({ minIntervalMs: 250, retries: 6, headers });

  return <T>(url: string | URL) => (horarioComercial() ? diurno<T>(url) : noturno<T>(url));
}

/** "1.234,56" → centavos (bigint), para somar sem erro de ponto flutuante. */
export function valorEmCentavos(valor: string | null | undefined): bigint {
  const texto = valor?.trim();
  if (!texto) return BigInt(0);

  const match = /^(-?)([\d.]+)(?:,(\d{1,2}))?$/.exec(texto);
  if (!match) throw new Error(`Valor monetário em formato inesperado: "${valor}"`);

  const centavos = BigInt(match[2].replace(/\./g, "") + (match[3] ?? "").padEnd(2, "0"));
  return match[1] ? -centavos : centavos;
}

/** Centavos → string decimal aceita pelo Prisma ("123456" → "1234.56"). */
export function centavosParaDecimal(centavos: bigint) {
  const negativo = centavos < BigInt(0);
  const abs = (negativo ? -centavos : centavos).toString().padStart(3, "0");
  return `${negativo ? "-" : ""}${abs.slice(0, -2)}.${abs.slice(-2)}`;
}

/** "1.234,56" → "1234.56". */
export function converterValor(valor: string | null | undefined) {
  return centavosParaDecimal(valorEmCentavos(valor));
}

/**
 * Chave de `Emenda.codigo`. O `codigoEmenda` do Portal NÃO é único: a API devolve uma linha por
 * emenda × localidade × função × subfunção, e emendas de relator antigas vêm todas como
 * "REL. GERAL" ou "S/I". Por isso a chave é "ano|codigoEmenda|hash(localidade, função, subfunção)";
 * o código original fica em `Emenda.codigoEmenda`.
 */
export function chaveEmenda(dto: EmendaDTO, ano: number) {
  const detalhe = [dto.localidadeDoGasto, dto.funcao, dto.subfuncao].map((v) => v?.trim() ?? "").join("|");
  const hash = createHash("sha1").update(detalhe).digest("hex").slice(0, 12);
  return `${ano}|${dto.codigoEmenda?.trim() || "S/I"}|${hash}`;
}

/** Pagina `/api-de-dados/emendas?ano=X` até vir uma página vazia (15 itens por página). */
export async function buscarEmendasAno(
  ano: number,
  {
    maxPaginas = Infinity,
    fetchJson = createPortalFetcher(),
    onPagina,
  }: {
    maxPaginas?: number;
    fetchJson?: <T>(url: string | URL) => Promise<T>;
    onPagina?: (pagina: number, total: number) => void;
  } = {},
) {
  const emendas: EmendaDTO[] = [];
  let completo = false;

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const url = new URL("/api-de-dados/emendas", BASE_URL);
    url.searchParams.set("ano", String(ano));
    url.searchParams.set("pagina", String(pagina));

    const lote = await fetchJson<EmendaDTO[]>(url);
    if (lote.length === 0) {
      completo = true;
      break;
    }
    emendas.push(...lote);
    onPagina?.(pagina, emendas.length);
  }

  return { emendas, completo };
}

/**
 * Converte as linhas da API em registros de `Emenda`, interpretando a localidade.
 * Linhas repetidas idênticas (paginação instável) são descartadas; linhas distintas com a mesma
 * chave (só acontece com "REL. GERAL"/"S/I") têm os valores somados.
 */
export function converterEmendas(dtos: EmendaDTO[], ano: number, indice: IndiceMunicipios) {
  const porChave = new Map<string, { registro: EmendaRegistro; centavos: bigint[]; vistos: Set<string> }>();

  for (const dto of dtos) {
    const codigo = chaveEmenda(dto, ano);
    const assinatura = JSON.stringify(dto);
    const centavos = CAMPOS_VALOR.map((campo) => valorEmCentavos(dto[campo]));
    const existente = porChave.get(codigo);

    if (existente) {
      if (existente.vistos.has(assinatura)) continue;
      existente.vistos.add(assinatura);
      existente.centavos = existente.centavos.map((v, i) => v + centavos[i]);
      continue;
    }

    const localidade = interpretarLocalidade(dto.localidadeDoGasto, indice);
    porChave.set(codigo, {
      vistos: new Set([assinatura]),
      centavos,
      registro: {
        codigo,
        codigoEmenda: dto.codigoEmenda?.trim() || "S/I",
        ano,
        tipo: dto.tipoEmenda?.trim() || "Não informado",
        numero: dto.numeroEmenda?.trim() || null,
        autorNome: (dto.nomeAutor ?? dto.autor ?? "").trim() || "NÃO INFORMADO",
        localidadeOriginal: dto.localidadeDoGasto?.trim() || null,
        ...localidade,
        funcao: dto.funcao?.trim() || null,
        subfuncao: dto.subfuncao?.trim() || null,
        valorEmpenhado: "0",
        valorLiquidado: "0",
        valorPago: "0",
        valorRestoInscrito: "0",
        valorRestoCancelado: "0",
        valorRestoPago: "0",
      },
    });
  }

  return [...porChave.values()].map(({ registro, centavos }) => {
    CAMPOS_VALOR.forEach((campo, i) => (registro[campo] = centavosParaDecimal(centavos[i])));
    return registro;
  });
}

/** Índice de municípios a partir do banco (rode antes `bun scripts/sync-municipios.ts`). */
export async function carregarIndiceMunicipios(prisma: PrismaClient) {
  const municipios = await prisma.municipio.findMany({ select: { ibge: true, nomeBusca: true, uf: true } });
  if (municipios.length === 0) {
    throw new Error("Tabela Municipio vazia: rode `bun scripts/sync-municipios.ts` antes.");
  }
  return criarIndiceMunicipios(municipios);
}

/**
 * Upsert por `codigo` em lotes: cria os novos com createMany e atualiza os existentes.
 * Com a busca completa, remove linhas do ano que sumiram da API (ex.: localidade corrigida).
 */
export async function gravarEmendas(
  prisma: PrismaClient,
  ano: number,
  registros: EmendaRegistro[],
  { completo }: { completo: boolean },
) {
  for (let i = 0; i < registros.length; i += TAMANHO_LOTE) {
    const lote = registros.slice(i, i + TAMANHO_LOTE);
    const existentes = new Set(
      (
        await prisma.emenda.findMany({
          where: { codigo: { in: lote.map((r) => r.codigo) } },
          select: { codigo: true },
        })
      ).map((e) => e.codigo),
    );

    const novos = lote.filter((r) => !existentes.has(r.codigo));
    if (novos.length) await prisma.emenda.createMany({ data: novos, skipDuplicates: true });

    // parlamentarId fica de fora do update para não desfazer o vínculo feito por vincularAutores().
    const atualizacoes = lote
      .filter((r) => existentes.has(r.codigo))
      .map(({ codigo, ...dados }) => prisma.emenda.update({ where: { codigo }, data: dados }));
    if (atualizacoes.length) await prisma.$transaction(atualizacoes);
  }

  if (completo) {
    const vigentes = new Set(registros.map((r) => r.codigo));
    const doAno = await prisma.emenda.findMany({ where: { ano }, select: { codigo: true } });
    const removidos = doAno.map((e) => e.codigo).filter((codigo) => !vigentes.has(codigo));
    for (let i = 0; i < removidos.length; i += TAMANHO_LOTE) {
      await prisma.emenda.deleteMany({ where: { codigo: { in: removidos.slice(i, i + TAMANHO_LOTE) } } });
    }
  }

  return registros.length;
}

/** Busca, interpreta e grava as emendas de um ano. Devolve quantos registros gravou. */
export async function sincronizarEmendasAno(
  prisma: PrismaClient,
  ano: number,
  opcoes: { maxPaginas?: number; indice?: IndiceMunicipios; onPagina?: (pagina: number, total: number) => void } = {},
) {
  const indice = opcoes.indice ?? (await carregarIndiceMunicipios(prisma));
  const { emendas, completo } = await buscarEmendasAno(ano, opcoes);
  return gravarEmendas(prisma, ano, converterEmendas(emendas, ano, indice), { completo });
}

/** Autores coletivos nunca casam com um parlamentar. */
const AUTOR_COLETIVO = /^(BANCADA|COMISS|RELATOR|REL\b|SEM INFORMA)/;

/**
 * Liga `Emenda.parlamentarId` casando `normalizarNome(autorNome)` com `Parlamentar.nomeBusca`.
 * Só match exato e único: nome com mais de um parlamentar candidato fica sem vínculo.
 */
export async function vincularAutores(prisma: PrismaClient) {
  const candidatos = new Map<string, string[]>();
  for (const p of await prisma.parlamentar.findMany({ select: { id: true, nomeBusca: true } })) {
    candidatos.set(p.nomeBusca, [...(candidatos.get(p.nomeBusca) ?? []), p.id]);
  }

  const autores = await prisma.emenda.groupBy({ by: ["autorNome"] });
  let vinculadas = 0;

  for (const { autorNome } of autores) {
    const nomeBusca = normalizarNome(autorNome);
    const ids = AUTOR_COLETIVO.test(nomeBusca) ? [] : (candidatos.get(nomeBusca) ?? []);
    const parlamentarId = ids.length === 1 ? ids[0] : null;

    const { count } = await prisma.emenda.updateMany({
      // Só toca o que muda; o OR inclui os nulos, que `not` sozinho deixaria de fora.
      where: parlamentarId
        ? { autorNome, OR: [{ parlamentarId: null }, { parlamentarId: { not: parlamentarId } }] }
        : { autorNome, parlamentarId: { not: null } },
      data: { parlamentarId },
    });
    if (parlamentarId) vinculadas += count;
  }

  return vinculadas;
}
