import { expect, test } from "@playwright/test";

// Navegação entre anos: links comuns (funcionam sem JavaScript) e o ano corrente marcado como "até o momento".

const anoCorrente = new Date().getUTCFullYear();

test("emendas do estado: o ano corrente vem primeiro, como até o momento, e dá para ir a outro ano", async ({ page }) => {
  await page.goto("/estados/SP");
  const nav = page.getByRole("navigation", { name: "Emendas: escolha o ano" });
  const atual = nav.getByRole("link", { name: new RegExp(`${anoCorrente}.*até o momento`) });
  await expect(atual).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(`${anoCorrente} até o momento:`)).toBeVisible();

  await nav.getByRole("link", { name: String(anoCorrente - 1), exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`ano=${anoCorrente - 1}`));
  await expect(nav.getByRole("link", { name: String(anoCorrente - 1), exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(`Dados de janeiro a dezembro de ${anoCorrente - 1}.`)).toBeVisible();
});

test("perfil do deputado: o ano da URL vale para o resumo e a cota", async ({ page }) => {
  await page.goto(`/parlamentares/deputado/204379?ano=${anoCorrente - 1}`);
  await expect(page.getByRole("heading", { name: "Ano dos dados" })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Resumo de ${anoCorrente - 1}`, exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(new RegExp(`Gastos de ${anoCorrente - 1} da`))).toBeVisible({ timeout: 30_000 });
});

test("ano fora da lista cai no ano corrente", async ({ page }) => {
  await page.goto("/estados/SP?ano=1990");
  await expect(
    page.getByRole("navigation", { name: "Emendas: escolha o ano" }).getByRole("link", { name: new RegExp(`${anoCorrente}`) }),
  ).toHaveAttribute("aria-current", "page");
});
