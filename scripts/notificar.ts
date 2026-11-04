/**
 * Gera as notificações de quem segue parlamentares e projetos. Elas ficam só dentro do portal, em /notificacoes
 * e no sino do cabeçalho. Roda depois da carga diária da Câmara e do Senado (.github/workflows/sync.yml).
 *
 *   bun scripts/notificar.ts
 *
 * Pode rodar quantas vezes quiser: cada acontecimento vira no máximo uma notificação por pessoa.
 */
import { createCamaraClient } from "../lib/camara/client";
import { gerarNotificacoes } from "../lib/notificacoes/gerar";
import { createPrisma } from "../lib/prisma";
import { createSenadoClient } from "../lib/senado/client";

async function main() {
  const argumentos = process.argv.slice(2);
  if (argumentos.length > 0) throw new Error(`Argumento desconhecido: ${argumentos.join(" ")}`);

  const prisma = createPrisma();
  const log = (mensagem: string) => console.log(mensagem);
  try {
    await gerarNotificacoes({ prisma, camara: createCamaraClient({ minIntervalMs: 150 }), senado: createSenadoClient(), log });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
