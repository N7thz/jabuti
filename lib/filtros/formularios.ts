import { createSerializer, parseAsInteger, parseAsString } from "nuqs/server";
import { z } from "zod";

import { cnpj } from "./schemas";

// Schemas de cada formulário, fora dos arquivos "use client" para o servidor também importar
// (export de um módulo de cliente vira referência de cliente no servidor, não o valor).

export const buscaCnpjSchema = z.object({ cnpj });
export const linkBuscaCnpj = createSerializer({ cnpj: parseAsString });

/** `?ano=` das páginas de emendas por estado e por cidade. */
export const linkAno = createSerializer({ ano: parseAsInteger });
