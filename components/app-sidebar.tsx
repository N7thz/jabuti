"use client";

import { BookOpenIcon, ChartNoAxesColumnIcon, CircleHelpIcon, GitCompareArrowsIcon, HeartHandshakeIcon, LandmarkIcon, MapIcon, MessageSquareTextIcon, ScrollTextIcon, SearchIcon, SettingsIcon, UsersIcon, WalletIcon } from "lucide-react";
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
import { useAbrirApoio } from "@/components/apoio/dialog-apoio";
import { LogoJabuti } from "@/components/logo-jabuti";
import { PersonalizarMenu } from "@/components/personalizar-menu";
import type { AssuntoOpcional } from "@/lib/menu";

// `cor`: acento da seção no ícone (ver "Cores das seções" no DESIGN.md); o nome continua em texto.
// `opcional`: assunto que só aparece se a pessoa ligar em "Personalizar menu" (lib/menu.ts).
const LINKS = [
  { href: "/empresas", label: "Consulta CNPJ", icon: SearchIcon, cor: "text-secao-empresas", opcional: "cnpj" },
  { href: "/parlamentares", label: "Parlamentares", icon: UsersIcon, cor: "text-secao-parlamentares", opcional: null },
  { href: "/comparar", label: "Comparar parlamentares", icon: GitCompareArrowsIcon, cor: "text-secao-parlamentares", opcional: "comparar" },
  { href: "/rankings/cota", label: "Ranking da cota", icon: ChartNoAxesColumnIcon, cor: "text-secao-parlamentares", opcional: "ranking" },
  { href: "/leis", label: "Leis e projetos", icon: ScrollTextIcon, cor: "text-secao-parlamentares", opcional: null },
  { href: "/estados", label: "Estados e cidades", icon: MapIcon, cor: "text-secao-cidades", opcional: null },
  { href: "/orcamento", label: "Emendas no orçamento", icon: LandmarkIcon, cor: "text-secao-orcamento", opcional: "emendas" },
  { href: "/orcamento/loa", label: "Orçamento federal (LOA)", icon: WalletIcon, cor: "text-secao-orcamento", opcional: "loa" },
  { href: "/glossario", label: "Entenda os termos", icon: BookOpenIcon, cor: "text-secao-glossario", opcional: "glossario" },
] as const satisfies readonly ({ opcional: AssuntoOpcional | null } & Record<string, unknown>)[];

type NavLink = (typeof LINKS)[number];

type Botao = Pick<NavLink, "icon" | "cor"> & { href: string; label: string };

function NavButton({ href, label, icon: Icon, cor, active }: Botao & { active: boolean }) {
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

function NavButtonComRota(link: Botao) {
  const pathname = usePathname();
  // Rotas aninhadas (/orcamento e /orcamento/loa): só o link mais específico fica ativo.
  const casa = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const active = casa(link.href) && !LINKS.some((l) => l.href.length > link.href.length && casa(l.href));
  return <NavButton {...link} active={active} />;
}

const FEEDBACK = { label: "Sugestões e problemas", icon: MessageSquareTextIcon, cor: "text-secao-glossario" } as const;

const AJUDA = { href: "/ajuda", label: "Ajuda", icon: CircleHelpIcon, cor: "text-secao-glossario" } as const;

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

/** "Apoie o projeto": abre o dialog de apoio (ApoioProvider, no layout); sem JavaScript, o link leva a /apoie. */
function ApoioComRota() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const abrirApoio = useAbrirApoio();
  const active = pathname === "/apoie";
  return (
    <SidebarMenuButton
      isActive={active}
      tooltip="Apoie o projeto"
      render={
        <Link
          href="/apoie"
          aria-haspopup="dialog"
          aria-current={active ? "page" : undefined}
          onClick={(e) => {
            abrirApoio(e);
            if (isMobile) setOpenMobile(false);
          }}
        />
      }
    >
      <HeartHandshakeIcon aria-hidden="true" className="text-secao-glossario" />
      <span>Apoie o projeto</span>
    </SidebarMenuButton>
  );
}

/**
 * `fixados`: grupo pessoal de quem está logado; `admin`: grupo só de admin.
 * Os dois são lidos no servidor e passados prontos pelo layout.
 */
export function AppSidebar({ fixados, admin }: { fixados?: React.ReactNode; admin?: React.ReactNode }) {
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
                {LINKS.map(({ opcional, ...link }) => (
                  <SidebarMenuItem key={link.href} data-menu-opcional={opcional ?? undefined}>
                    {/* Só o destaque do link ativo depende da URL; o resto da sidebar entra no shell estático. */}
                    <Suspense fallback={<NavButton {...link} active={false} />}>
                      <NavButtonComRota {...link} />
                    </Suspense>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <PersonalizarMenu />
                </SidebarMenuItem>
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
        {fixados}
        {admin}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Suspense fallback={<NavButton href="/apoie" label="Apoie o projeto" icon={HeartHandshakeIcon} cor="text-secao-glossario" active={false} />}>
              <ApoioComRota />
            </Suspense>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Suspense fallback={<NavButton {...AJUDA} active={false} />}>
              <NavButtonComRota {...AJUDA} />
            </Suspense>
          </SidebarMenuItem>
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
