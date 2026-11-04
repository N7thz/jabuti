/**
 * Páginas cujos formulários a Vercel BotID vigia. O envio de uma Server Action é um POST para a própria
 * página, então o caminho protegido é o da página. Fica fora de lib/bot.ts porque o navegador também lê
 * (instrumentation-client.ts).
 */
export const ROTAS_PROTEGIDAS = ["/entrar", "/cadastrar", "/recuperar-senha", "/redefinir-senha", "/feedback"] as const;
