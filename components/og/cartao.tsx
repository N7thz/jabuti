/* eslint-disable @next/next/no-img-element -- ImageResponse (satori) só entende <img>. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/*
 * Cartão de compartilhamento (1200x630) dos opengraph-image.tsx. Fundo charcoal e texto claro do
 * DESIGN.md, com o acento da seção no tema escuro (contraste acima de 7:1 sobre #222222).
 */

export const TAMANHO = { width: 1200, height: 630 };

const COR = { fundo: "#222222", texto: "#F5F5F5", secundario: "#A6A6A6", borda: "#333333" };

export const ACENTO = {
  portal: COR.texto,
  parlamentares: "#B9A0EE",
  cidades: "#79BFDC",
} as const;

const icone = readFile(join(process.cwd(), "app/icon.svg"), "base64").then((b) => `data:image/svg+xml;base64,${b}`);

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

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: COR.fundo,
          color: COR.texto,
          fontFamily: "Barlow",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={logo} width={64} height={64} alt="" style={{ borderRadius: 14, border: `2px solid ${COR.borda}` }} />
          <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>Jabuti</span>
          {secao && (
            <span style={{ fontSize: 26, fontWeight: 400, color: acento, textTransform: "uppercase", letterSpacing: "0.08em", marginLeft: 12 }}>
              {secao}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          {foto && (
            <img
              src={foto}
              width={220}
              height={220}
              alt=""
              style={{ borderRadius: 9999, objectFit: "cover", border: `6px solid ${acento}` }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: titulo.length > 28 ? 60 : 76, fontWeight: 700, lineHeight: 1.02, letterSpacing: "-0.03em" }}>
              {titulo}
            </span>
            {subtitulo && <span style={{ fontSize: 34, color: COR.secundario }}>{subtitulo}</span>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32 }}>
          {destaque ? (
            // Valor longo (ex.: reais) não cabe ao lado da legenda: ela desce para baixo dele.
            <div
              style={{
                display: "flex",
                flexDirection: destaque.length > 6 ? "column" : "row",
                alignItems: destaque.length > 6 ? "flex-start" : "baseline",
                gap: destaque.length > 6 ? 8 : 20,
              }}
            >
              <span style={{ fontSize: destaque.length > 12 ? 72 : 88, fontWeight: 700, color: acento, lineHeight: 1 }}>{destaque}</span>
              {legenda && <span style={{ fontSize: 30, maxWidth: destaque.length > 6 ? 700 : 520 }}>{legenda}</span>}
            </div>
          ) : (
            <span style={{ fontSize: 32, maxWidth: 760 }}>{legenda ?? ""}</span>
          )}
          {fonte && <span style={{ fontSize: 22, color: COR.secundario, textAlign: "right", maxWidth: 340 }}>{fonte}</span>}
        </div>
      </div>
    ),
    { ...TAMANHO, fonts: fonts.length ? fonts : undefined },
  );
}
