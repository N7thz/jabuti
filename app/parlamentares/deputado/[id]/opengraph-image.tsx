import { ACENTO, cartao, fotoComoDataUri, ouNulo, porcentagem, TAMANHO } from "@/components/og/cartao";
import { getDeputado, getPresencaDeputado } from "@/lib/parlamentares/queries";

export const alt = "Cartão do deputado no Jabuti, com a presença no plenário no ano";
export const size = TAMANHO;
export const contentType = "image/png";

export default async function Imagem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deputado = await ouNulo(getDeputado(id));
  if (!deputado) return cartao({ secao: "Parlamentares", acento: ACENTO.parlamentares, titulo: "Deputado(a) federal" });

  const s = deputado.ultimoStatus;
  const [presenca, foto] = await Promise.all([ouNulo(getPresencaDeputado(deputado.id, s.data)), fotoComoDataUri(s.urlFoto)]);
  const partido = [s.siglaPartido, s.siglaUf].filter(Boolean).join("/");

  return cartao({
    secao: "Parlamentares",
    acento: ACENTO.parlamentares,
    titulo: s.nomeEleitoral || s.nome,
    subtitulo: ["Deputado(a) federal", partido].filter(Boolean).join(" · "),
    foto,
    ...(presenca && presenca.sessoes > 0
      ? {
          destaque: porcentagem(presenca.presencas, presenca.sessoes),
          legenda: `de presença no plenário em ${presenca.desde.slice(0, 4)} (${presenca.presencas} de ${presenca.sessoes} sessões)`,
        }
      : {}),
    fonte: "Dados da Câmara dos Deputados",
  });
}
