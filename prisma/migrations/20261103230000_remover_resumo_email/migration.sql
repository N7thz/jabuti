-- O resumo de notificações por email saiu do portal: as notificações ficam só em /notificacoes e no sino.

-- AlterTable
ALTER TABLE "Notificacao" DROP COLUMN "enviadaEm";

-- DropTable
DROP TABLE "PreferenciaNotificacao";

-- DropEnum
DROP TYPE "FrequenciaEmail";
