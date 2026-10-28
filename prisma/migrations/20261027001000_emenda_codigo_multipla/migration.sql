-- AlterEnum
ALTER TYPE "AbrangenciaEmenda" ADD VALUE 'MULTIPLA';

-- AlterTable
ALTER TABLE "Emenda" ADD COLUMN     "codigoEmenda" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Emenda_codigoEmenda_idx" ON "Emenda"("codigoEmenda");

