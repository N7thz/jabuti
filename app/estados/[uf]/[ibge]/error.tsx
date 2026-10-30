"use client";

import { ErroDaPagina } from "@/components/erro-da-pagina";

export default function Erro(props: { error: unknown; retry: () => void }) {
  return <ErroDaPagina {...props} fonte="do Portal da Transparência, do Transferegov e do Tesouro Nacional" />;
}
