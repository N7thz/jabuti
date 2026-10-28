import { Readable } from "node:stream";
import { createInflateRaw } from "node:zlib";

/**
 * Leitura de ZIPs remotos por `Range`: os arquivos do TSE chegam a 500 MB, mas cada um traz um CSV
 * por UF. Lê só o diretório central e depois baixa, descompactando em streaming, a entrada pedida.
 */
export interface EntradaZip {
  nome: string;
  metodo: number;
  tamanhoCompactado: number;
  tamanho: number;
  offsetCabecalho: number;
}

const ASSINATURA_EOCD = 0x06054b50;
const ASSINATURA_EOCD64 = 0x06064b50;
const ASSINATURA_LOCATOR64 = 0x07064b50;
const ASSINATURA_CENTRAL = 0x02014b50;
const ASSINATURA_LOCAL = 0x04034b50;
const MAX_U32 = 0xffffffff;

const bigNum = (v: bigint) => Number(v);

async function lerFaixa(url: string, inicio: number, fim: number) {
  const response = await fetch(url, {
    headers: { Range: `bytes=${inicio}-${fim}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (response.status !== 206) throw new Error(`${response.status} ao pedir faixa ${inicio}-${fim} de ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function tamanhoRemoto(url: string) {
  const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(30_000) });
  const tamanho = Number(response.headers.get("Content-Length"));
  if (!response.ok || !tamanho) throw new Error(`${response.status} sem Content-Length em ${url}`);
  return tamanho;
}

/** Interpreta o diretório central; aceita ZIP64 (campo extra 0x0001) para entradas acima de 4 GB. */
export function lerDiretorioCentral(buffer: Buffer, quantidade: number): EntradaZip[] {
  const entradas: EntradaZip[] = [];
  let pos = 0;
  for (let i = 0; i < quantidade; i++) {
    if (buffer.readUInt32LE(pos) !== ASSINATURA_CENTRAL) throw new Error("Diretório central do ZIP inválido.");
    const metodo = buffer.readUInt16LE(pos + 10);
    let tamanhoCompactado = buffer.readUInt32LE(pos + 20);
    let tamanho = buffer.readUInt32LE(pos + 24);
    const tamNome = buffer.readUInt16LE(pos + 28);
    const tamExtra = buffer.readUInt16LE(pos + 30);
    const tamComentario = buffer.readUInt16LE(pos + 32);
    let offsetCabecalho = buffer.readUInt32LE(pos + 42);
    const nome = buffer.toString("latin1", pos + 46, pos + 46 + tamNome);

    // ZIP64: os campos estourados vêm em ordem fixa no extra 0x0001.
    let extra = pos + 46 + tamNome;
    const fimExtra = extra + tamExtra;
    while (extra + 4 <= fimExtra) {
      const id = buffer.readUInt16LE(extra);
      const tam = buffer.readUInt16LE(extra + 2);
      if (id === 0x0001) {
        let campo = extra + 4;
        if (tamanho === MAX_U32) {
          tamanho = bigNum(buffer.readBigUInt64LE(campo));
          campo += 8;
        }
        if (tamanhoCompactado === MAX_U32) {
          tamanhoCompactado = bigNum(buffer.readBigUInt64LE(campo));
          campo += 8;
        }
        if (offsetCabecalho === MAX_U32) offsetCabecalho = bigNum(buffer.readBigUInt64LE(campo));
      }
      extra += 4 + tam;
    }

    entradas.push({ nome, metodo, tamanhoCompactado, tamanho, offsetCabecalho });
    pos = fimExtra + tamComentario;
  }
  return entradas;
}

/** Lista as entradas de um ZIP remoto baixando só o final do arquivo. */
export async function listarZip(url: string) {
  const tamanho = await tamanhoRemoto(url);
  // EOCD (22 bytes) + comentário de até 64 KB + locator ZIP64.
  const inicioCauda = Math.max(0, tamanho - 66_000);
  const cauda = await lerFaixa(url, inicioCauda, tamanho - 1);

  let eocd = -1;
  for (let i = cauda.length - 22; i >= 0; i--) {
    if (cauda.readUInt32LE(i) === ASSINATURA_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`Fim do diretório central não encontrado em ${url}`);

  let quantidade = cauda.readUInt16LE(eocd + 10);
  let tamDiretorio = cauda.readUInt32LE(eocd + 12);
  let offsetDiretorio = cauda.readUInt32LE(eocd + 16);

  const locator = eocd - 20;
  if (locator >= 0 && cauda.readUInt32LE(locator) === ASSINATURA_LOCATOR64) {
    const offsetEocd64 = bigNum(cauda.readBigUInt64LE(locator + 8));
    const eocd64 = await lerFaixa(url, offsetEocd64, offsetEocd64 + 55);
    if (eocd64.readUInt32LE(0) !== ASSINATURA_EOCD64) throw new Error(`EOCD ZIP64 inválido em ${url}`);
    quantidade = bigNum(eocd64.readBigUInt64LE(32));
    tamDiretorio = bigNum(eocd64.readBigUInt64LE(40));
    offsetDiretorio = bigNum(eocd64.readBigUInt64LE(48));
  }

  const diretorio =
    offsetDiretorio >= inicioCauda
      ? cauda.subarray(offsetDiretorio - inicioCauda, offsetDiretorio - inicioCauda + tamDiretorio)
      : await lerFaixa(url, offsetDiretorio, offsetDiretorio + tamDiretorio - 1);
  return lerDiretorioCentral(diretorio, quantidade);
}

/** Bytes descompactados de uma entrada, em streaming (sem guardar o arquivo inteiro na memória). */
export async function abrirEntrada(url: string, entrada: EntradaZip): Promise<Readable> {
  const cabecalho = await lerFaixa(url, entrada.offsetCabecalho, entrada.offsetCabecalho + 29);
  if (cabecalho.readUInt32LE(0) !== ASSINATURA_LOCAL) throw new Error(`Cabeçalho local inválido: ${entrada.nome}`);
  const inicio = entrada.offsetCabecalho + 30 + cabecalho.readUInt16LE(26) + cabecalho.readUInt16LE(28);

  const response = await fetch(url, {
    headers: { Range: `bytes=${inicio}-${inicio + entrada.tamanhoCompactado - 1}` },
  });
  if (response.status !== 206 || !response.body) throw new Error(`${response.status} ao baixar ${entrada.nome}`);

  // O tipo do ReadableStream do fetch e o de node:stream/web divergem só nas declarações.
  const bruto = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
  if (entrada.metodo === 0) return bruto;
  if (entrada.metodo !== 8) throw new Error(`Método de compressão ${entrada.metodo} não suportado: ${entrada.nome}`);
  return bruto.pipe(createInflateRaw());
}
