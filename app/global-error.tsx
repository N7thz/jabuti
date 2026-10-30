"use client";

import { useEffect } from "react";

import { ErroDaPagina } from "@/components/erro-da-pagina";

import "./globals.css";

// Substitui o layout raiz quando ele mesmo falha: precisa do próprio <html>, dos estilos e do tema.
export default function ErroGeral(props: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Mesma regra do next-themes (chave "theme"), já que o ThemeProvider do layout não está aqui.
    try {
      const tema = localStorage.getItem("theme");
      const escuro = tema === "dark" || (tema !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", escuro);
    } catch {}
  }, []);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-background text-foreground antialiased">
        <title>Erro · Jabuti</title>
        <main className="flex flex-1 flex-col">
          <ErroDaPagina {...props} />
        </main>
      </body>
    </html>
  );
}
