import { z } from "zod";

import { PREFERENCIAS_LEITURA } from "@/lib/acessibilidade";
import { ASSUNTOS_OPCIONAIS, type AssuntoOpcional } from "@/lib/menu";

const IDS_MENU = ASSUNTOS_OPCIONAIS.map((a) => a.id) as [AssuntoOpcional, ...AssuntoOpcional[]];

// Preferências do site que acompanham a conta: quem está logado vê o mesmo menu, tamanho de texto,
// tema e animações em todos os aparelhos. Sem login, continuam só no aparelho (localStorage).

export const preferenciasSchema = z.object({
  menu: z.array(z.enum(IDS_MENU)).max(ASSUNTOS_OPCIONAIS.length),
  texto: z.enum(PREFERENCIAS_LEITURA.texto.opcoes),
  espacamento: z.enum(PREFERENCIAS_LEITURA.espacamento.opcoes),
  tema: z.enum(["light", "dark", "system"]),
  animacoes: z.enum(["sistema", "ligadas", "desligadas"]),
});

export type Preferencias = z.infer<typeof preferenciasSchema>;

/** Texto estável para comparar duas leituras (a ordem do menu não importa). */
export const assinatura = (p: Preferencias) => JSON.stringify({ ...p, menu: [...p.menu].sort() });

/** Preferências guardadas na conta, ou null se não houver ou vierem num formato antigo. */
export function lerPreferenciasDaConta(valor: unknown): Preferencias | null {
  const r = preferenciasSchema.safeParse(valor);
  return r.success ? r.data : null;
}
