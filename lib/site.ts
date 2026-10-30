/**
 * Endereço público do portal, base dos links absolutos (sitemap, robots, imagens de compartilhamento).
 * Sem NEXT_PUBLIC_SITE_URL, usa o mesmo endereço do login (BETTER_AUTH_URL).
 */
export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000",
);

/** URL absoluta de um caminho do portal. */
export const urlDoSite = (caminho: string) => new URL(caminho, SITE_URL).toString();
