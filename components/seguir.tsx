import { alternarSeguido } from "@/app/seguidos/actions";
import { getSeguidos, LIMITE_SEGUIDOS, type Seguidos, type TipoSeguido } from "@/lib/seguidos";

import { EnviarSeguido } from "./seguir-enviar";

/**
 * Botão "Seguir" de um parlamentar ou projeto: quem segue recebe notificações em /notificacoes.
 * Só aparece para quem está logado.
 * É um `<form>` com a Server Action, então funciona sem JavaScript.
 * Lê a sessão: use dentro de `<Suspense>` e nunca em "use cache".
 */
export async function BotaoSeguir({
  tipo,
  chave,
  rotulo,
  nome,
  seguidos: jaLidos,
}: {
  tipo: TipoSeguido;
  chave: string;
  /** Nome guardado (ex.: "Acácio Favacho", "PL 2338/2023"). */
  rotulo: string;
  /** Texto do botão depois de "Seguir"/"Deixar de seguir" (ex.: "parlamentar", "projeto"). */
  nome: string;
  /** Seguidos já lidos pela página (evita uma consulta por item numa lista); `null` = visitante. */
  seguidos?: Seguidos | null;
}) {
  const seguidos = jaLidos === undefined ? await getSeguidos() : jaLidos;
  if (!seguidos) return null;

  const seguindo = seguidos.tem(tipo, chave);
  const bloqueado = !seguindo && seguidos.noLimite;
  const idAviso = `limite-seguidos-${chave}`;

  return (
    <div className="flex flex-col gap-2">
      <form action={alternarSeguido}>
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="chave" value={chave} />
        <input type="hidden" name="rotulo" value={rotulo} />
        <EnviarSeguido seguindo={seguindo} bloqueado={bloqueado} descritoPor={bloqueado ? idAviso : undefined}>
          {seguindo ? "Deixar de seguir" : "Seguir"} {nome}
          <span className="sr-only"> {rotulo}</span>
        </EnviarSeguido>
      </form>
      {bloqueado && (
        <p id={idAviso} className="text-sm text-muted-foreground">
          Você já segue {LIMITE_SEGUIDOS} itens, o máximo. Deixe de seguir algum para seguir outro.
        </p>
      )}
    </div>
  );
}
