-- Eleitos de cada eleição do TSE para a Câmara e o Senado (scripts/sync-eleitos.ts).

-- CreateTable
CREATE TABLE "Eleito" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "casa" "Casa" NOT NULL,
    "uf" "Uf" NOT NULL,
    "sqCandidato" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeUrna" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "partido" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "cpf" TEXT,
    "parlamentarId" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Eleito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Eleito_ano_casa_uf_idx" ON "Eleito"("ano", "casa", "uf");

-- CreateIndex
CREATE UNIQUE INDEX "Eleito_ano_sqCandidato_key" ON "Eleito"("ano", "sqCandidato");

-- AddForeignKey
ALTER TABLE "Eleito" ADD CONSTRAINT "Eleito_parlamentarId_fkey" FOREIGN KEY ("parlamentarId") REFERENCES "Parlamentar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dado público: o site só lê (o GRANT de leitura já vem do ALTER DEFAULT PRIVILEGES de 20261104030000_papel_app_rls,
-- repetido aqui caso a tabela seja criada por outro papel). Quem grava é a carga, como dono.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portal_app') THEN
    GRANT SELECT ON "Eleito" TO portal_app;
  END IF;
END
$$;

ALTER TABLE "Eleito" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Eleito" FOR SELECT TO portal_app USING (true);
