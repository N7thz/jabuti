/**
 * Preferência de animações da pessoa. "sistema" segue o "reduzir movimento" do aparelho; "desligadas" também
 * serve para aparelho fraco (menos trabalho de pintura). Fica no localStorage e vira `data-animacoes` no <html>
 * antes da primeira pintura (ver SCRIPT_ANIMACOES); o CSS e o Motion leem dali.
 */
export type PreferenciaAnimacoes = "sistema" | "ligadas" | "desligadas";

export const CHAVE_ANIMACOES = "jabuti-animacoes";

export function lerPreferencia(valor: string | null | undefined): PreferenciaAnimacoes {
  return valor === "ligadas" || valor === "desligadas" ? valor : "sistema";
}

/** Roda no <head> antes de pintar: sem ele a página piscaria com animação e só depois desligaria. */
export const SCRIPT_ANIMACOES = `try{var p=localStorage.getItem(${JSON.stringify(CHAVE_ANIMACOES)});if(p==="ligadas"||p==="desligadas")document.documentElement.dataset.animacoes=p}catch(e){}`;
