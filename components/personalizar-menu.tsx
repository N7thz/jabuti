"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { ASSUNTOS_OPCIONAIS, EVENTO_MENU, menuSalvo, salvarMenu, type AssuntoOpcional } from "@/lib/menu";
import { cn } from "@/lib/utils";

const assinar = (avisar: () => void) => {
  window.addEventListener(EVENTO_MENU, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO_MENU, avisar);
    window.removeEventListener("storage", avisar);
  };
};
// Texto estável para o useSyncExternalStore comparar; a lista sai dele.
const lerSalvo = () => menuSalvo().join(",");
const noServidor = () => null;

/**
 * Último item de "Consultas": abre a escolha dos assuntos opcionais do menu. As mudanças valem na hora
 * e ficam neste aparelho (lib/menu.ts). Sem JavaScript o botão não faz nada, e todas as páginas
 * continuam a um clique pela página inicial.
 */
export function PersonalizarMenu() {
  const [aberto, setAberto] = useState(false);
  const { isMobile, setOpenMobile } = useSidebar();
  const salvo = useSyncExternalStore(assinar, lerSalvo, noServidor);
  const ligados = salvo === null ? null : (salvo.split(",").filter(Boolean) as AssuntoOpcional[]);
  const id = useId();

  const alternar = (assunto: AssuntoOpcional, ligar: boolean) => {
    const atuais = menuSalvo();
    salvarMenu(ligar ? [...atuais, assunto] : atuais.filter((a) => a !== assunto));
  };

  return (
    <>
      <SidebarMenuButton
        tooltip="Personalizar menu"
        aria-haspopup="dialog"
        onClick={() => {
          setAberto(true);
          if (isMobile) setOpenMobile(false);
        }}
        className="text-muted-foreground"
      >
        <SlidersHorizontalIcon aria-hidden="true" />
        <span>Personalizar menu</span>
      </SidebarMenuButton>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Personalizar menu</DialogTitle>
            <DialogDescription>
              Parlamentares, Leis e projetos e Estados e cidades ficam sempre no menu. Escolha o que mais quer ver. A escolha
              vale neste aparelho e todas as páginas continuam na página inicial.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="flex flex-col gap-2" aria-describedby={`${id}-ajuda`}>
            <legend className="mb-1 font-semibold">Assuntos opcionais</legend>
            <p id={`${id}-ajuda`} className="sr-only">
              Marque para mostrar no menu lateral. A mudança vale na hora.
            </p>
            {ASSUNTOS_OPCIONAIS.map((assunto) => (
              <label
                key={assunto.id}
                className={cn(
                  "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-colors",
                  "has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50 hover:bg-accent/60",
                )}
              >
                <input
                  type="checkbox"
                  checked={ligados?.includes(assunto.id) ?? false}
                  disabled={ligados === null}
                  onChange={(e) => alternar(assunto.id, e.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{assunto.rotulo}</span>
                  <span className="text-sm text-muted-foreground">{assunto.descricao}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => salvarMenu(ASSUNTOS_OPCIONAIS.map((a) => a.id))}>
                Mostrar todos
              </Button>
              <Button type="button" variant="ghost" onClick={() => salvarMenu([])} disabled={!ligados?.length}>
                Voltar ao padrão
              </Button>
            </div>
            <Button type="button" onClick={() => setAberto(false)}>
              Pronto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
