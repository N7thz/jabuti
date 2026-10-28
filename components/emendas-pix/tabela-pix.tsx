import Link from "next/link";

import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { Termo } from "@/components/termo";
import { Badge } from "@/components/ui/badge";
import type { EmendaPix } from "@/lib/transferegov/queries";
import { areasDaEmendaPix, isEmendaPixImpedida, situacaoEmendaPix } from "@/lib/transferegov/rotulos";

export function SituacaoPix({ situacao }: { situacao: string }) {
  return (
    <Badge variant={isEmendaPixImpedida(situacao) ? "destructive" : "outline"}>{situacaoEmendaPix(situacao)}</Badge>
  );
}

/**
 * Emendas Pix (transferências especiais), da maior para a menor. `quem` escolhe a primeira coluna:
 * o beneficiário (no perfil do parlamentar) ou o autor (na página da cidade). Cada linha leva à execução.
 */
export function TabelaEmendasPix({ emendas, quem, legenda }: { emendas: EmendaPix[]; quem: "beneficiario" | "autor"; legenda: string }) {
  return (
    <Tabela legenda={legenda}>
      <THead>
        <Tr>
          <Th>{quem === "beneficiario" ? "Quem recebeu" : "Autor"}</Th>
          <Th numero>Ano</Th>
          <Th>Área</Th>
          <Th>Situação</Th>
          <Th numero>Valor</Th>
        </Tr>
      </THead>
      <TBody>
        {emendas.map((e) => (
          <Tr key={e.id}>
            <Th scope="row" className="font-normal">
              <Link
                href={`/emendas-pix/${e.id}`}
                className="font-medium text-link underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {quem === "beneficiario" ? e.beneficiario : e.autor}
              </Link>
              <span className="block font-mono text-xs text-muted-foreground">Emenda {e.codigoEmenda}</span>
            </Th>
            <Td numero rotulo="Ano">{e.ano}</Td>
            <Td rotulo="Área">{areasDaEmendaPix(e.areas).join(", ") || "Não informada"}</Td>
            <Td rotulo="Situação">
              <SituacaoPix situacao={e.situacao} />
            </Td>
            <Td numero rotulo="Valor">{reaisDeCentavos(e.total)}</Td>
          </Tr>
        ))}
      </TBody>
    </Tabela>
  );
}

/** Explicação curta do que é emenda Pix, repetida onde a tabela aparece. */
export function SobreEmendasPix() {
  return (
    <p className="max-w-[70ch] text-sm text-muted-foreground">
      <Termo id="emenda-pix">Emenda Pix</Termo> é a transferência especial: o dinheiro vai direto para a conta da
      prefeitura ou do estado, sem convênio. Quem recebe decide como gastar e presta contas no{" "}
      <Termo id="transferegov">Transferegov</Termo>.
    </p>
  );
}
