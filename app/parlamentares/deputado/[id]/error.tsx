"use client";

import { ErroDaPagina } from "@/components/erro-da-pagina";

export default function Erro(props: { error: unknown; retry: () => void }) {
  return <ErroDaPagina {...props} fonte="da Câmara dos Deputados e do Portal da Transparência" />;
}
