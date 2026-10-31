import { ACENTO, cartao, TAMANHO, TIPO } from "@/components/og/cartao";

export const alt = "Jabuti: acompanhe e cobre os políticos com dados públicos oficiais";
export const size = TAMANHO;
export const contentType = TIPO;

export default function Imagem() {
  return cartao({
    acento: ACENTO.portal,
    titulo: "Acompanhe e cobre quem você elegeu",
    legenda: "Emendas, gastos de gabinete, presença, campanhas e as contas de estados e cidades.",
    fonte: "Dados públicos oficiais",
  });
}
