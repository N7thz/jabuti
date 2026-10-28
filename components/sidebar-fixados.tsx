import { hrefParlamentar } from "@/components/parlamentar-item";
import { getFixados } from "@/lib/fixados";

import { GrupoFixados, type ItemFixado } from "./grupo-fixados";

/**
 * Lê os fixados de quem está logado e monta o grupo da sidebar; visitante não vê nada.
 * Dado pessoal: fica sempre dentro de <Suspense> no layout e nunca em "use cache".
 */
export async function SidebarFixados() {
  const fixados = await getFixados();
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

  return <GrupoFixados itens={itens} />;
}
