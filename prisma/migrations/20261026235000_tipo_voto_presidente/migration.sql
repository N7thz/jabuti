-- Renomeia em vez de recriar o valor, preservando os votos já gravados.
ALTER TYPE "TipoVoto" RENAME VALUE 'ARTIGO_17' TO 'PRESIDENTE';
ALTER TYPE "TipoVoto" ADD VALUE 'PRESENTE_SEM_VOTO';
ALTER TYPE "TipoVoto" ADD VALUE 'VOTO_SECRETO';
