"use client";

import { MonitorIcon, MoonIcon, SparklesIcon, SunIcon, ZapIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { useAnimacoes } from "@/components/animacoes-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { lerPreferencia } from "@/lib/animacoes";

/** Menu de aparência do header: tema e animações (desligar deixa o site mais leve em aparelho simples). */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { preferencia, setPreferencia } = useAnimacoes();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Aparência: tema e animações" />}>
        <SunIcon aria-hidden="true" className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <MoonIcon aria-hidden="true" className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tema</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">
              <SunIcon />
              Claro
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <MoonIcon />
              Escuro
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <MonitorIcon />
              Sistema
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Animações</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={preferencia} onValueChange={(v: string) => setPreferencia(lerPreferencia(v))}>
            <DropdownMenuRadioItem value="ligadas">
              <SparklesIcon />
              Ligadas
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desligadas">
              <ZapIcon />
              Desligadas (mais leve)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="sistema">
              <MonitorIcon />
              Sistema
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
