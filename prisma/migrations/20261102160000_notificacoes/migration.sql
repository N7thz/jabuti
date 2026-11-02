-- CreateEnum
CREATE TYPE "TipoSeguido" AS ENUM ('PARLAMENTAR', 'LEI');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('VOTO', 'PROPOSICAO', 'LEI');

-- CreateEnum
CREATE TYPE "FrequenciaEmail" AS ENUM ('NUNCA', 'DIARIO', 'SEMANAL');

-- CreateTable
CREATE TABLE "Seguido" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "tipo" "TipoSeguido" NOT NULL,
    "chave" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT,

    CONSTRAINT "Seguido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "evento" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "url" TEXT,
    "ocorridoEm" TIMESTAMP(3) NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lidaEm" TIMESTAMP(3),
    "enviadaEm" TIMESTAMP(3),

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferenciaNotificacao" (
    "usuario" TEXT NOT NULL,
    "email" "FrequenciaEmail" NOT NULL DEFAULT 'NUNCA',
    "ultimoEnvio" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferenciaNotificacao_pkey" PRIMARY KEY ("usuario")
);

-- CreateIndex
CREATE INDEX "Seguido_tipo_chave_idx" ON "Seguido"("tipo", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "Seguido_usuario_tipo_chave_key" ON "Seguido"("usuario", "tipo", "chave");

-- CreateIndex
CREATE INDEX "Notificacao_usuario_criadaEm_idx" ON "Notificacao"("usuario", "criadaEm");

-- CreateIndex
CREATE INDEX "Notificacao_usuario_lidaEm_idx" ON "Notificacao"("usuario", "lidaEm");

-- CreateIndex
CREATE UNIQUE INDEX "Notificacao_usuario_evento_key" ON "Notificacao"("usuario", "evento");
