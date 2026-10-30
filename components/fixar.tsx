import { alternarFixado } from "@/app/fixados/actions";
import { chaveParlamentar, getFixados, LIMITE_FIXADOS, type Fixados, type TipoFixado } from "@/lib/fixados";

import { EnviarFixado } from "./fixar-enviar";

export interface AlvoFixado {
  tipo: TipoFixado;
  chave: string;
  /** Nome guardado no atalho (ex.: "Acácio Favacho", "PL", "Bancada de SP"). */
  rotulo: string;
  /** Texto do botão depois de "Fixar"/"Desafixar" (ex.: "parlamentar", "partido PL"). */
  nome: string;
}

/**
 * Botões para fixar parlamentar, partido ou bancada. Só aparecem para quem está logado.
 * Cada um é um `<form>` com a Server Action, então funciona sem JavaScript.
 * Lê a sessão: use dentro de `<Suspense>` e nunca em "use cache".
 */
export async function BotoesFixar({
  alvos,
  fixados: jaLidos,
}: {
  alvos: AlvoFixado[];
  /** Fixados já lidos pela página (evita repetir a consulta); `null` = visitante. */
  fixados?: Fixados | null;
}) {
  const fixados = jaLidos === undefined ? await getFixados() : jaLidos;
  if (!fixados) return null;

  // Id do aviso de limite, único por grupo de botões (a página pode ter mais de um grupo).
  const idAviso = `limite-fixados-${alvos.map((a) => a.chave).join("-").replace(/[^\w-]/g, "")}`;
  const algumBloqueado = fixados.noLimite && alvos.some((a) => !fixados.tem(a.tipo, a.chave));

  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Fixar para acesso rápido" className="flex flex-wrap gap-2">
        {alvos.map((alvo) => {
          const fixado = fixados.tem(alvo.tipo, alvo.chave);
          const bloqueado = !fixado && fixados.noLimite;
          return (
            <li key={`${alvo.tipo}:${alvo.chave}`}>
              <form action={alternarFixado}>
                <input type="hidden" name="tipo" value={alvo.tipo} />
                <input type="hidden" name="chave" value={alvo.chave} />
                <input type="hidden" name="rotulo" value={alvo.rotulo} />
                <EnviarFixado fixado={fixado} bloqueado={bloqueado} descritoPor={bloqueado ? idAviso : undefined}>
                  {fixado ? "Desafixar" : "Fixar"} {alvo.nome}
                </EnviarFixado>
              </form>
            </li>
          );
        })}
      </ul>
      {algumBloqueado && (
        <p id={idAviso} className="text-sm text-muted-foreground">
          Você já tem {LIMITE_FIXADOS} fixados, o máximo. Desafixe algum para fixar outro.
        </p>
      )}
    </div>
  );
}

/** Parlamentar, partido e bancada do perfil, nessa ordem (partido/bancada só quando informados). */
export function alvosDoParlamentar(p: {
  casa: "camara" | "senado";
  id: number | string;
  nome: string;
  partido: string | null;
  uf: string | null;
}): AlvoFixado[] {
  const alvos: AlvoFixado[] = [{ tipo: "PARLAMENTAR", chave: chaveParlamentar(p), rotulo: p.nome, nome: "parlamentar" }];
  if (p.partido) alvos.push({ tipo: "PARTIDO", chave: p.partido, rotulo: p.partido, nome: `partido ${p.partido}` });
  if (p.uf) alvos.push({ tipo: "BANCADA", chave: p.uf, rotulo: `Bancada de ${p.uf}`, nome: `bancada de ${p.uf}` });
  return alvos;
}
