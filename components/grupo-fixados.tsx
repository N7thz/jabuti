"use client";

import { Building2Icon, FlagIcon, MapPinIcon, PinIcon, UserIcon } from "lucide-react";
import Link from "next/link";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type ItemFixado = { href: string; rotulo: string; tipo: "parlamentar" | "partido" | "bancada" };

export type CidadeSidebar = { nome: string; uf: string };

const ICONE = { parlamentar: UserIcon, partido: FlagIcon, bancada: MapPinIcon } as const;
const TIPO = { parlamentar: "Parlamentar", partido: "Partido", bancada: "Bancada" } as const;

/**
 * Grupos pessoais da sidebar: "Minha cidade" (a de "Meus representantes", em /meu) e "Fixados".
 * Os dados vêm prontos do servidor (SidebarFixados), nunca de cache.
 */
export function GrupoFixados({ itens, cidade }: { itens: ItemFixado[]; cidade: CidadeSidebar | null }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const fechar = () => isMobile && setOpenMobile(false);

  return (
    <>
    <SidebarGroup>
      <SidebarGroupLabel>Minha cidade</SidebarGroupLabel>
      <SidebarGroupContent>
        <nav aria-label="Minha cidade">
          <SidebarMenu>
            <SidebarMenuItem>
              {cidade ? (
                <SidebarMenuButton
                  tooltip={`Minha cidade: ${cidade.nome} (${cidade.uf})`}
                  render={<Link href="/meu#representantes" onClick={fechar} />}
                >
                  <Building2Icon aria-hidden="true" className="text-secao-cidades" />
                  <span>
                    {cidade.nome} ({cidade.uf})
                  </span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  tooltip="Escolher minha cidade"
                  render={<Link href="/meu?trocar=1#representantes" onClick={fechar} />}
                >
                  <Building2Icon aria-hidden="true" className="text-secao-cidades" />
                  <span>Escolher minha cidade</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </nav>
      </SidebarGroupContent>
    </SidebarGroup>
    <SidebarGroup>
      <SidebarGroupLabel>Fixados</SidebarGroupLabel>
      <SidebarGroupContent>
        <nav aria-label="Fixados">
          <SidebarMenu>
            {itens.length === 0 ? (
              <li className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                Fixe parlamentares, partidos ou bancadas nos perfis e na lista para acessá-los daqui.
              </li>
            ) : (
              <>
                {itens.map((item) => {
                  const Icone = ICONE[item.tipo];
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        tooltip={`${TIPO[item.tipo]}: ${item.rotulo}`}
                        render={<Link href={item.href} onClick={fechar} />}
                      >
                        <Icone aria-hidden="true" className="text-secao-parlamentares" />
                        <span>{item.rotulo}</span>
                        <span className="sr-only"> ({TIPO[item.tipo].toLowerCase()})</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Só os fixados" render={<Link href="/parlamentares?fixados=1" onClick={fechar} />}>
                    <PinIcon aria-hidden="true" />
                    <span>Ver só os fixados</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </nav>
      </SidebarGroupContent>
    </SidebarGroup>
    </>
  );
}
