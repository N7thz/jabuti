"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// O next-themes 0.4.6 renderiza um <script> que aplica o tema antes da hidratação. No servidor ele precisa ser
// executável; no cliente o React 19 avisa "Encountered a script tag" ao renderizá-lo. Marcar como
// application/json só no cliente cala o aviso sem mudar nada: lá o script nunca roda mesmo
// (o <script> tem suppressHydrationWarning, então a diferença de type não acusa erro de hidratação).
const scriptProps = typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

export function ThemeProvider(props: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider scriptProps={scriptProps} {...props} />;
}
