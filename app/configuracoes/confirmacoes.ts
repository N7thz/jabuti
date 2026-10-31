import { LogOutIcon, Trash2Icon } from "lucide-react";

import { excluirConta, sairDaConta } from "./actions";

export type AcaoConta = "sair" | "excluir";

/**
 * Textos e ação de cada confirmação da seção Conta. Servem ao diálogo (com JavaScript) e ao painel que a
 * página mostra com `?confirmar=` (sem JavaScript), para os dois dizerem exatamente a mesma coisa.
 */
export const CONFIRMACOES = {
  sair: {
    rotulo: "Sair da conta",
    titulo: "Sair da conta?",
    descricao:
      "Você sai só neste navegador. Seus atalhos fixados continuam guardados e voltam quando você entrar de novo.",
    confirmar: "Sair",
    variante: "outline",
    Icone: LogOutIcon,
    acao: sairDaConta,
  },
  excluir: {
    rotulo: "Excluir conta",
    titulo: "Excluir sua conta no Jabuti?",
    descricao:
      "Apagamos sua conta, sua senha e todos os seus atalhos fixados, e você sai. Não dá para desfazer: se voltar, começa do zero. Se você entrava pelo Google, a conta Google continua existindo.",
    confirmar: "Excluir minha conta",
    variante: "destructive",
    Icone: Trash2Icon,
    acao: excluirConta,
  },
} as const satisfies Record<AcaoConta, unknown>;

export const lerAcaoConta = (valor: unknown): AcaoConta | null =>
  valor === "sair" || valor === "excluir" ? valor : null;
