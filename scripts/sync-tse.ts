/**
 * Sincroniza dados do TSE (Dados Abertos) dos parlamentares em exercício: candidatura, bens
 * declarados, receitas de campanha e votos por município. Depois, a evolução do patrimônio: o total de
 * bens declarado em cada eleição de 2014 a 2024 que o parlamentar disputou na UF (casa por CPF ou título).
 * Uso: bun scripts/sync-tse.ts [--ufs AC,AM] [--anos 2018,2022] [--so-patrimonio] [--dry-run]
 * Padrão: todas as UFs, anos 2018 (senadores) e 2022. Rode depois de sync-camara e sync-senado.
 * --so-patrimonio pula as candidaturas e refaz só a evolução, a partir das candidaturas já gravadas.
 * --dry-run lê os parlamentares do banco, mas não grava: imprime contagens e exemplos (sem CPF).
 */
import { parseArgs } from "node:util";

import { formatarReais } from "@/lib/format/dinheiro";
import { Uf } from "@/lib/generated/prisma/enums";
import { createPrisma } from "@/lib/prisma";
import { registrarSync } from "@/lib/sync/run";
import { createTseClient } from "@/lib/tse/client";
import {
  apagarSubstituidas,
  buscarUfAno,
  carregarAlvos,
  casarUf,
  gravarCandidaturas,
  type CandidaturaCompleta,
} from "@/lib/tse/sync";
import { buscarPatrimonioUf, carregarPessoas, gravarPatrimonio, type PatrimonioCompleto } from "@/lib/tse/patrimonio";

const { values } = parseArgs({
  options: {
    ufs: { type: "string" },
    anos: { type: "string", default: "2018,2022" },
    "so-patrimonio": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

const TODAS = Object.values(Uf);
const ufs = (values.ufs ? values.ufs.split(",").map((s) => s.trim().toUpperCase()) : TODAS) as Uf[];
const invalidas = ufs.filter((uf) => !TODAS.includes(uf));
const anos = values.anos.split(",").map(Number);
if (invalidas.length > 0 || anos.some((a) => !Number.isInteger(a))) {
  console.error(`UF(s) ou ano(s) inválido(s): ${[...invalidas, values.anos].join(", ")}`);
  process.exit(1);
}
const dryRun = values["dry-run"];
const soPatrimonio = values["so-patrimonio"];

function resumir(uf: Uf, ano: number, itens: CandidaturaCompleta[]) {
  const porCpf = itens.filter((i) => i.candidatura.casouPor === "cpf").length;
  console.log(`  ${uf} ${ano}: ${itens.length} candidaturas (${porCpf} por CPF, ${itens.length - porCpf} por nome)`);
  for (const i of itens.slice(0, 2)) {
    // Só campos públicos: o CPF nunca vai para o log.
    const c = i.candidatura;
    const semIbge = i.votos.filter((v) => v.municipioIbge === null).length;
    console.log(
      `    ${c.nomeUrna} (${c.partido}, ${c.cargo}, ${c.resultado}): bens ${formatarReais(i.totalBens)} em ${i.bens.length}; ` +
        `receitas ${formatarReais(i.totalReceitas)} em ${i.receitas.length} grupos; ${i.totalVotos} votos em ${i.votos.length} municípios` +
        (semIbge ? ` (${semIbge} sem código IBGE)` : ""),
    );
  }
}

function resumirPatrimonio(uf: Uf, pessoas: number, itens: PatrimonioCompleto[]) {
  const comHistorico = new Set(itens.map((i) => i.eleicao.parlamentarId));
  console.log(`  ${uf} patrimônio: ${itens.length} eleições de ${comHistorico.size}/${pessoas} parlamentares`);
  const porPessoa = Map.groupBy(itens, (i) => i.eleicao.parlamentarId);
  for (const serie of [...porPessoa.values()].sort((a, b) => b.length - a.length).slice(0, 2)) {
    console.log(`    ${serie.map((i) => `${i.eleicao.ano} ${i.eleicao.cargo}: ${formatarReais(i.totalBens)}`).join(" · ")}`);
  }
}

async function patrimonio(uf: Uf) {
  const pessoas = await carregarPessoas(prisma, uf);
  if (pessoas.length === 0) return 0;
  const itens = await buscarPatrimonioUf(client, pessoas, uf);
  resumirPatrimonio(uf, pessoas.length, itens);
  return dryRun ? 0 : gravarPatrimonio(prisma, pessoas, itens);
}

console.log(`TSE ${anos.join(",")} · ${ufs.length} UF(s)${dryRun ? " (dry-run, sem gravar)" : ""}`);

const prisma = createPrisma();
const client = createTseClient();
try {
  // Só a evolução do patrimônio parte das candidaturas gravadas: não precisa da Câmara nem dos municípios.
  const alvos = soPatrimonio ? [] : await carregarAlvos(prisma, ufs);
  const municipios = soPatrimonio ? new Map<number, number>() : await client.municipiosTseIbge();
  if (!soPatrimonio) console.log(`${alvos.length} parlamentares em exercício; ${municipios.size} municípios na tabela TSE → IBGE`);

  for (const uf of ufs) {
    if (soPatrimonio) {
      if (dryRun) await patrimonio(uf);
      else console.log(`[${uf}] ${await registrarSync(prisma, "TSE", `${uf}:patrimonio`, () => patrimonio(uf))} eleições gravadas`);
      continue;
    }
    const job = async () => {
      const doUf = alvos.filter((a) => a.uf === uf);
      const candidaturas = await casarUf(client, doUf, uf, anos);
      let registros = 0;
      for (const ano of anos) {
        const inicio = Date.now();
        const itens = await buscarUfAno(client, candidaturas, uf, ano, municipios);
        if (itens.length === 0) continue;
        resumir(uf, ano, itens);
        console.log(`    (${((Date.now() - inicio) / 1000).toFixed(1)}s)`);
        if (!dryRun) registros += await gravarCandidaturas(prisma, itens);
      }
      if (!dryRun) {
        const apagadas = await apagarSubstituidas(prisma, doUf.map((a) => a.id), candidaturas);
        if (apagadas > 0) console.log(`  ${apagadas} candidatura(s) antiga(s) apagada(s)`);
      }
      const casados = new Set(candidaturas.map((c) => c.parlamentarId));
      const faltando = doUf.filter((a) => !casados.has(a.id));
      if (faltando.length > 0) console.log(`  sem candidatura encontrada: ${faltando.map((a) => `${a.casa}:${a.nomes[0]}`).join(", ")}`);
      return registros;
    };
    if (dryRun) await job();
    else console.log(`[${uf}] ${await registrarSync(prisma, "TSE", `${uf}:${anos.join(",")}`, job)} registros gravados`);
    // Depende das candidaturas recém-gravadas (no dry-run, das que já estavam no banco).
    if (dryRun) await patrimonio(uf);
    else console.log(`[${uf}] ${await registrarSync(prisma, "TSE", `${uf}:patrimonio`, () => patrimonio(uf))} eleições gravadas`);
  }
} finally {
  await prisma.$disconnect();
}
