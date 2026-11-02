import { BellRingIcon, Building2Icon } from "lucide-react";
import Link from "next/link";

import { Termo } from "@/components/termo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mascaraCnpj } from "@/lib/filtros/mascaras";
import { formatarData } from "@/lib/format/datas";
import { pararDeVigiar, vigiarEmpresa } from "@/lib/meu/actions";
import { type EmpresaNoPainel, LIMITE_EMPRESAS } from "@/lib/meu/empresas";

/** Lista das empresas vigiadas, com o que mudou, e o formulário para vigiar outra pelo CNPJ. */
export function EmpresasVigiadas({ empresas }: { empresas: EmpresaNoPainel[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[65ch] text-muted-foreground">
        O painel confere as sanções (<Termo id="ceis">CEIS</Termo>, <Termo id="cnep">CNEP</Termo> e{" "}
        <Termo id="tcu">TCU</Termo>) e os contratos com o governo federal de cada empresa sempre que você abre esta página,
        e avisa o que mudou.
      </p>

      {empresas.length > 0 && (
        <ul className="flex flex-col gap-2">
          {empresas.map((e) => (
            <li key={e.cnpj} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
              <div className="flex min-w-0 flex-col gap-1">
                <Link href={`/empresas?cnpj=${e.cnpj}`} className="font-medium text-link underline underline-offset-2">
                  {e.rotulo}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">{mascaraCnpj(e.cnpj)}</span>
                {e.novidades.map((n) => (
                  <span key={n} className="flex items-center gap-1.5 text-sm font-medium">
                    <BellRingIcon aria-hidden="true" className="size-4 text-secao" />
                    {n}
                    {e.mudouEm && <span className="font-normal text-muted-foreground">({formatarData(e.mudouEm)})</span>}
                  </span>
                ))}
                {e.indisponivel && (
                  <span className="text-sm text-muted-foreground">
                    As fontes não responderam agora; mostramos o que vimos da última vez.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {e.estado && (
                  <Badge variant={e.estado.sancoes > 0 ? "destructive" : "secondary"}>
                    {e.estado.sancoes === 0 ? "Sem sanções" : e.estado.sancoes === 1 ? "1 sanção" : `${e.estado.sancoes} sanções`}
                  </Badge>
                )}
                <form action={pararDeVigiar}>
                  <input type="hidden" name="cnpj" value={e.cnpj} />
                  <input type="hidden" name="de" value="/meu#empresas" />
                  <Button type="submit" variant="ghost" size="sm" aria-label={`Parar de vigiar ${e.rotulo}`}>
                    Parar de vigiar
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {empresas.length < LIMITE_EMPRESAS ? (
        <form action={vigiarEmpresa} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="de" value="/meu#empresas" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vigiar-cnpj" className="text-sm font-medium">
              CNPJ
            </label>
            <Input id="vigiar-cnpj" name="cnpj" inputMode="numeric" required placeholder="00.000.000/0000-00" className="w-56" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vigiar-rotulo" className="text-sm font-medium">
              Nome para lembrar
            </label>
            <Input id="vigiar-rotulo" name="rotulo" required maxLength={200} placeholder="Ex.: Construtora X" className="w-64" />
          </div>
          <Button type="submit" className="h-10">
            <Building2Icon data-icon="inline-start" aria-hidden="true" />
            Vigiar empresa
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Você chegou ao limite de {LIMITE_EMPRESAS} empresas vigiadas.</p>
      )}
      <p className="text-sm text-muted-foreground">
        Também dá para vigiar direto da <Link href="/empresas" className="text-link underline">consulta de CNPJ</Link>.
      </p>
    </div>
  );
}
