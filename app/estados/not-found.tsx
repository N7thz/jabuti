import { MapPinOffIcon } from "lucide-react";
import type { Metadata } from "next";

import { AvisoPagina } from "@/components/aviso-pagina";

export const metadata: Metadata = { title: "Lugar não encontrado · Jabuti" };

export default function LugarNaoEncontrado() {
  return (
    <AvisoPagina icone={<MapPinOffIcon aria-hidden="true" />} titulo="Estado ou cidade não encontrado">
      O endereço não corresponde a nenhum estado ou cidade. A sigla do estado vai em maiúsculas (como SP) e a cidade
      usa o código de 7 números do IBGE. Escolha o estado na lista para chegar à cidade.
    </AvisoPagina>
  );
}
