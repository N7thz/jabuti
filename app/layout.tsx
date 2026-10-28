import type { Metadata } from "next";
import { Barlow, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { GlossarioDaPagina } from "@/components/glossario-da-pagina";
import { SidebarFixados } from "@/components/sidebar-fixados";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/user-menu";

import "./globals.css";

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
  title: "Portal da Transparência",
  description: "Consultas à API de dados do Portal da Transparência",
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
        {/* nuqs: estado de filtros na URL, para o link sempre reproduzir a mesma consulta. */}
        <NuqsAdapter>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <a
              href="#conteudo"
              className="sr-only rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-lift outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Pular para o conteúdo principal
            </a>

            <TooltipProvider>
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
                        className="flex h-10 min-w-0 items-center gap-2 rounded-lg font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
                      >
                        <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-primary shadow-soft" />
                        {/* Abaixo de 375px some "Portal da" da tela, mas continua no nome do link. */}
                        <span className="truncate">
                          <span className="max-xs:sr-only">Portal da </span>Transparência
                        </span>
                      </Link>
                      <div className="ml-auto flex shrink-0 items-center gap-1 xs:gap-2">
                        <ThemeToggle />
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
                </div>
              </SidebarProvider>
            </TooltipProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
