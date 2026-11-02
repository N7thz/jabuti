import { hrefParlamentar } from "@/components/parlamentar-item";
import { db } from "@/lib/db";
import { getFixados } from "@/lib/fixados";
import { getDono, getPerfil } from "@/lib/meu/perfil";

import { type CidadeSidebar, GrupoFixados, type ItemFixado } from "./grupo-fixados";

/**
 * Lê os fixados e a cidade de "Meus representantes" de quem está logado e monta os grupos da sidebar;
 * visitante não vê nada.
 * Dado pessoal: fica sempre dentro de <Suspense> no layout e nunca em "use cache".
 */
export async function SidebarFixados() {
  const [fixados, cidade] = await Promise.all([getFixados(), getCidade()]);
  if (!fixados) return null;

  const itens: ItemFixado[] = [
    ...fixados.parlamentares.flatMap(({ chave, rotulo }) => {
      const [casa, id] = chave.split("-");
      if ((casa !== "camara" && casa !== "senado") || !id) return [];
      return [{ tipo: "parlamentar" as const, rotulo, href: hrefParlamentar({ casa, id }) }];
    }),
    ...fixados.partidos.map(({ chave, rotulo }) => ({
      tipo: "partido" as const,
      rotulo,
      href: `/parlamentares?partido=${encodeURIComponent(chave)}`,
    })),
    ...fixados.bancadas.map(({ chave, rotulo }) => ({
      tipo: "bancada" as const,
      rotulo,
      href: `/parlamentares?uf=${encodeURIComponent(chave)}`,
    })),
  ];

  return <GrupoFixados itens={itens} cidade={cidade} />;
}

/** Cidade escolhida em /meu, ou null quando a pessoa ainda não escolheu. */
async function getCidade(): Promise<CidadeSidebar | null> {
  const usuario = await getDono();
  const perfil = usuario ? await getPerfil(usuario) : null;
  if (!perfil?.municipioIbge) return null;
  return db.municipio.findUnique({ where: { ibge: perfil.municipioIbge }, select: { nome: true, uf: true } });
}
