import QRCode from "qrcode";

/**
 * QR Code em SVG. Sempre preto no branco, nos dois temas: leitor de QR de banco erra com cores
 * invertidas ou pouco contraste. Correção M: aguenta um pouco de reflexo na tela sem crescer demais.
 */
export function svgDoQr(texto: string): Promise<string> {
  return QRCode.toString(texto, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
