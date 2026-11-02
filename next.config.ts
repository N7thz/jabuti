import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança em todas as respostas. A CSP aqui não restringe scripts (isso pediria nonce em
 * cada página); ela fecha o que não tem uso no portal: ser aberto dentro de outro site (clickjacking),
 * trocar a base dos links, formulários enviando para fora e plugins.
 */
const CABECALHOS_SEGURANCA = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS_SEGURANCA }];
  },
  partialPrefetching: true,
  experimental: {
    // Habilita unauthorized()/forbidden(), usados por requireSession().
    authInterrupts: true,
    // Anexos do /feedback: até 10 MB no total (lib/feedback/schema.ts), mais a folga da codificação do envio.
    serverActions: { bodySizeLimit: "12mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
