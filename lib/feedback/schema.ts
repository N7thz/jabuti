import { z } from "zod";

/** Assunto da mensagem: [valor enviado, texto mostrado no formulário e no email]. */
export const ASSUNTOS = {
  sugestao: "Sugestão de melhoria",
  problema: "Algo não funciona",
  dado: "Dado errado ou faltando",
  outro: "Outro assunto",
} as const;

export type Assunto = keyof typeof ASSUNTOS;

const MB = 1024 * 1024;

/** Limites dos anexos. O corpo da Server Action (next.config.ts) aceita um pouco mais que o total, pela codificação do envio. */
export const LIMITE_ANEXOS = { quantidade: 5, porArquivo: 4 * MB, total: 10 * MB } as const;

/** Tipos aceitos: [tipo do arquivo, nome mostrado a quem envia]. */
export const TIPOS_ANEXO = {
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "application/pdf": "PDF",
  "text/plain": "TXT",
} as const;

/** Tamanho em MB com vírgula, como "2,4 MB". */
export const emMB = (bytes: number) =>
  `${(bytes / MB).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: bytes < MB ? 1 : 0 })} MB`;

/**
 * Normaliza o que chega do input: FileList no navegador, lista de File na Server Action. Sem arquivo
 * escolhido, o FormData ainda manda um File vazio e sem nome, que é descartado aqui.
 */
function paraArquivos(valor: unknown): unknown {
  if (valor == null) return [];
  const lista = typeof FileList !== "undefined" && valor instanceof FileList ? Array.from(valor) : valor;
  return Array.isArray(lista) ? lista.filter((item) => !(item instanceof File && item.size === 0 && !item.name)) : lista;
}

const anexosSchema = z.preprocess(
  paraArquivos,
  z.array(z.file()).superRefine((arquivos, ctx) => {
    if (arquivos.length > LIMITE_ANEXOS.quantidade) {
      ctx.addIssue({ code: "custom", message: `Envie no máximo ${LIMITE_ANEXOS.quantidade} arquivos.` });
      return;
    }
    for (const arquivo of arquivos) {
      if (!(arquivo.type in TIPOS_ANEXO)) {
        const tipos = Object.values(TIPOS_ANEXO).join(", ");
        ctx.addIssue({ code: "custom", message: `"${arquivo.name}" não é de um tipo aceito. Use ${tipos}.` });
      } else if (arquivo.size > LIMITE_ANEXOS.porArquivo) {
        ctx.addIssue({
          code: "custom",
          message: `"${arquivo.name}" tem ${emMB(arquivo.size)}; o limite é ${emMB(LIMITE_ANEXOS.porArquivo)} por arquivo.`,
        });
      }
    }
    const total = arquivos.reduce((soma, arquivo) => soma + arquivo.size, 0);
    if (total > LIMITE_ANEXOS.total) {
      ctx.addIssue({ code: "custom", message: `Os anexos somam ${emMB(total)}; o limite é ${emMB(LIMITE_ANEXOS.total)} no total.` });
    }
  }),
);

/**
 * Mensagem de feedback. O mesmo schema valida no navegador (react-hook-form) e na Server Action,
 * então o formulário enviado sem JavaScript recebe os mesmos erros.
 */
export const feedbackSchema = z.object({
  assunto: z.enum(Object.keys(ASSUNTOS) as [Assunto, ...Assunto[]], { error: "Escolha o assunto." }),
  nome: z.string().trim().max(100, "Use no máximo 100 caracteres."),
  email: z
    .string()
    .trim()
    .min(1, "Informe seu email para podermos responder.")
    .max(200, "Use no máximo 200 caracteres.")
    .pipe(z.email("Confira o email: ele precisa ter o formato nome@exemplo.com.")),
  mensagem: z
    .string()
    .trim()
    .min(10, "Escreva pelo menos 10 caracteres.")
    .max(5000, "Use no máximo 5.000 caracteres."),
  /** Página de onde a pessoa veio, para saber do que ela está falando. */
  pagina: z.string().trim().max(300),
  /** Prints ou documentos que ajudam a entender a mensagem (opcional). */
  anexos: anexosSchema,
});

export type FeedbackEntrada = z.input<typeof feedbackSchema>;
export type Feedback = z.output<typeof feedbackSchema>;
export type CampoFeedback = keyof FeedbackEntrada;

export const CAMPOS_FEEDBACK = Object.keys(feedbackSchema.shape) as CampoFeedback[];

/** Campos de texto: os que voltam preenchidos quando a página recarrega (input de arquivo não aceita valor inicial). */
export const CAMPOS_TEXTO = CAMPOS_FEEDBACK.filter((campo) => campo !== "anexos") as Exclude<CampoFeedback, "anexos">[];
export type CampoDeTexto = (typeof CAMPOS_TEXTO)[number];
