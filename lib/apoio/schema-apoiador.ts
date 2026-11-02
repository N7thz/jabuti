import { z } from "zod";

// Usado no navegador (validação antes de enviar) e na Server Action, que valida de novo.

/** Nome no mural: como a pessoa quer aparecer, sem links nem quebras de linha. */
export const apoiadorSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Escreva pelo menos 2 letras.")
    .max(60, "Use até 60 caracteres.")
    .refine((n) => !/https?:|www\.|[<>\n\r]/i.test(n), "Escreva só o nome, sem links."),
  autorizado: z.literal("sim", { error: "Confirme que a pessoa autorizou mostrar o nome." }),
});

export type ApoiadorForm = z.input<typeof apoiadorSchema>;
