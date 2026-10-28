// Máscaras de digitação: formatam o que a pessoa vê enquanto digita.
// O valor enviado à API é sempre o normalizado pelos schemas de `./schemas` (ex.: só dígitos).

export const soDigitos = (valor: string) => valor.replace(/\D/g, "");

function aplicar(digitos: string, partes: number[], separadores: string[]) {
  let saida = "";
  let i = 0;
  partes.forEach((tamanho, p) => {
    const pedaco = digitos.slice(i, i + tamanho);
    if (!pedaco) return;
    if (p > 0) saida += separadores[p - 1];
    saida += pedaco;
    i += tamanho;
  });
  return saida;
}

/** "12345678000190" → "12.345.678/0001-90", aceitando valores parciais. */
export const mascaraCnpj = (valor: string) =>
  aplicar(soDigitos(valor).slice(0, 14), [2, 3, 3, 4, 2], [".", ".", "/", "-"]);

/** "12345678901" → "123.456.789-01", aceitando valores parciais. */
export const mascaraCpf = (valor: string) => aplicar(soDigitos(valor).slice(0, 11), [3, 3, 3, 2], [".", ".", "-"]);

/** CPF até 11 dígitos, CNPJ a partir do 12º (campos que aceitam os dois, como fornecedor). */
export const mascaraCpfCnpj = (valor: string) =>
  soDigitos(valor).length <= 11 ? mascaraCpf(valor) : mascaraCnpj(valor);

/**
 * Nome no formato dos dados oficiais enquanto a pessoa digita: maiúsculas, sem acento e sem
 * pontuação ("Acácio D'Ávila" → "ACACIO D AVILA"). Mantém um espaço no fim para dar para
 * continuar digitando; quem remove é o `normalizarNome` do schema, no envio.
 */
export const mascaraNome = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trimStart()
    .toUpperCase()
    .slice(0, 80);

/** Ano com no máximo 4 dígitos. */
export const mascaraAno = (valor: string) => soDigitos(valor).slice(0, 4);

function digitoVerificador(digitos: string, pesos: number[]) {
  const resto = pesos.reduce((soma, peso, i) => soma + Number(digitos[i]) * peso, 0) % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjValido(valor: string) {
  const d = soDigitos(valor);
  if (!/^\d{14}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return (
    digitoVerificador(d, pesos.slice(1)) === Number(d[12]) && digitoVerificador(d, pesos) === Number(d[13])
  );
}

export function cpfValido(valor: string) {
  const d = soDigitos(valor);
  if (!/^\d{11}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const pesos = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv = (n: 9 | 10) => {
    const resto = (pesos.slice(10 - n).reduce((s, p, i) => s + Number(d[i]) * p, 0) * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
