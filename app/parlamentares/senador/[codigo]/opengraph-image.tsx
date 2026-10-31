import { ACENTO, cartao, fotoComoDataUri, ouNulo, porcentagem, TAMANHO, TIPO } from "@/components/og/cartao";
import { getSenador, getVotacoesSenador } from "@/lib/parlamentares/queries";

export const alt = "Cartão do senador no Jabuti, com a presença nas votações do ano";
export const size = TAMANHO;
export const contentType = TIPO;

export default async function Imagem({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const senador = await ouNulo(getSenador(codigo));
  if (!senador) return cartao({ secao: "Parlamentares", acento: ACENTO.parlamentares, titulo: "Senador(a)" });

  const [votacoes, foto] = await Promise.all([ouNulo(getVotacoesSenador(codigo)), fotoComoDataUri(senador.fotoUrl)]);
  const partido = [senador.partido, senador.uf].filter(Boolean).join("/");
  const p = votacoes?.presenca;
  const contadas = p ? p.PRESENTE + p.AUSENCIA_JUSTIFICADA + p.AUSENTE : 0;

  return cartao({
    secao: "Parlamentares",
    acento: ACENTO.parlamentares,
    titulo: senador.nome,
    subtitulo: ["Senador(a)", partido].filter(Boolean).join(" · "),
    foto,
    ...(p && contadas > 0
      ? {
          destaque: porcentagem(p.PRESENTE, contadas),
          legenda: `de presença nas votações do plenário em ${new Date().getFullYear()} (${p.PRESENTE} de ${contadas})`,
        }
      : {}),
    fonte: "Dados do Senado Federal",
  });
}
