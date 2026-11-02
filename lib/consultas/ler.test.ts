// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { lerConsultaSenado, lerEnqueteCamara } from "./ler";

// Trechos copiados das páginas reais (outubro de 2026).
const SENADO = `
<section><!-- <span class="contabilizacao-favor" tal:content="structure votosFavor">10+</span> --></section>
<figure class="grafico-consulta-publica">
  <header><span>Sim</span><span>Não</span></header>
  <section><div style="width:37.5%"></div></section>
  <footer>
    <span class="contabilizacao-favor">12.345</span>
    <span class="contabilizacao-contra">20.580</span>
  </footer>
</figure>
<div><div id="msg-contabilizacao-voto">Votos apurados até 31/10/2026 11:43:50</div></div>`;

test("lerConsultaSenado lê Sim, Não e a hora da apuração, com milhar", () => {
  expect(lerConsultaSenado(SENADO)).toEqual({ sim: 12345, nao: 20580, apuradoEm: "31/10/2026 11:43:50" });
});

test("lerConsultaSenado devolve null sem o gráfico (matéria sem consulta)", () => {
  const semConsulta = `<script>var $numeroVotos = $(".contabilizacao-"+voto); // .contabilizacao-favor</script>`;
  expect(lerConsultaSenado(semConsulta)).toBeNull();
});

const linha = (opcao: string, n: string) => `
<tr class="resumo-resposta">
  <th class="grafico-barras__item resumo-resposta__opiniao" data-th="Opção">${opcao}</th>
  <td class="grafico-barras__item resumo-resposta__participacoes" data-th="Participações">${n}</td>
  <td class="grafico-barras__item resumo-resposta__percentual" data-th="Percentual">0%</td>
</tr>`;

test("lerEnqueteCamara soma as cinco opções", () => {
  const html = [
    linha("Concordo totalmente", "35"),
    linha("Concordo na maior parte", "23"),
    linha("Estou indeciso", "2"),
    linha("Discordo na maior parte", "10"),
    linha("Discordo totalmente", "1.043"),
  ].join("");
  expect(lerEnqueteCamara(html)).toEqual({
    votos: {
      "concordo-totalmente": 35,
      "concordo-maior-parte": 23,
      indeciso: 2,
      "discordo-maior-parte": 10,
      "discordo-totalmente": 1043,
    },
    total: 1113,
  });
});

test("lerEnqueteCamara: enquete aberta e sem votos sai zerada; página sem enquete, null", () => {
  const aberta = "<h1>Enquete do PL 5704/2026</h1><label>Concordo totalmente</label><button>Votar</button>";
  expect(lerEnqueteCamara(aberta)?.total).toBe(0);
  expect(lerEnqueteCamara("<title>Câmara dos Deputados</title>")).toBeNull();
});
