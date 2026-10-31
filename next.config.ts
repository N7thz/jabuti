import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
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
