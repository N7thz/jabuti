// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { indicePorMateria, lerIdeia, lerListaIdeias, textoDe } from "./ideias";

// Trechos com a mesma estrutura das páginas do e-Cidadania (novembro de 2026).
const LISTA = `
<div class="colecao-ideia-mais-popular"><ol>
  <li class="resumo-ideia">
    <a href="visualizacaoideia?id=80429">
      <h4>Fim do aux&iacute;lio moradia para deputados, ju&iacute;zes senadores.</h4>
      <figure class="componente-grafico-ideia"><figcaption>1.269%</figcaption></figure>
      <p><b>253.804</b> apoios confirmados</p>
    </a>
  </li>
  <li class="resumo-ideia">
    <a href="visualizacaoideia?id=102777"><h4>Bolsa de pesquisa conta para aposentadoria</h4><p>22 apoios confirmados</p></a>
  </li>
</ol></div>`;

const passo = (data: string, h3: string, corpo: string) => `
<li class="timeline-item">
  <span class="timeline-icon" aria-hidden="true"></span>
  <time datetime="${data}">${data}</time>
  <div><h3>${h3}</h3><p>${corpo}</p></div>
</li>`;

const pagina = (titulo: string, apoios: string, passos: string) => `
<html><head><title>Ideia Legislativa - ${titulo} :: Portal e-Cidadania - Senado Federal</title></head>
<body><p>${apoios}</p><p>apoios confirmados</p><h2>Linha do Tempo</h2><ol class="timeline">${passos}</ol></body></html>`;

const COMISSAO = pagina(
  "Fim do auxílio moradia para deputados, juízes senadores.",
  "253.804",
  passo(
    "2019-12-11",
    "Ideia transformada em <span>PEC</span> pela <span>Comissão</span>",
    `A CDH do Senado debateu a <a href="https://www25.senado.leg.br/web/atividade/materias/-/materia/130204">Sugestão nº 30, de 2017</a>,
     e decidiu transformá-la no(a) <a href="https://www25.senado.leg.br/web/atividade/materias/-/materia/140184">Proposta de Emenda à Constituição nº 222, de 2019</a>.`,
  ) +
    passo(
      "2017-07-19",
      "Ideia gerou a sugestão",
      `Essa ideia gerou a <a href="https://www25.senado.leg.br/web/atividade/materias/-/materia/130204">Sugestão nº 30, de 2017</a>.`,
    ) +
    passo("2017-06-01", "Ideia alcançou 20.000 apoios", "Parabéns!"),
);

const ADOTADA = pagina(
  "Bolsa de pesquisa conta para aposentadoria",
  "22",
  passo(
    "2023-05-30",
    "Ideia transformada em <span>PL</span> por <span>Senador</span>",
    `A ideia foi adotada pel<span>o</span> <span>Senador Astronauta Marcos Pontes (SP)</span> e transformada no
     <a target="_blank" href="https://www25.senado.leg.br/web/atividade/materias/-/materia/157807">Projeto de Lei nº 2849, de 2023</a>.
     Você pode votar na <a href="/ecidadania/visualizacaomateria?id=157807">Consulta Pública</a>.`,
  ),
);

describe("lerListaIdeias", () => {
  test("lê id, título (com entidades) e apoios de cada cartão", () => {
    expect(lerListaIdeias(LISTA)).toEqual([
      { id: 80429, titulo: "Fim do auxílio moradia para deputados, juízes senadores.", apoios: 253804 },
      { id: 102777, titulo: "Bolsa de pesquisa conta para aposentadoria", apoios: 22 },
    ]);
  });

  test("página sem cartões vira lista vazia", () => {
    expect(lerListaIdeias("<html><body>Manutenção</body></html>")).toEqual([]);
  });
});

describe("lerIdeia", () => {
  test("projeto da CDH aponta para a matéria final, não para a sugestão", () => {
    const ideia = lerIdeia(80429, COMISSAO);
    expect(ideia?.titulo).toBe("Fim do auxílio moradia para deputados, juízes senadores.");
    expect(ideia?.apoios).toBe(253804);
    expect(ideia?.passos).toEqual([
      {
        data: "2019-12-11",
        codigoMateria: 140184,
        materia: "Proposta de Emenda à Constituição nº 222, de 2019",
        caminho: { tipo: "comissao" },
      },
      { data: "2017-07-19", codigoMateria: 130204, materia: "Sugestão nº 30, de 2017", caminho: { tipo: "sugestao" } },
    ]);
  });

  test("ideia adotada por senador traz cargo, nome e UF", () => {
    expect(lerIdeia(102777, ADOTADA)?.passos).toEqual([
      {
        data: "2023-05-30",
        codigoMateria: 157807,
        materia: "Projeto de Lei nº 2849, de 2023",
        caminho: { tipo: "parlamentar", cargo: "Senador", nome: "Astronauta Marcos Pontes", uf: "SP" },
      },
    ]);
  });

  test("página que não é de ideia (erro, manutenção) devolve null", () => {
    expect(lerIdeia(1, '{"error_type": "LocationError"}')).toBeNull();
    expect(lerIdeia(1, "<title>Ideia Legislativa - X :: Portal e-Cidadania</title>")).toBeNull();
  });
});

describe("indicePorMateria", () => {
  test("liga cada matéria à ideia; empate de matéria fica com a mais apoiada", () => {
    const fraca = { id: 1, titulo: "Fraca", apoios: 10, passos: lerIdeia(80429, COMISSAO)!.passos };
    const forte = lerIdeia(80429, COMISSAO)!;
    const indice = indicePorMateria([fraca, forte]);
    expect(indice.get(140184)?.ideia.id).toBe(80429);
    expect(indice.get(130204)?.passo.caminho.tipo).toBe("sugestao");
    expect(indice.has(999)).toBe(false);
  });
});

test("textoDe decodifica entidades e junta espaços", () => {
  expect(textoDe("<b>A&ccedil;&#227;o</b>\n  &amp; <i>&Eacute;</i> &xyz;")).toBe("Ação & É &xyz;");
});
