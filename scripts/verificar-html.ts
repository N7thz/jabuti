/**
 * Verificação diária das páginas que o portal lê por HTML (não há API para estes dados):
 * placar da consulta pública do e-Cidadania, enquete da Câmara e ideias legislativas do e-Cidadania.
 *
 * Cada verificação baixa uma página conhecida e confere se o leitor ainda acha o que deveria. Se o Senado
 * ou a Câmara mudarem o HTML, o portal para de mostrar esses dados sem quebrar a página, e em silêncio.
 * Este script é quem avisa: sai com código 1 e o GitHub manda email para quem cuida do repositório
 * (rotina em .github/workflows/verificar-html.yml).
 *
 *   bun scripts/verificar-html.ts
 *
 * Não usa banco nem chaves. As páginas escolhidas são antigas e estáveis; se uma delas for retirada do ar
 * (e não o HTML que mudou), troque o exemplo aqui.
 */
import { appendFileSync } from "node:fs";

import { lerIdeia, lerListaIdeias, URL_IDEIAS_TRANSFORMADAS, urlIdeia } from "../lib/consultas/ideias";
import { lerConsultaSenado, lerEnqueteCamara, urlConsultaSenado, urlEnqueteCamara } from "../lib/consultas/ler";

interface Verificacao {
  nome: string;
  url: string;
  /** Devolve o que foi lido, para o relatório, ou lança um erro dizendo o que faltou. */
  conferir: (html: string) => string;
}

function exigir(condicao: unknown, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(mensagem);
}

const VERIFICACOES: Verificacao[] = [
  {
    nome: "Consulta pública do e-Cidadania (PEC 222/2019)",
    url: urlConsultaSenado(140184),
    conferir(html) {
      const c = lerConsultaSenado(html);
      exigir(c, "não achou o gráfico da consulta (figure.grafico-consulta-publica) nem os totais de Sim e Não");
      exigir(c.sim + c.nao > 0, `placar zerado (Sim ${c.sim}, Não ${c.nao}): a consulta tem votos há anos`);
      return `Sim ${c.sim}, Não ${c.nao}, apurado em ${c.apuradoEm ?? "(sem data)"}`;
    },
  },
  {
    nome: "Enquete da Câmara (PL 2236340)",
    url: urlEnqueteCamara(2236340),
    conferir(html) {
      const e = lerEnqueteCamara(html);
      exigir(e, "não achou a tabela de resultados nem o formulário da enquete");
      exigir(e.total > 0, "enquete com votos lida como zerada: as linhas .resumo-resposta mudaram");
      return `${e.total} votos`;
    },
  },
  {
    nome: "Lista de ideias que viraram proposição",
    url: URL_IDEIAS_TRANSFORMADAS,
    conferir(html) {
      const lista = lerListaIdeias(html);
      // Eram 82 em novembro de 2026; a lista só cresce, mas uma folga cobre ideias retiradas do ar.
      exigir(lista.length >= 50, `só ${lista.length} ideias lidas (esperado: 50 ou mais) nos cartões li.resumo-ideia`);
      exigir(lista.every((i) => i.titulo), "há cartão sem título");
      // Ideia adotada por senador pode ter 0 apoios (há duas assim); se quase todas vierem zeradas, a
      // contagem de apoios é que deixou de ser lida.
      const comApoios = lista.filter((i) => i.apoios > 0).length;
      exigir(comApoios >= lista.length * 0.8, `só ${comApoios} de ${lista.length} cartões com apoios lidos`);
      return `${lista.length} ideias (${comApoios} com apoios)`;
    },
  },
  {
    nome: "Ideia transformada pela CDH (auxílio-moradia → PEC 222/2019)",
    url: urlIdeia(80429),
    conferir(html) {
      const ideia = lerIdeia(80429, html);
      exigir(ideia, "não achou título, apoios ou a linha do tempo (ol.timeline)");
      const pec = ideia.passos.find((p) => p.codigoMateria === 140184);
      exigir(pec?.caminho.tipo === "comissao", "a linha do tempo não ligou a ideia à PEC 222/2019 pela comissão");
      exigir(ideia.passos.some((p) => p.caminho.tipo === "sugestao"), "não achou o passo da sugestão legislativa");
      return `"${ideia.titulo}", ${ideia.apoios} apoios, ${ideia.passos.length} passos`;
    },
  },
  {
    nome: "Ideia adotada por senador (PL 2849/2023)",
    url: urlIdeia(102777),
    conferir(html) {
      const ideia = lerIdeia(102777, html);
      exigir(ideia, "não achou título, apoios ou a linha do tempo (ol.timeline)");
      const passo = ideia.passos.find((p) => p.codigoMateria === 157807);
      exigir(passo?.caminho.tipo === "parlamentar", "não leu quem adotou a ideia (\"adotada pelo Senador ...\")");
      return `adotada por ${passo.caminho.cargo} ${passo.caminho.nome} (${passo.caminho.uf})`;
    },
  },
];

async function baixar(url: string) {
  const resposta = await fetch(url, { headers: { Accept: "text/html" }, signal: AbortSignal.timeout(30_000) });
  if (!resposta.ok) throw new Error(`a página respondeu ${resposta.status} ${resposta.statusText}`);
  return resposta.text();
}

const linhas: string[] = [];
let falhas = 0;

for (const v of VERIFICACOES) {
  try {
    const lido = v.conferir(await baixar(v.url));
    linhas.push(`✅ ${v.nome}: ${lido}`);
  } catch (erro) {
    falhas++;
    linhas.push(`❌ ${v.nome}: ${erro instanceof Error ? erro.message : String(erro)}\n   ${v.url}`);
  }
}

const relatorio = [
  falhas === 0
    ? "Todas as páginas lidas por HTML continuam no formato esperado."
    : `${falhas} de ${VERIFICACOES.length} leituras falharam. Abra a página indicada, veja o que mudou no HTML e ajuste o leitor em lib/consultas/ (há testes em lib/consultas/*.test.ts).`,
  "",
  ...linhas,
].join("\n");

console.log(relatorio);
// No GitHub Actions, o mesmo relatório aparece no resumo da execução.
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Verificação do HTML\n\n${relatorio.replaceAll("\n", "  \n")}\n`);

process.exit(falhas === 0 ? 0 : 1);
