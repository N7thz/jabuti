/** biome-ignore-all lint/performance/noImgElement: ImageResponse (satori) só entende <img>. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import sharp from "sharp";

/*
 * Cartão de compartilhamento (1200x630) dos opengraph-image.tsx. Fundo charcoal e texto claro do tema escuro do
 * DESIGN.md, borda oliva e o acento da seção (ou o limão do ícone, no portal), acima de 7:1 sobre #222222.
 */

export const TAMANHO = { width: 1200, height: 630 };

/** Os cartões saem em JPEG: com foto, o PNG passa de 500 KB e o WhatsApp deixa de mostrar a prévia grande. */
export const TIPO = "image/jpeg";

/** Faixa da foto à esquerda: as fotos oficiais são retratos 3:4, então ~470px de largura cortam pouco do rosto. */
const FOTO_LARGURA = 470;

const COR = { fundo: "#222222", texto: "#F5F5F5", secundario: "#A6A6A6", borda: "#363C24" };

export const ACENTO = {
  portal: "#C4E05C",
  parlamentares: "#B9A0EE",
  cidades: "#79BFDC",
} as const;

const icone = readFile(join(process.cwd(), "public/icons/icon-192.png"), "base64").then((b) => `data:image/png;base64,${b}`);

/** Barlow do Google Fonts (TTF, que o satori lê); sem rede, fica a fonte padrão do next/og. */
const fontes = Promise.all(
  [
    [400, "https://fonts.gstatic.com/s/barlow/v13/7cHpv4kjgoGqM7EPCw.ttf"],
    [700, "https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3t-4c4A.ttf"],
  ].map(async ([weight, url]) => {
    const r = await fetch(url as string, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`Fonte ${url}: ${r.status}`);
    return { name: "Barlow", data: await r.arrayBuffer(), weight: weight as 400 | 700, style: "normal" as const };
  }),
).catch(() => []);

/** Mesmo cálculo do resumo do perfil, sem importar o componente (que leva código de cliente). */
export const porcentagem = (parte: number, total: number) => `${Math.round((parte / total) * 100)}%`;

/** Resolve `promessa` ou devolve `null` se ela falhar ou demorar mais que `ms`: o cartão nunca quebra por isso. */
export async function ouNulo<T>(promessa: Promise<T>, ms = 8000): Promise<T | null> {
  return Promise.race([promessa, new Promise<null>((ok) => setTimeout(() => ok(null), ms))]).catch(() => null);
}

/** Foto remota como data URI; se a imagem não vier, o satori nem tenta buscá-la (e não derruba o cartão). */
export async function fotoComoDataUri(url: string | null | undefined) {
  if (!url) return null;
  return ouNulo(
    fetch(url, { signal: AbortSignal.timeout(5000) }).then(async (r) => {
      if (!r.ok) throw new Error(String(r.status));
      const tipo = r.headers.get("content-type") ?? "image/jpeg";
      return `data:${tipo};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
    }),
  );
}

export async function cartao({
  secao,
  acento,
  titulo,
  subtitulo,
  destaque,
  legenda,
  foto,
  fonte,
}: {
  /** Nome da seção, no topo ao lado da marca. */
  secao?: string;
  acento: string;
  titulo: string;
  subtitulo?: string | null;
  /** Número em evidência (ex.: "87%"), com a `legenda` ao lado. */
  destaque?: string | null;
  legenda?: string | null;
  foto?: string | null;
  /** Rodapé: de onde vêm os dados. */
  fonte?: string;
}) {
  const [logo, fonts] = await Promise.all([icone, fontes]);

  // Com foto, ela ocupa a altura toda à esquerda (como nas prévias grandes do WhatsApp) e o texto fica ao lado.
  const comFoto = Boolean(foto);
  const tituloGrande = comFoto ? titulo.length <= 22 : titulo.length <= 28;

  const png = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: COR.fundo, color: COR.texto, fontFamily: "Barlow" }}>
        {foto && (
          <img
            src={foto}
            width={FOTO_LARGURA}
            height={TAMANHO.height}
            alt=""
            style={{ objectFit: "cover", objectPosition: "top", borderRight: `8px solid ${acento}` }}
          />
        )}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: comFoto ? 56 : 72,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <img src={logo} width={56} height={56} alt="" style={{ borderRadius: 12, border: `2px solid ${COR.borda}` }} />
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}>Jabuti</span>
            {secao && (
              <span style={{ fontSize: 24, fontWeight: 400, color: acento, textTransform: "uppercase", letterSpacing: "0.08em", marginLeft: 8 }}>
                {secao}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span
              style={{
                fontSize: comFoto ? (tituloGrande ? 68 : 54) : tituloGrande ? 76 : 60,
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: "-0.03em",
              }}
            >
              {titulo}
            </span>
            {subtitulo && <span style={{ fontSize: comFoto ? 30 : 34, color: COR.secundario }}>{subtitulo}</span>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {destaque ? (
              // Valor longo (ex.: reais) não cabe ao lado da legenda: ela desce para baixo dele.
              <div
                style={{
                  display: "flex",
                  flexDirection: comFoto || destaque.length > 6 ? "column" : "row",
                  alignItems: comFoto || destaque.length > 6 ? "flex-start" : "baseline",
                  gap: comFoto || destaque.length > 6 ? 8 : 20,
                }}
              >
                <span style={{ fontSize: destaque.length > 12 ? 64 : 80, fontWeight: 700, color: acento, lineHeight: 1 }}>{destaque}</span>
                {legenda && <span style={{ fontSize: comFoto ? 26 : 30, maxWidth: comFoto ? 620 : 700 }}>{legenda}</span>}
              </div>
            ) : (
              <span style={{ fontSize: comFoto ? 28 : 32, maxWidth: 760 }}>{legenda ?? ""}</span>
            )}
            {fonte && <span style={{ fontSize: 22, color: COR.secundario }}>{fonte}</span>}
          </div>
        </div>
      </div>
    ),
    { ...TAMANHO, fonts: fonts.length ? fonts : undefined },
  );

  // Mesmos cabeçalhos de cache do ImageResponse; só o corpo e o tipo mudam (~60 KB em vez de ~600 KB).
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  const headers = new Headers(png.headers);
  headers.set("content-type", TIPO);
  return new Response(new Uint8Array(jpeg), { status: png.status, headers });
}
