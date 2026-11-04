// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { urlDoSite } from "@/lib/site";

import { perfilParlamentar, serializarJsonLd, siteJabuti, trilha } from "./json-ld";

describe("json-ld", () => {
  test("perfil de deputado traz pessoa, partido e página oficial", () => {
    const perfil = perfilParlamentar({
      casa: "camara",
      id: 204554,
      nome: "Fulana de Tal",
      nomeCivil: "Fulana Maria de Tal",
      foto: "https://www.camara.leg.br/internet/deputado/bandep/204554.jpg",
      partido: "XYZ",
      redesSociais: ["https://instagram.com/fulana", "javascript:alert(1)"],
    });
    expect(perfil["@type"]).toBe("ProfilePage");
    expect(perfil.url).toBe(urlDoSite("/parlamentares/deputado/204554"));
    expect(perfil.mainEntity).toMatchObject({
      "@type": "Person",
      name: "Fulana de Tal",
      alternateName: "Fulana Maria de Tal",
      jobTitle: "Deputado(a) federal",
      affiliation: { "@type": "PoliticalParty", name: "XYZ" },
    });
    expect(perfil.mainEntity.sameAs).toEqual(["https://www.camara.leg.br/deputados/204554", "https://instagram.com/fulana"]);
  });

  test("senador sem partido nem foto não ganha campos vazios", () => {
    const { mainEntity } = perfilParlamentar({ casa: "senado", id: "5012", nome: "Beltrano", partido: " ", foto: null });
    expect(mainEntity.jobTitle).toBe("Senador(a)");
    expect(mainEntity).not.toHaveProperty("affiliation");
    expect(mainEntity).not.toHaveProperty("image");
    expect(mainEntity.url).toBe(urlDoSite("/parlamentares/senador/5012"));
  });

  test("trilha numera os itens com endereço absoluto", () => {
    const t = trilha([
      { nome: "Início", caminho: "/" },
      { nome: "Estados", caminho: "/estados" },
      { nome: "São Paulo", caminho: "/estados/SP" },
    ]);
    expect(t.itemListElement.map((i) => [i.position, i.name, i.item])).toEqual([
      [1, "Início", urlDoSite("/")],
      [2, "Estados", urlDoSite("/estados")],
      [3, "São Paulo", urlDoSite("/estados/SP")],
    ]);
  });

  test("site sem caixa de busca", () => {
    const [site, organizacao] = siteJabuti()["@graph"];
    expect(site).toMatchObject({ "@type": "WebSite", name: "Jabuti", inLanguage: "pt-BR" });
    expect(site).not.toHaveProperty("potentialAction");
    expect(site.publisher["@id"]).toBe(organizacao["@id"]);
  });

  test("escapa </script> no JSON", () => {
    const json = serializarJsonLd(trilha([{ nome: "</script><script>alert(1)</script>", caminho: "/" }]));
    expect(json).not.toContain("<");
    expect(JSON.parse(json).itemListElement[0].name).toBe("</script><script>alert(1)</script>");
  });
});
