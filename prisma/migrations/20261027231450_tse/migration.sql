-- AlterEnum
ALTER TYPE "FonteSync" ADD VALUE 'TSE';

-- CreateTable
CREATE TABLE "Candidatura" (
    "id" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "sqCandidato" TEXT NOT NULL,
    "uf" "Uf" NOT NULL,
    "cargo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nomeUrna" TEXT NOT NULL,
    "partido" TEXT NOT NULL,
    "situacao" TEXT NOT NULL,
    "resultado" TEXT,
    "cpf" TEXT,
    "totalBens" DECIMAL(18,2) NOT NULL,
    "totalReceitas" DECIMAL(18,2) NOT NULL,
    "totalVotos" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BemDeclarado" (
    "candidaturaId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "BemDeclarado_pkey" PRIMARY KEY ("candidaturaId","ordem")
);

-- CreateTable
CREATE TABLE "ReceitaCampanha" (
    "id" TEXT NOT NULL,
    "candidaturaId" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "doador" TEXT NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "lancamentos" INTEGER NOT NULL,

    CONSTRAINT "ReceitaCampanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotoMunicipio" (
    "candidaturaId" TEXT NOT NULL,
    "municipioTse" INTEGER NOT NULL,
    "municipioIbge" INTEGER,
    "votos" INTEGER NOT NULL,

    CONSTRAINT "VotoMunicipio_pkey" PRIMARY KEY ("candidaturaId","municipioTse")
);

-- CreateIndex
CREATE INDEX "Candidatura_parlamentarId_ano_idx" ON "Candidatura"("parlamentarId", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "Candidatura_ano_sqCandidato_key" ON "Candidatura"("ano", "sqCandidato");

-- CreateIndex
CREATE INDEX "ReceitaCampanha_candidaturaId_valor_idx" ON "ReceitaCampanha"("candidaturaId", "valor");

-- CreateIndex
CREATE UNIQUE INDEX "ReceitaCampanha_candidaturaId_origem_fonte_doador_key" ON "ReceitaCampanha"("candidaturaId", "origem", "fonte", "doador");

-- CreateIndex
CREATE INDEX "VotoMunicipio_municipioIbge_idx" ON "VotoMunicipio"("municipioIbge");

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BemDeclarado" ADD CONSTRAINT "BemDeclarado_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "Candidatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceitaCampanha" ADD CONSTRAINT "ReceitaCampanha_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "Candidatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoMunicipio" ADD CONSTRAINT "VotoMunicipio_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "Candidatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
