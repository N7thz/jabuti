"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";

import { BotaoCopiar } from "@/components/apoio/botao-copiar";
import { svgDoQr } from "@/components/apoio/qr";
import { Input } from "@/components/ui/input";
import { gerarPix } from "@/lib/apoio/pix";
import { cn } from "@/lib/utils";

export interface PixPublico {
  chave: string;
  rotuloChave: string;
  nome: string;
  cidade: string;
  mensagem: string;
  valores: readonly number[];
}

const semAssinatura = () => () => {};

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** "25", "25,50", "R$ 1.000,00" → centavos. Vazio ou inválido → null (o app do banco pede o valor). */
export function centavosDoTexto(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, "");
  if (!limpo) return null;
  // Formato brasileiro: ponto separa milhar, vírgula separa centavos.
  const numero = Number(limpo.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(numero) || numero <= 0 || numero > 100_000) return null;
  return Math.round(numero * 100);
}

/**
 * Pix com valor à escolha: valores sugeridos, um valor livre ou "eu digito no banco". O QR Code e o
 * copia e cola são refeitos a cada escolha. `svgInicial` (sem valor) vem pronto do servidor, para o
 * QR aparecer mesmo antes do JavaScript carregar.
 */
export function PainelPix({ pix, svgInicial, className }: { pix: PixPublico; svgInicial?: string; className?: string }) {
  const id = useId();
  // A escolha de valor só funciona com JavaScript; sem ele fica o Pix sem valor (o banco pergunta quanto).
  const pronto = useSyncExternalStore(semAssinatura, () => true, () => false);
  const [escolha, setEscolha] = useState<string>("livre");
  const [outro, setOutro] = useState("");
  const [svg, setSvg] = useState(svgInicial ?? "");

  const centavos = escolha === "outro" ? centavosDoTexto(outro) : escolha === "livre" ? null : Number(escolha);
  const outroInvalido = escolha === "outro" && outro.trim() !== "" && centavos === null;
  const copiaECola = gerarPix({ chave: pix.chave, nome: pix.nome, cidade: pix.cidade, mensagem: pix.mensagem, centavos: centavos ?? undefined });

  useEffect(() => {
    let vivo = true;
    svgDoQr(copiaECola).then((s) => vivo && setSvg(s), () => {});
    return () => {
      vivo = false;
    };
  }, [copiaECola]);

  const opcoes = [
    ...pix.valores.map((v) => ({ valor: String(v), rotulo: reais.format(v / 100) })),
    { valor: "outro", rotulo: "Outro valor" },
    { valor: "livre", rotulo: "Escolho no banco" },
  ];

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {pronto && (
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold">Quanto você quer dar?</legend>
        <div className="flex flex-wrap gap-2">
          {opcoes.map((o) => (
            <label
              key={o.valor}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors",
                "has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground",
                "has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 hover:bg-accent has-checked:hover:bg-primary",
              )}
            >
              <input
                type="radio"
                name={`${id}-valor`}
                value={o.valor}
                checked={escolha === o.valor}
                onChange={() => setEscolha(o.valor)}
                className="sr-only"
              />
              {o.rotulo}
            </label>
          ))}
        </div>
        {escolha === "outro" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-outro`} className="text-sm font-medium">
              Valor em reais
            </label>
            <Input
              id={`${id}-outro`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="Ex.: 15 ou 15,50"
              value={outro}
              onChange={(e) => setOutro(e.target.value)}
              aria-invalid={outroInvalido || undefined}
              aria-describedby={outroInvalido ? `${id}-erro` : undefined}
              className="max-w-48"
              autoFocus
            />
            {outroInvalido && (
              <p id={`${id}-erro`} className="text-sm text-destructive">
                Digite um valor entre R$ 0,01 e R$ 100.000. Sem valor, o app do banco pergunta quanto.
              </p>
            )}
          </div>
        )}
      </fieldset>
      )}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div
          role="img"
          aria-label={`QR Code do Pix${centavos ? ` de ${reais.format(centavos / 100)}` : ""} para ${pix.nome}`}
          className="size-48 shrink-0 overflow-hidden rounded-xl bg-white p-1 ring-1 ring-border [&>svg]:size-full"
          // SVG gerado aqui mesmo pela biblioteca de QR, a partir do texto do Pix: não vem de fora.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm">
          <p>
            Abra o app do seu banco, escolha <strong>Pix</strong> e depois <strong>Ler QR Code</strong> ou{" "}
            <strong>Pix copia e cola</strong>.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-codigo`} className="font-medium">
              Pix copia e cola{centavos ? ` (${reais.format(centavos / 100)})` : ""}
            </label>
            <textarea
              id={`${id}-codigo`}
              readOnly
              rows={3}
              value={copiaECola}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full resize-none rounded-lg border bg-muted/50 p-2 font-mono text-xs break-all outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <BotaoCopiar texto={copiaECola} rotulo="Copiar código Pix" confirmacao="Código Pix copiado. Cole no app do banco." />
            <BotaoCopiar texto={pix.chave} rotulo={`Copiar chave (${pix.rotuloChave})`} confirmacao="Chave Pix copiada." variant="outline" />
          </div>
          <p className="text-muted-foreground">
            Confira no app do banco se quem recebe é <strong className="text-foreground">{pix.nome}</strong> antes de confirmar.
          </p>
        </div>
      </div>
    </div>
  );
}
