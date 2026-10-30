import { defineConfig, devices } from "@playwright/test";

const PORTA = Number(process.env.PORTA_E2E ?? 3000);
const URL_BASE = `http://localhost:${PORTA}`;

// Teste de acessibilidade (bun run test:a11y). Usa o servidor que já estiver no ar nessa porta
// ou sobe o `bun dev`; as páginas precisam do banco e das chaves do .env.local.
export default defineConfig({
  testDir: "e2e",
  // Páginas pesadas no primeiro acesso do dev (compilação + APIs oficiais).
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: URL_BASE,
    locale: "pt-BR",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `bun dev --port ${PORTA}`,
    url: URL_BASE,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
