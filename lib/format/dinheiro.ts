import { add, BRL, dinero, toDecimal, toSnapshot, type Dinero } from "dinero.js";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Aceita o valor em reais como vem da API (number) ou do Prisma (Decimal/string).
export function reais(valor: number | string | { toString(): string }): Dinero<number> {
  return dinero({ amount: Math.round(Number(valor.toString()) * 100), currency: BRL });
}

/** Valor no formato brasileiro, como o Portal da Transparência devolve ("1.234,56"). */
export function reaisDoTexto(texto?: string | null) {
  return reais(texto ? texto.replace(/\./g, "").replace(",", ".") : 0);
}

/** Dinero não é serializável; para guardar em cache ("use cache") trafegue os centavos. */
export const centavos = (valor: Dinero<number>) => toSnapshot(valor).amount;
export const deCentavos = (amount: number) => dinero({ amount, currency: BRL });

export function somar(valores: Dinero<number>[]) {
  return valores.reduce((total, valor) => add(total, valor), reais(0));
}

export function formatarReais(valor: Dinero<number>) {
  return toDecimal(valor, ({ value }) => brl.format(Number(value)));
}
