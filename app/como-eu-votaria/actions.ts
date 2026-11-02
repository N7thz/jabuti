"use server";

import { calcular, respostasDoFormulario, type Respostas, type Resultado } from "@/lib/como-eu-votaria/calculo";
import { getMatriz } from "@/lib/como-eu-votaria/queries";

export type EstadoVotaria = { casa: "camara" | "senado"; respostas: Respostas; resultado: Resultado } | null;

/**
 * Caminho sem JavaScript: calcula o resultado na hora e devolve na própria página. As respostas são
 * opinião política (dado sensível pela LGPD): não vão para o banco, para log nem para a URL.
 * Com JavaScript a conta é feita no navegador e esta função nem é chamada.
 */
export async function calcularVotaria(_anterior: EstadoVotaria, dados: FormData): Promise<EstadoVotaria> {
  const casa = dados.get("casa") === "senado" ? "senado" : "camara";
  const matriz = await getMatriz(casa);
  const respostas = respostasDoFormulario(dados, matriz.votacoes);
  return { casa, respostas, resultado: calcular(respostas, matriz) };
}
