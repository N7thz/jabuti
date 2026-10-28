import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { Termo } from "@/components/termo";
import { Skeleton } from "@/components/ui/skeleton";
import { getContasAnuais } from "@/lib/siconfi/queries";

const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

/**
 * Quanto a prefeitura (ou o estado) arrecadou e gastou no ano, por área, segundo as contas entregues
 * ao Tesouro. `emendasPagas` (centavos, do mesmo ano) mostra o peso das emendas no orçamento local.
 */
export async function ContasEnte({
  idEnte,
  nome,
  ano,
  emendasPagas,
}: {
  idEnte: number;
  nome: string;
  ano: number;
  emendasPagas?: { ano: number; valor: number };
}) {
  const contas = await getContasAnuais(idEnte, ano);

  return (
    <section aria-labelledby="contas" className="flex flex-col gap-3">
      <h2 id="contas" className="text-xl font-bold">
        Como a prefeitura gastou o dinheiro {contas && `em ${contas.ano}`}
      </h2>
      {!contas ? (
        <p className="rounded-lg border bg-card p-4 text-muted-foreground">
          {nome} não entregou ao Tesouro Nacional as contas de {ano - 1} nem de {ano}.
        </p>
      ) : (
        <>
          <p className="max-w-[70ch] text-muted-foreground">
            <Termo id="receita">Arrecadou</Termo> {contas.receita === null ? "valor não informado" : reaisDeCentavos(contas.receita)} e pagou{" "}
            {reaisDeCentavos(contas.despesa.pago)} em despesas. A tabela mostra o gasto por{" "}
            <Termo id="funcao-governo">área</Termo>.
            {emendasPagas?.ano === contas.ano && contas.receita ? (
              <>
                {" "}
                As emendas parlamentares pagas para a cidade nesse ano equivalem a{" "}
                <strong className="text-foreground">{percentual.format(emendasPagas.valor / contas.receita)}</strong> do que
                ela arrecadou.
              </>
            ) : null}
          </p>
          <Tabela legenda={`Despesas de ${nome} em ${contas.ano} por área, da maior para a menor`}>
            <THead>
              <Tr>
                <Th>Área</Th>
                <Th numero>Empenhado</Th>
                <Th numero>Pago</Th>
                <Th numero>% do pago</Th>
              </Tr>
            </THead>
            <TBody>
              {contas.funcoes.map((f) => (
                <Tr key={f.codigo}>
                  <Th scope="row" className="font-normal">
                    {f.funcao}
                  </Th>
                  <Td numero rotulo="Empenhado">{reaisDeCentavos(f.empenhado)}</Td>
                  <Td numero rotulo="Pago">{reaisDeCentavos(f.pago)}</Td>
                  <Td numero rotulo="% do pago">
                    {contas.despesa.pago ? percentual.format(f.pago / contas.despesa.pago) : "—"}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Tabela>
          <p className="text-sm text-muted-foreground">
            Fonte: <Termo id="siconfi">Declaração de Contas Anuais</Termo> ({contas.instituicao}) no SICONFI, do Tesouro
            Nacional.
          </p>
        </>
      )}
    </section>
  );
}

export function ContasEnteSkeleton() {
  return (
    <div role="status" aria-label="Carregando as contas da prefeitura" className="flex flex-col gap-3">
      <Skeleton className="h-7 w-80 max-w-full" />
      <Skeleton className="h-64" />
    </div>
  );
}
