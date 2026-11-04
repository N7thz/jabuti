import { initBotId } from "botid/client/core";

import { ROTAS_PROTEGIDAS } from "@/lib/bot-rotas";

// Vercel BotID: anexa o sinal de "é gente" aos envios dos formulários de conta e de feedback (ver lib/bot.ts).
initBotId({ protect: ROTAS_PROTEGIDAS.map((path) => ({ path, method: "POST" })) });
