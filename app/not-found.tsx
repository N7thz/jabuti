import { SearchXIcon } from "lucide-react";
import type { Metadata } from "next";

import { AvisoPagina } from "@/components/aviso-pagina";

export const metadata: Metadata = { title: "Página não encontrada · Jabuti" };

export default function NaoEncontrada() {
  return (
    <AvisoPagina icone={<SearchXIcon aria-hidden="true" />} titulo="Página não encontrada">
      O endereço pode ter sido digitado errado ou a página mudou de lugar. Comece por um destes caminhos:
    </AvisoPagina>
  );
}
