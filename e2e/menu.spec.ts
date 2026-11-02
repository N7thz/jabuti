import { expect, test } from "@playwright/test";

// Menu lateral personalizável: Parlamentares, Leis e Estados sempre; o resto a pessoa liga.

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("o menu começa só com os assuntos padrão e a escolha fica salva", async ({ page }) => {
  await page.goto("/parlamentares");
  const menu = page.getByRole("navigation", { name: "Principal" });
  for (const nome of ["Parlamentares", "Leis e projetos", "Estados e cidades"]) {
    await expect(menu.getByRole("link", { name: nome })).toBeVisible();
  }
  await expect(menu.getByRole("link", { name: "Comparar parlamentares" })).toBeHidden();

  await page.waitForLoadState("networkidle");
  await menu.getByRole("button", { name: "Personalizar menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Personalizar menu" });
  await dialog.getByRole("checkbox", { name: /Comparar parlamentares/ }).check();
  await dialog.getByRole("button", { name: "Pronto" }).click();
  await expect(menu.getByRole("link", { name: "Comparar parlamentares" })).toBeVisible();

  await page.reload();
  await expect(menu.getByRole("link", { name: "Comparar parlamentares" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Ranking da cota" })).toBeHidden();
});

test("a página aberta aparece no menu mesmo sem estar ligada", async ({ page }) => {
  await page.goto("/glossario");
  const menu = page.getByRole("navigation", { name: "Principal" });
  await expect(menu.getByRole("link", { name: "Entenda os termos" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Consulta CNPJ" })).toBeHidden();
});
