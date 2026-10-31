import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Zero violações WCAG 2 A e AA (axe) nas páginas principais, nos temas claro e escuro.

const PAGINAS = [
  ["início", "/"],
  ["consulta CNPJ", "/empresas"],
  ["parlamentares", "/parlamentares"],
  ["estados", "/estados"],
  ["orçamento", "/orcamento"],
  ["glossário", "/glossario"],
  ["perfil de deputado", "/parlamentares/deputado/204379"],
  ["perfil de senador", "/parlamentares/senador/5672"],
  ["votação da Câmara", "/votacoes/camara/2497990-25"],
  ["votação do Senado", "/votacoes/senado/6953"],
  ["comparar", "/comparar?a=camara-204511&b=camara-221328"],
  ["ranking da cota", "/rankings/cota"],
  ["leis e projetos", "/leis"],
  ["projetos prontos para votar", "/leis?etapa=plenario"],
] as const;

for (const tema of ["light", "dark"] as const) {
  test.describe(`tema ${tema === "light" ? "claro" : "escuro"}`, () => {
    test.beforeEach(async ({ page }) => {
      // next-themes lê o localStorage "theme"; o colorScheme cobre o padrão "system".
      // Sem animação: o axe mediria o contraste de cards ainda no meio do fade de entrada.
      await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" });
      await page.addInitScript((t) => localStorage.setItem("theme", t), tema);
    });

    for (const [nome, rota] of PAGINAS) {
      test(nome, async ({ page }) => {
        const resposta = await page.goto(rota);
        expect(resposta?.ok(), `${rota} respondeu ${resposta?.status()}`).toBe(true);
        // Espera os <Suspense> terminarem de chegar.
        await page.waitForLoadState("networkidle");
        await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${tema}\\b`));

        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        const resumo = violations.map((v) => ({
          regra: v.id,
          impacto: v.impact,
          ajuda: v.help,
          alvos: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
        }));
        expect(resumo, JSON.stringify(resumo, null, 2)).toEqual([]);
      });
    }
  });
}
