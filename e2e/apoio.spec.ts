import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Dialog "Apoie o projeto" e Pix. Os testes do Pix só rodam com APOIO_PIX_* configurado no servidor.

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("o link do menu abre o dialog sem sair da página e fecha com Esc", async ({ page }) => {
  await page.goto("/glossario");
  // Antes de hidratar, o clique segue o link para /apoie (o fallback sem JavaScript).
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Apoie o projeto" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Apoie o Jabuti" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/glossario$/);

  const { violations } = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("sem JavaScript, o link leva para /apoie", async ({ browser }) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexto.newPage();
  await page.goto("/glossario");
  // Antes de hidratar, o clique segue o link para /apoie (o fallback sem JavaScript).
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Apoie o projeto" }).first().click();
  await expect(page).toHaveURL(/\/apoie$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dados públicos");
  await contexto.close();
});

test("Pix: escolher um valor refaz o copia e cola com o valor", async ({ page }) => {
  await page.goto("/apoie");
  const pix = page.getByRole("region", { name: "Doar por Pix" });
  test.skip((await pix.count()) === 0, "Pix não configurado no servidor (APOIO_PIX_*).");

  const codigo = pix.getByLabel(/Pix copia e cola/);
  await expect(codigo).toHaveValue(/^000201.*6304[0-9A-F]{4}$/);
  await expect(codigo).not.toHaveValue(/5405/);

  await pix.getByText("R$ 25").click();
  await expect(codigo).toHaveValue(/540525\.00/);
  await expect(pix.getByRole("img", { name: /QR Code do Pix de R\$\s25/ })).toBeVisible();

  await pix.getByText("Outro valor").click();
  await pix.getByLabel("Valor em reais").fill("15,50");
  await expect(codigo).toHaveValue(/540515\.50/);
});

test("Pix no dialog: tela do Pix e volta", async ({ page }) => {
  await page.goto("/glossario");
  // Antes de hidratar, o clique segue o link para /apoie (o fallback sem JavaScript).
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Apoie o projeto" }).first().click();
  const dialog = page.getByRole("dialog");
  const botaoPix = dialog.getByRole("button", { name: /Doar por Pix/ });
  test.skip((await botaoPix.count()) === 0, "Pix não configurado no servidor (APOIO_PIX_*).");

  await botaoPix.click();
  await expect(dialog.getByRole("heading", { name: "Doar por Pix" })).toBeVisible();
  await expect(dialog.getByLabel(/Pix copia e cola/)).toHaveValue(/^000201/);
  await dialog.getByRole("button", { name: "Outras formas de apoiar" }).click();
  await expect(dialog.getByRole("heading", { name: "Apoie o Jabuti" })).toBeVisible();
});
