"use client";

import { ErroDaPagina } from "@/components/erro-da-pagina";

export default function Erro(props: { error: unknown; retry: () => void }) {
  return <ErroDaPagina {...props} fonte="da API da Câmara dos Deputados ou das votações do Senado guardadas no portal" />;
}
