import type { MetadataRoute } from "next";

import { urlDoSite } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API interna e páginas da conta: não têm conteúdo público para indexar.
      disallow: ["/api/", "/fixados"],
    },
    sitemap: urlDoSite("/sitemap.xml"),
  };
}
