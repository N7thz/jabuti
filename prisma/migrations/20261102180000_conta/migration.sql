-- CreateEnum
CREATE TYPE "TipoItemLista" AS ENUM ('VOTACAO', 'LEI', 'EMPRESA', 'EMENDA', 'PARLAMENTAR', 'PAGINA');

-- CreateTable
CREATE TABLE "PerfilUsuario" (
    "usuario" TEXT NOT NULL,
    "municipioIbge" INTEGER,
    "preferencias" JSONB,
    "painelVistoEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerfilUsuario_pkey" PRIMARY KEY ("usuario")
);

-- CreateTable
CREATE TABLE "Lista" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLista" (
    "id" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "tipo" "TipoItemLista" NOT NULL,
    "chave" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nota" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemLista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpresaVigiada" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "estado" TEXT,
    "checadaEm" TIMESTAMP(3),
    "mudouEm" TIMESTAMP(3),
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpresaVigiada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lista_usuario_idx" ON "Lista"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "ItemLista_listaId_tipo_chave_key" ON "ItemLista"("listaId", "tipo", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaVigiada_usuario_cnpj_key" ON "EmpresaVigiada"("usuario", "cnpj");

-- AddForeignKey
ALTER TABLE "ItemLista" ADD CONSTRAINT "ItemLista_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "Lista"("id") ON DELETE CASCADE ON UPDATE CASCADE;

