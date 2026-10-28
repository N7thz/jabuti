/**
 * CSV do TSE: separador `;`, campos entre aspas (aspas internas dobradas), latin1, primeira linha
 * com os nomes das colunas. Lê em streaming e entrega cada linha já como objeto coluna → valor.
 */
export type LinhaTse = Record<string, string>;

/** Valores que o TSE usa para "sem informação". */
const NULOS = new Set(["#NULO", "#NULO#", "#NE", "NÃO DIVULGÁVEL", "-1", "-3", "-4"]);

export const vazio = (valor: string | undefined) => valor === undefined || valor === "" || NULOS.has(valor);

/** "1234,56" → 1234.56 */
export const numeroTse = (valor: string | undefined) => (vazio(valor) ? 0 : Number(valor!.replace(",", ".")));

/** Divide o texto em registros e campos, guardando o que sobrou incompleto para o próximo pedaço. */
export function criarLeitorCsv(separador = ";") {
  let campo = "";
  let campos: string[] = [];
  let entreAspas = false;
  // Aspa vista no fim de um pedaço: só o próximo caractere diz se é escape ("") ou fechamento.
  let aspaPendente = false;

  function* ler(texto: string): Generator<string[]> {
    let inicio = 0;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (aspaPendente) {
        aspaPendente = false;
        if (c === '"') {
          campo += '"';
          inicio = i + 1;
          continue;
        }
        entreAspas = false;
      }
      if (entreAspas) {
        if (c !== '"') continue;
        campo += texto.slice(inicio, i);
        if (i + 1 === texto.length) {
          aspaPendente = true;
          inicio = i + 1;
        } else if (texto[i + 1] === '"') {
          campo += '"';
          i++;
          inicio = i + 1;
        } else {
          entreAspas = false;
          inicio = i + 1;
        }
        continue;
      }
      if (c === '"') {
        campo += texto.slice(inicio, i);
        entreAspas = true;
        inicio = i + 1;
      } else if (c === separador) {
        campos.push(campo + texto.slice(inicio, i));
        campo = "";
        inicio = i + 1;
      } else if (c === "\n" || c === "\r") {
        const fim = campo + texto.slice(inicio, i);
        if (campos.length > 0 || fim !== "") {
          campos.push(fim);
          yield campos;
        }
        campos = [];
        campo = "";
        inicio = i + 1;
      }
    }
    campo += texto.slice(inicio);
  }

  function* finalizar(): Generator<string[]> {
    if (campos.length > 0 || campo !== "") {
      campos.push(campo);
      yield campos;
    }
    campos = [];
    campo = "";
  }

  return { ler, finalizar };
}

/** Linhas de um CSV do TSE vindo de um stream de bytes em latin1. */
export async function* linhasCsv(bytes: AsyncIterable<Uint8Array | string>): AsyncGenerator<LinhaTse> {
  const decoder = new TextDecoder("latin1");
  const leitor = criarLeitorCsv();
  let cabecalho: string[] | undefined;

  const montar = (campos: string[]) => {
    const linha: LinhaTse = {};
    for (let i = 0; i < cabecalho!.length; i++) linha[cabecalho![i]] = campos[i] ?? "";
    return linha;
  };

  for await (const pedaco of bytes) {
    const texto = typeof pedaco === "string" ? pedaco : decoder.decode(pedaco, { stream: true });
    for (const campos of leitor.ler(texto)) {
      if (cabecalho) yield montar(campos);
      else cabecalho = campos;
    }
  }
  for (const campos of leitor.finalizar()) {
    if (cabecalho) yield montar(campos);
  }
}
