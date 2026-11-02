/**
 * Gera as notificações de quem segue parlamentares e projetos e manda os resumos por email que estão na hora.
 * Roda depois da carga diária da Câmara e do Senado (.github/workflows/sync.yml).
 *
 *   bun scripts/notificar.ts [--sem-email]
 *
 * Os resumos por email só saem com NOTIFICACOES_POR_EMAIL=1 (ver lib/notificacoes/email.ts).
 *
 * Pode rodar quantas vezes quiser: cada acontecimento vira no máximo uma notificação por pessoa, e o
 * resumo respeita o intervalo escolhido (diário ou semanal).
 */
import { createCamaraClient } from "../lib/camara/client";
import { emailLigado, enviarResumos } from "../lib/notificacoes/email";
import { gerarNotificacoes } from "../lib/notificacoes/gerar";
import { createPrisma } from "../lib/prisma";
import { createSenadoClient } from "../lib/senado/client";

async function main() {
  const argumentos = process.argv.slice(2);
  const desconhecidos = argumentos.filter((a) => a !== "--sem-email");
  if (desconhecidos.length > 0) throw new Error(`Argumento desconhecido: ${desconhecidos.join(" ")}`);

  const prisma = createPrisma();
  const log = (mensagem: string) => console.log(mensagem);
  try {
    await gerarNotificacoes({ prisma, camara: createCamaraClient({ minIntervalMs: 150 }), senado: createSenadoClient(), log });
    if (!emailLigado()) log("resumos por email desligados (NOTIFICACOES_POR_EMAIL != 1)");
    else if (!argumentos.includes("--sem-email")) await enviarResumos(prisma, { log });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
