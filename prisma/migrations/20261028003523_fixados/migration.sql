-- CreateEnum
CREATE TYPE "TipoFixado" AS ENUM ('PARLAMENTAR', 'PARTIDO', 'BANCADA');

-- CreateTable
CREATE TABLE "Fixado" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "tipo" "TipoFixado" NOT NULL,
    "chave" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fixado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fixado_usuario_tipo_chave_key" ON "Fixado"("usuario", "tipo", "chave");
