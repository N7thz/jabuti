import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Barlow, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";

import { AnimacoesProvider } from "@/components/animacoes-provider";
import { ApoioProvider } from "@/components/apoio/dialog-apoio";
import { AppSidebar } from "@/components/app-sidebar";
import { GlossarioDaPagina } from "@/components/glossario-da-pagina";
import { GuiaSecoes } from "@/components/guia-secoes";
import { RevelarAoRolar } from "@/components/revelar-ao-rolar";
import { LogoJabuti } from "@/components/logo-jabuti";
import { SeloBeta } from "@/components/selo-beta";
import { SidebarFixados } from "@/components/sidebar-fixados";
import { SinoNotificacoes } from "@/components/sino-notificacoes";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/user-menu";

import { SCRIPT_ACESSIBILIDADE } from "@/lib/acessibilidade";
import { apoioPublico } from "@/lib/apoio/config";
import { SCRIPT_ANIMACOES } from "@/lib/animacoes";
import { SCRIPT_MENU } from "@/lib/menu";
import { verbete } from "@/lib/glossario";
import { metadados } from "@/lib/metadados";
import { SITE_URL } from "@/lib/site";

import "./globals.css";
import "./acessibilidade.css";

// Barlow no texto, Instrument Serif itálico só como destaque em títulos (DESIGN.md); JetBrains Mono para valores técnicos.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  // Título, descrição e prévia do link (openGraph/twitter) vêm de metadados(); cada página monta os seus.
  ...metadados({ titulo: "Jabuti" }),
  applicationName: "Jabuti",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      // Next 16: na troca de rota o scroll volta ao topo sem animação; o smooth fica só para âncoras.
      data-scroll-behavior="smooth"
      className={`${barlow.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        {/* Preferência de animações no <html> antes de pintar (ver lib/animacoes.ts). */}
        <Script id="animacoes" strategy="beforeInteractive">
          {SCRIPT_ANIMACOES}
        </Script>
        {/* Tamanho do texto e espaçamento escolhidos em /configuracoes (ver lib/acessibilidade.ts). */}
        <Script id="preferencias-leitura" strategy="beforeInteractive">
          {SCRIPT_ACESSIBILIDADE}
        </Script>
        {/* Assuntos opcionais do menu lateral escolhidos em "Personalizar menu" (ver lib/menu.ts). */}
        <Script id="menu" strategy="beforeInteractive">
          {SCRIPT_MENU}
        </Script>
        {/* nuqs: estado de filtros na URL, para o link sempre reproduzir a mesma consulta. */}
        <NuqsAdapter>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AnimacoesProvider>
              <a
                href="#conteudo"
                className="sr-only rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-lift outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Pular para o conteúdo principal
              </a>

              <TooltipProvider>
                {/* Dialog "Apoie o Jabuti": fora da sidebar, que fecha no celular ao abri-lo. */}
                <ApoioProvider apoio={apoioPublico()}>
                <SidebarProvider>
                  <AppSidebar
                    fixados={
                      <Suspense fallback={null}>
                        <SidebarFixados />
                      </Suspense>
                    }
                  />

                  <div className="flex min-w-0 flex-1 flex-col">
                    {/* z-40: abaixo dos menus (z-50) que abrem a partir do próprio header. */}
                    {/* Navbar branca flutuante do Logoisum: respiro de p-2, raio de 16px e sombra leve. */}
                    {/* Celular deitado: o header rola junto para não roubar a pouca altura da tela. */}
                    <header className="sticky top-0 z-40 p-2 md:pl-0 deitado:static">
                      <div className="flex h-14 w-full items-center gap-1 rounded-2xl bg-card/90 px-2 text-sm font-medium shadow-lift ring-1 ring-border backdrop-blur-md xs:gap-2">
                        <SidebarTrigger className="size-10 shrink-0" />
                        <Separator orientation="vertical" className="data-vertical:h-5 data-vertical:self-center" />
                        <Link
                          href="/"
                          className="flex h-10 min-w-0 items-center gap-2 rounded-lg font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <LogoJabuti className="shrink-0" />
                          <span className="truncate">Jabuti</span>
                        </Link>
                        {/* Aviso de que o portal ainda está em testes; o balão explica e leva ao glossário. */}
                        <SeloBeta termo={verbete("beta").termo} curto={verbete("beta").curto} />
                        <div className="ml-auto flex shrink-0 items-center gap-1 xs:gap-2">
                          <ThemeToggle />
                          {/* Lê a sessão: só aparece para quem está logado. */}
                          <Suspense fallback={null}>
                            <SinoNotificacoes />
                          </Suspense>
                          <Suspense fallback={<Skeleton className="h-10 w-24 sm:w-40" />}>
                            <UserMenu />
                          </Suspense>
                        </div>
                      </div>
                    </header>

                    <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col outline-none animate-page">
                      {children}
                      <GlossarioDaPagina />
                    </main>
                    <GuiaSecoes />
                    <RevelarAoRolar />
                  </div>
                </SidebarProvider>
                </ApoioProvider>
              </TooltipProvider>
            </AnimacoesProvider>
          </ThemeProvider>
        </NuqsAdapter>
        {/* Contagem de visitas e medida de velocidade da Vercel: sem cookies e sem dado pessoal. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
