"use client";

import { BookOpenIcon, ChartNoAxesColumnIcon, GitCompareArrowsIcon, LandmarkIcon, MapIcon, MessageSquareTextIcon, ScrollTextIcon, SearchIcon, SettingsIcon, UsersIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { LogoJabuti } from "@/components/logo-jabuti";

// `cor`: acento da seção no ícone (ver "Cores das seções" no DESIGN.md); o nome continua em texto.
const LINKS = [
  { href: "/empresas", label: "Consulta CNPJ", icon: SearchIcon, cor: "text-secao-empresas" },
  { href: "/parlamentares", label: "Parlamentares", icon: UsersIcon, cor: "text-secao-parlamentares" },
  { href: "/comparar", label: "Comparar parlamentares", icon: GitCompareArrowsIcon, cor: "text-secao-parlamentares" },
  { href: "/rankings/cota", label: "Ranking da cota", icon: ChartNoAxesColumnIcon, cor: "text-secao-parlamentares" },
  { href: "/leis", label: "Leis e projetos", icon: ScrollTextIcon, cor: "text-secao-parlamentares" },
  { href: "/estados", label: "Estados e cidades", icon: MapIcon, cor: "text-secao-cidades" },
  { href: "/orcamento", label: "Emendas no orçamento", icon: LandmarkIcon, cor: "text-secao-orcamento" },
  { href: "/orcamento/loa", label: "Orçamento federal (LOA)", icon: WalletIcon, cor: "text-secao-orcamento" },
  { href: "/glossario", label: "Entenda os termos", icon: BookOpenIcon, cor: "text-secao-glossario" },
] as const;

type NavLink = (typeof LINKS)[number];

function NavButton({ href, label, icon: Icon, cor, active }: Omit<NavLink, "href" | "label"> & { href: string; label: string; active: boolean }) {
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

function NavButtonComRota(link: Omit<NavLink, "href" | "label"> & { href: string; label: string }) {
  const pathname = usePathname();
  // Rotas aninhadas (/orcamento e /orcamento/loa): só o link mais específico fica ativo.
  const casa = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const active = casa(link.href) && !LINKS.some((l) => l.href.length > link.href.length && casa(l.href));
  return <NavButton {...link} active={active} />;
}

const FEEDBACK = { label: "Sugestões e problemas", icon: MessageSquareTextIcon, cor: "text-secao-glossario" } as const;

const CONFIGURACOES = {
  href: "/configuracoes",
  label: "Configurações",
  icon: SettingsIcon,
  cor: "text-secao-glossario",
} as const;

/** Leva a página atual em `?de=`, para a mensagem chegar dizendo de onde a pessoa estava falando. */
function FeedbackComRota() {
  const pathname = usePathname();
  const href = pathname.startsWith("/feedback") ? "/feedback" : `/feedback?de=${encodeURIComponent(pathname)}`;
  return <NavButton {...FEEDBACK} href={href} active={pathname.startsWith("/feedback")} />;
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
              tooltip="Jabuti"
              render={<Link href="/" onClick={() => isMobile && setOpenMobile(false)} />}
            >
              <LogoJabuti className="shrink-0" />
              <span className="font-bold tracking-tight">Jabuti</span>
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Suspense fallback={<NavButton {...FEEDBACK} href="/feedback" active={false} />}>
              <FeedbackComRota />
            </Suspense>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Suspense fallback={<NavButton {...CONFIGURACOES} active={false} />}>
              <NavButtonComRota {...CONFIGURACOES} />
            </Suspense>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
