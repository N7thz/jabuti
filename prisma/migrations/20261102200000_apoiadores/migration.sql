-- CreateTable
CREATE TABLE "Apoiador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Apoiador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Apoiador_criadoEm_idx" ON "Apoiador"("criadoEm");
