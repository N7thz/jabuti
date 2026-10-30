import { UserRoundXIcon } from "lucide-react";
import type { Metadata } from "next";

import { AvisoPagina } from "@/components/aviso-pagina";

export const metadata: Metadata = { title: "Parlamentar não encontrado · Jabuti" };

// Os perfis chamam notFound() também quando a Câmara ou o Senado não respondem, por isso a segunda frase.
export default function ParlamentarNaoEncontrado() {
  return (
    <AvisoPagina icone={<UserRoundXIcon aria-hidden="true" />} titulo="Parlamentar não encontrado">
      Não achamos ninguém com este código na Câmara nem no Senado. Se você seguiu um link daqui, o site oficial pode
      estar fora do ar: tente de novo em alguns minutos ou procure o nome na lista de parlamentares.
    </AvisoPagina>
  );
}
