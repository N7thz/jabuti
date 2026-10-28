"use client";

import { BookOpenIcon, LandmarkIcon, MapIcon, SearchIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

// `cor`: acento da seção no ícone (ver "Cores das seções" no DESIGN.md); o nome continua em texto.
const LINKS = [
  { href: "/", label: "Consulta CNPJ", icon: SearchIcon, cor: "text-secao-empresas" },
  { href: "/parlamentares", label: "Parlamentares", icon: UsersIcon, cor: "text-secao-parlamentares" },
  { href: "/estados", label: "Estados e cidades", icon: MapIcon, cor: "text-secao-cidades" },
  { href: "/orcamento", label: "Orçamento", icon: LandmarkIcon, cor: "text-secao-orcamento" },
  { href: "/glossario", label: "Entenda os termos", icon: BookOpenIcon, cor: "text-secao-glossario" },
] as const;

type NavLink = (typeof LINKS)[number];

function NavButton({ href, label, icon: Icon, cor, active }: NavLink & { active: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuButton
      isActive={active}
      tooltip={label}
      render={
        <Link href={href} aria-current={active ? "page" : undefined} onClick={() => isMobile && setOpenMobile(false)} />
      }
    >
      <Icon aria-hidden="true" className={cor} />
      <span>{label}</span>
    </SidebarMenuButton>
  );
}

function NavButtonComRota(link: NavLink) {
  const pathname = usePathname();
  const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
  return <NavButton {...link} active={active} />;
}

/** `fixados`: grupo pessoal de quem está logado, lido no servidor e passado pronto pelo layout. */
export function AppSidebar({ fixados }: { fixados?: React.ReactNode }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    // Mesmo cartão da navbar flutuante: branco, raio de 16px e sombra leve (DESIGN.md).
    <Sidebar
      variant="floating"
      collapsible="icon"
      className="*:data-[slot=sidebar-inner]:rounded-2xl *:data-[slot=sidebar-inner]:shadow-lift *:data-[slot=sidebar-inner]:ring-border"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Portal da Transparência"
              render={<Link href="/" onClick={() => isMobile && setOpenMobile(false)} />}
            >
              <span className="flex size-8 shrink-0 items-center justify-center" aria-hidden="true">
                <span className="size-3 rounded-full bg-primary shadow-soft" />
              </span>
              <span className="font-bold tracking-tight">Portal da Transparência</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Consultas</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Principal">
              <SidebarMenu>
                {LINKS.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    {/* Só o destaque do link ativo depende da URL; o resto da sidebar entra no shell estático. */}
                    <Suspense fallback={<NavButton {...link} active={false} />}>
                      <NavButtonComRota {...link} />
                    </Suspense>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
        {fixados}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
