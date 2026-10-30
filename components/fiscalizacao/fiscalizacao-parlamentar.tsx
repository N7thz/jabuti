import { ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";

import { AvisoFonte } from "@/components/aviso-fonte";
import { SobreEmendasPix, TabelaEmendasPix } from "@/components/emendas-pix/tabela-pix";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { Rolavel, Secao } from "@/components/perfil-parlamentar";
import { Termo } from "@/components/termo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { tentar } from "@/lib/erros";
import { formatarData } from "@/lib/format/datas";
import type { Casa } from "@/lib/generated/prisma/enums";
import { getInabilitacoesTcu } from "@/lib/tcu/queries";
import { getCampanhaParlamentar } from "@/lib/tse/queries";
import { getEmendasPixParlamentar } from "@/lib/transferegov/queries";

/**
 * Seção "Fiscalização" do perfil: inabilitação no TCU e emendas Pix com o destino de cada uma.
 * O CPF (da API da Câmara ou da candidatura no TSE) serve para casar o registro do TCU e não é exibido.
 */
export async function FiscalizacaoParlamentar({
  casa,
  idExterno,
  nome,
  nomeCivil,
  cpf,
  uf,
}: {
  casa: Casa;
  idExterno: string;
  nome: string;
  nomeCivil: string | null;
  cpf?: string | null;
  uf: string | null;
}) {
  // Senadores não têm CPF na API do Senado; a candidatura do TSE tem, e o casamento com o TCU fica exato.
  // Sem a candidatura, o casamento com o TCU cai para nome + UF (e o aviso de homônimo aparece).
  const campanha = cpf ? null : await tentar("o banco do portal", getCampanhaParlamentar({ casa, idExterno }));
  const cpfParaCasar = cpf ?? (campanha?.ok ? campanha.dados?.cpf : null);
  // Cada fonte falha sozinha: TCU fora do ar não esconde as emendas Pix, e vice-versa.
  const [tcu, pix] = await Promise.all([
    nomeCivil ? tentar("o TCU", getInabilitacoesTcu({ nomeCivil, cpf: cpfParaCasar, uf })) : null,
    tentar("o Transferegov", getEmendasPixParlamentar({ casa, idExterno })),
  ]);

  return (
    <Secao id="fiscalizacao" titulo="Fiscalização" descricao="Condenações no Tribunal de Contas da União e emendas Pix">
      <div className="flex flex-col gap-6">
        {!tcu ? null : !tcu.ok ? (
          <AvisoFonte
            fontes={[tcu.fonte]}
            consequencia={`Não dá para dizer agora se ${nome} tem inabilitação para cargo público.`}
          />
        ) : tcu.dados.sancoes.length === 0 ? (
          <Alert>
            <ShieldCheckIcon aria-hidden="true" />
            <AlertTitle>Sem inabilitação no TCU</AlertTitle>
            <AlertDescription>
              {nome} não aparece na lista de pessoas com <Termo id="inabilitacao">inabilitação</Termo> para cargo público
              do <Termo id="tcu">Tribunal de Contas da União</Termo>.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <ShieldAlertIcon aria-hidden="true" />
            <AlertTitle>
              <Termo id="inabilitacao">Inabilitação</Termo> no <Termo id="tcu">TCU</Termo>
            </AlertTitle>
            <AlertDescription>
              <ul className="flex flex-col gap-1">
                {tcu.dados.sancoes.map((s) => (
                  <li key={s.processo + s.deliberacao}>
                    Processo <span className="font-mono">{s.processo}</span> (<Termo id="acordao">{s.deliberacao}</Termo>), inabilitado até{" "}
                    {formatarData(s.ate)}
                    {s.municipio && ` · ${s.municipio}/${s.uf}`}
                  </li>
                ))}
              </ul>
              {tcu.dados.casamento === "nome" && (
                <p className="mt-2">
                  Encontrado pelo nome civil e pelo estado. Pode ser um <Termo id="homonimo">homônimo</Termo>; confira o
                  processo no site do TCU.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Emendas Pix</h3>
          <SobreEmendasPix />
          {!pix.ok ? (
            <AvisoFonte fontes={[pix.fonte]} consequencia="As emendas Pix não puderam ser carregadas." />
          ) : pix.dados.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma emenda Pix de {nome} encontrada no Transferegov.</p>
          ) : (
            <>
              <p>
                {pix.dados.length} {pix.dados.length === 1 ? "emenda" : "emendas"}, somando{" "}
                <strong className="font-mono">{reaisDeCentavos(pix.dados.reduce((soma, e) => soma + e.total, 0))}</strong>.
              </p>
              <Rolavel>
                <TabelaEmendasPix emendas={pix.dados} quem="beneficiario" legenda={`Emendas Pix de ${nome}, da maior para a menor`} />
              </Rolavel>
            </>
          )}
        </div>
      </div>
    </Secao>
  );
}
