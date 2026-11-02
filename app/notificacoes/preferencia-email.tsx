import { CircleCheckIcon } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { donoDa } from "@/lib/fixados";
import type { FrequenciaEmail } from "@/lib/generated/prisma/enums";

import { salvarFrequenciaEmail } from "./actions";

const OPCOES: { valor: FrequenciaEmail; rotulo: string; dica: string }[] = [
  { valor: "NUNCA", rotulo: "Não receber", dica: "As novidades ficam só aqui no portal." },
  { valor: "DIARIO", rotulo: "Resumo diário", dica: "Um email por dia, só quando houver novidade." },
  { valor: "SEMANAL", rotulo: "Resumo semanal", dica: "Um email por semana, só quando houver novidade." },
];

/**
 * Escolha do resumo por email. Formulário comum com botão de salvar: funciona sem JavaScript.
 * Lê o banco com a sessão: use dentro de `<Suspense>` e nunca em "use cache".
 */
export async function PreferenciaEmail({
  sessao,
  voltar,
  salvo,
}: {
  sessao: { user: { email: string } };
  voltar: "/notificacoes" | "/configuracoes";
  salvo: boolean;
}) {
  const pref = await db.preferenciaNotificacao.findUnique({ where: { usuario: donoDa(sessao) }, select: { email: true } });
  const atual = pref?.email ?? "NUNCA";

  return (
    <form action={salvarFrequenciaEmail} className="flex flex-col items-start gap-4">
      <input type="hidden" name="voltar" value={voltar} />
      {salvo && (
        <Alert role="status">
          <CircleCheckIcon aria-hidden="true" />
          <AlertTitle>Preferência de email salva.</AlertTitle>
        </Alert>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Resumo por email</legend>
        <p className="mb-2 text-sm text-muted-foreground">
          Enviado para {sessao.user.email}. Cada email tem um link para parar de receber.
        </p>
        {OPCOES.map((o) => (
          <label key={o.valor} className="flex min-h-11 items-start gap-3">
            <input type="radio" name="email" value={o.valor} defaultChecked={atual === o.valor} className="mt-1 size-4 accent-primary" />
            <span className="flex flex-col">
              <span>{o.rotulo}</span>
              <span className="text-sm text-muted-foreground">{o.dica}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Button type="submit" variant="outline">
        Salvar preferência
      </Button>
    </form>
  );
}
