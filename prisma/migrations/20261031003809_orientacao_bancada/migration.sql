-- CreateTable
CREATE TABLE "Orientacao" (
    "votacaoId" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "orientacao" TEXT NOT NULL,
    "tipo" "TipoVoto",

    CONSTRAINT "Orientacao_pkey" PRIMARY KEY ("votacaoId","sigla")
);

-- CreateTable
CREATE TABLE "PatrimonioEleicao" (
    "parlamentarId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "sqCandidato" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "uf" "Uf" NOT NULL,
    "municipio" TEXT,
    "partido" TEXT NOT NULL,
    "resultado" TEXT,
    "totalBens" DECIMAL(18,2) NOT NULL,
    "quantidadeBens" INTEGER NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatrimonioEleicao_pkey" PRIMARY KEY ("parlamentarId","ano")
);

-- AddForeignKey
ALTER TABLE "Orientacao" ADD CONSTRAINT "Orientacao_votacaoId_fkey" FOREIGN KEY ("votacaoId") REFERENCES "Votacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonioEleicao" ADD CONSTRAINT "PatrimonioEleicao_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
