-- CreateEnum
CREATE TYPE "Casa" AS ENUM ('CAMARA', 'SENADO');

-- CreateEnum
CREATE TYPE "Uf" AS ENUM ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO');

-- CreateEnum
CREATE TYPE "TipoVoto" AS ENUM ('SIM', 'NAO', 'ABSTENCAO', 'OBSTRUCAO', 'ARTIGO_17', 'AUSENTE', 'AUSENCIA_JUSTIFICADA', 'OUTRO');

-- CreateEnum
CREATE TYPE "SituacaoPresenca" AS ENUM ('PRESENTE', 'AUSENTE', 'AUSENCIA_JUSTIFICADA');

-- CreateEnum
CREATE TYPE "AbrangenciaEmenda" AS ENUM ('MUNICIPIO', 'ESTADO', 'REGIAO', 'NACIONAL', 'EXTERIOR', 'NAO_INFORMADA');

-- CreateEnum
CREATE TYPE "FonteSync" AS ENUM ('CAMARA', 'SENADO', 'EMENDAS', 'MUNICIPIOS');

-- CreateEnum
CREATE TYPE "StatusSync" AS ENUM ('EXECUTANDO', 'SUCESSO', 'ERRO');

-- CreateTable
CREATE TABLE "Parlamentar" (
    "id" TEXT NOT NULL,
    "casa" "Casa" NOT NULL,
    "idExterno" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeCivil" TEXT,
    "nomeBusca" TEXT NOT NULL,
    "partido" TEXT,
    "uf" "Uf",
    "fotoUrl" TEXT,
    "email" TEXT,
    "emExercicio" BOOLEAN NOT NULL DEFAULT true,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parlamentar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Votacao" (
    "id" TEXT NOT NULL,
    "casa" "Casa" NOT NULL,
    "idExterno" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "orgaoSigla" TEXT,
    "aprovada" BOOLEAN,
    "resultado" TEXT,
    "proposicaoId" TEXT,

    CONSTRAINT "Votacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voto" (
    "votacaoId" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "tipo" "TipoVoto" NOT NULL,
    "votoOriginal" TEXT NOT NULL,
    "partido" TEXT,

    CONSTRAINT "Voto_pkey" PRIMARY KEY ("votacaoId","parlamentarId")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "casa" "Casa" NOT NULL,
    "idExterno" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "tipo" TEXT NOT NULL,
    "situacao" TEXT,
    "descricao" TEXT,
    "orgaoSigla" TEXT,
    "orgaoNome" TEXT,
    "local" TEXT,
    "url" TEXT,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presenca" (
    "eventoId" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "situacao" "SituacaoPresenca" NOT NULL,
    "justificativa" TEXT,

    CONSTRAINT "Presenca_pkey" PRIMARY KEY ("eventoId","parlamentarId")
);

-- CreateTable
CREATE TABLE "Proposicao" (
    "id" TEXT NOT NULL,
    "casa" "Casa" NOT NULL,
    "idExterno" TEXT NOT NULL,
    "siglaTipo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "ementa" TEXT NOT NULL,
    "dataApresentacao" TIMESTAMP(3),
    "situacao" TEXT,
    "url" TEXT,

    CONSTRAINT "Proposicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposicaoAutor" (
    "proposicaoId" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "proponente" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProposicaoAutor_pkey" PRIMARY KEY ("proposicaoId","parlamentarId")
);

-- CreateTable
CREATE TABLE "DespesaCota" (
    "id" TEXT NOT NULL,
    "parlamentarId" TEXT NOT NULL,
    "idExterno" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "tipoDespesa" TEXT NOT NULL,
    "fornecedor" TEXT,
    "cpfCnpjFornecedor" TEXT,
    "valorLiquido" DECIMAL(14,2) NOT NULL,
    "dataDocumento" TIMESTAMP(3),
    "urlDocumento" TEXT,

    CONSTRAINT "DespesaCota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Municipio" (
    "ibge" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeBusca" TEXT NOT NULL,
    "uf" "Uf" NOT NULL,

    CONSTRAINT "Municipio_pkey" PRIMARY KEY ("ibge")
);

-- CreateTable
CREATE TABLE "Emenda" (
    "codigo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" TEXT,
    "autorNome" TEXT NOT NULL,
    "parlamentarId" TEXT,
    "localidadeOriginal" TEXT,
    "abrangencia" "AbrangenciaEmenda" NOT NULL,
    "uf" "Uf",
    "municipioIbge" INTEGER,
    "funcao" TEXT,
    "subfuncao" TEXT,
    "valorEmpenhado" DECIMAL(18,2) NOT NULL,
    "valorLiquidado" DECIMAL(18,2) NOT NULL,
    "valorPago" DECIMAL(18,2) NOT NULL,
    "valorRestoInscrito" DECIMAL(18,2) NOT NULL,
    "valorRestoCancelado" DECIMAL(18,2) NOT NULL,
    "valorRestoPago" DECIMAL(18,2) NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Emenda_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "fonte" "FonteSync" NOT NULL,
    "escopo" TEXT,
    "status" "StatusSync" NOT NULL DEFAULT 'EXECUTANDO',
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" TIMESTAMP(3),
    "registros" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parlamentar_nomeBusca_idx" ON "Parlamentar"("nomeBusca");

-- CreateIndex
CREATE INDEX "Parlamentar_uf_casa_idx" ON "Parlamentar"("uf", "casa");

-- CreateIndex
CREATE UNIQUE INDEX "Parlamentar_casa_idExterno_key" ON "Parlamentar"("casa", "idExterno");

-- CreateIndex
CREATE INDEX "Votacao_data_idx" ON "Votacao"("data");

-- CreateIndex
CREATE UNIQUE INDEX "Votacao_casa_idExterno_key" ON "Votacao"("casa", "idExterno");

-- CreateIndex
CREATE INDEX "Voto_parlamentarId_tipo_idx" ON "Voto"("parlamentarId", "tipo");

-- CreateIndex
CREATE INDEX "Evento_inicio_idx" ON "Evento"("inicio");

-- CreateIndex
CREATE UNIQUE INDEX "Evento_casa_idExterno_key" ON "Evento"("casa", "idExterno");

-- CreateIndex
CREATE INDEX "Presenca_parlamentarId_situacao_idx" ON "Presenca"("parlamentarId", "situacao");

-- CreateIndex
CREATE INDEX "Proposicao_siglaTipo_numero_ano_idx" ON "Proposicao"("siglaTipo", "numero", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "Proposicao_casa_idExterno_key" ON "Proposicao"("casa", "idExterno");

-- CreateIndex
CREATE INDEX "ProposicaoAutor_parlamentarId_idx" ON "ProposicaoAutor"("parlamentarId");

-- CreateIndex
CREATE INDEX "DespesaCota_parlamentarId_ano_mes_idx" ON "DespesaCota"("parlamentarId", "ano", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "DespesaCota_parlamentarId_idExterno_key" ON "DespesaCota"("parlamentarId", "idExterno");

-- CreateIndex
CREATE INDEX "Municipio_nomeBusca_idx" ON "Municipio"("nomeBusca");

-- CreateIndex
CREATE UNIQUE INDEX "Municipio_uf_nomeBusca_key" ON "Municipio"("uf", "nomeBusca");

-- CreateIndex
CREATE INDEX "Emenda_uf_ano_idx" ON "Emenda"("uf", "ano");

-- CreateIndex
CREATE INDEX "Emenda_municipioIbge_ano_idx" ON "Emenda"("municipioIbge", "ano");

-- CreateIndex
CREATE INDEX "Emenda_parlamentarId_ano_idx" ON "Emenda"("parlamentarId", "ano");

-- CreateIndex
CREATE INDEX "Emenda_autorNome_idx" ON "Emenda"("autorNome");

-- CreateIndex
CREATE INDEX "SyncRun_fonte_iniciadoEm_idx" ON "SyncRun"("fonte", "iniciadoEm");

-- AddForeignKey
ALTER TABLE "Votacao" ADD CONSTRAINT "Votacao_proposicaoId_fkey" FOREIGN KEY ("proposicaoId") REFERENCES "Proposicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voto" ADD CONSTRAINT "Voto_votacaoId_fkey" FOREIGN KEY ("votacaoId") REFERENCES "Votacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voto" ADD CONSTRAINT "Voto_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposicaoAutor" ADD CONSTRAINT "ProposicaoAutor_proposicaoId_fkey" FOREIGN KEY ("proposicaoId") REFERENCES "Proposicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposicaoAutor" ADD CONSTRAINT "ProposicaoAutor_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DespesaCota" ADD CONSTRAINT "DespesaCota_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emenda" ADD CONSTRAINT "Emenda_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emenda" ADD CONSTRAINT "Emenda_municipioIbge_fkey" FOREIGN KEY ("municipioIbge") REFERENCES "Municipio"("ibge") ON DELETE SET NULL ON UPDATE CASCADE;
