import { ACENTO, cartao, ouNulo, TAMANHO } from "@/components/og/cartao";
import { getAnosEmendas, getEmendasMunicipio, getMunicipio } from "@/lib/emendas/queries";
import { deCentavos, formatarReais } from "@/lib/format/dinheiro";
import { isUf, UFS } from "@/lib/ufs";

export const alt = "Cartão da cidade no Jabuti, com o total pago em emendas parlamentares no ano";
export const size = TAMANHO;
export const contentType = "image/png";

export default async function Imagem({ params }: { params: Promise<{ uf: string; ibge: string }> }) {
  const { uf, ibge } = await params;
  const municipio = isUf(uf) && /^\d{7}$/.test(ibge) ? await ouNulo(getMunicipio(uf, Number(ibge))) : null;
  if (!municipio) return cartao({ secao: "Estados e cidades", acento: ACENTO.cidades, titulo: "Emendas por cidade" });

  const ano = (await ouNulo(getAnosEmendas()))?.[0];
  const dados = ano ? await ouNulo(getEmendasMunicipio(municipio.ibge, ano)) : null;

  return cartao({
    secao: "Estados e cidades",
    acento: ACENTO.cidades,
    titulo: municipio.nome,
    subtitulo: `Cidade · ${UFS[municipio.uf]}`,
    ...(dados && dados.quantidade > 0
      ? {
          destaque: formatarReais(deCentavos(dados.totais.pago)),
          legenda: `pagos em ${dados.quantidade} ${dados.quantidade === 1 ? "emenda parlamentar" : "emendas parlamentares"} em ${ano}`,
        }
      : { legenda: "Quanto deputados e senadores mandaram em emendas para a cidade" }),
    fonte: "Dados do Portal da Transparência",
  });
}
