import type { MetadataRoute } from "next";

import { DESCRICAO_PORTAL } from "@/lib/metadados";

// Ícones recortados de public/icons/jabuti-original.png: os "any" são quadrados cheios (o sistema arredonda) e o
// maskable deixa o jabuti dentro da zona segura de 80% (recorte mais aberto), para não ser cortado em ícone redondo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jabuti",
    short_name: "Jabuti",
    description: DESCRICAO_PORTAL,
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#b8d15c",
    theme_color: "#b8d15c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
