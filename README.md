<p align="center">
  <img src="app/icon.svg" width="72" alt="" />
</p>

# Portal da Transparência

[![Licença: AGPL-3.0](https://img.shields.io/badge/licen%C3%A7a-AGPL--3.0-blue)](LICENSE)
[![Contribuições bem-vindas](https://img.shields.io/badge/contribui%C3%A7%C3%B5es-bem--vindas-brightgreen)](#como-contribuir)

Um portal para qualquer pessoa acompanhar e cobrar os políticos com dados públicos oficiais: emendas parlamentares, gastos de gabinete, presença, campanhas eleitorais e as contas de estados e municípios. Ele foi feito para quem não é especialista. Todo termo técnico tem uma explicação a um clique (veja [Glossário](#glossário)), e a acessibilidade vem antes de tudo.

> **Projeto open-source, sob a licença [AGPL-3.0](LICENSE), e aberto a contribuições.** O código é público para que qualquer pessoa possa conferir de onde vem cada número, apontar erros e ajudar a melhorar o portal. Você pode usar, estudar, modificar e publicar sua própria versão, desde que ela também continue aberta. Não é preciso ser especialista: dá para contribuir com código, com textos do glossário, testando a acessibilidade ou avisando quando um dado parece errado. Veja [Como contribuir](#como-contribuir).

## O que dá para consultar

| Página | Rota | O que mostra |
| --- | --- | --- |
| Início | `/` | Consulta de empresas por CNPJ: contratos e sanções (CEIS e CNEP) |
| Parlamentares | `/parlamentares` | Lista de deputados e senadores com filtros |
| Perfil de deputado | `/parlamentares/deputado/[id]` | Presença no plenário, despesas da cota, proposições, emendas e campanha (TSE) |
| Perfil de senador | `/parlamentares/senador/[codigo]` | O mesmo com os dados do Senado (cota CEAPS e matérias) |
| Estados | `/estados`, `/estados/[uf]` | Emendas por estado |
| Município | `/estados/[uf]/[ibge]` | Emendas recebidas, emenda por habitante, contas do município (Siconfi) |
| Orçamento | `/orcamento`, `/orcamento/loa` | Emendas no orçamento e a Lei Orçamentária Anual |
| Emendas Pix | `/emendas-pix/[id]` | Transferência especial (Transferegov): plano de ação e quem executa o dinheiro |
| Glossário | `/glossario` | Todos os termos explicados em linguagem simples |

O login com Google é **opcional**: serve só para fixar os parlamentares, partidos ou bancadas estaduais que você quer acompanhar. Os fixados viram atalhos e também filtros em `/parlamentares`.

## Fontes de dados

- [Portal da Transparência (CGU)](https://portaldatransparencia.gov.br/api-de-dados): emendas, CNPJ, contratos e sanções (precisa de chave)
- [Câmara dos Deputados](https://dadosabertos.camara.leg.br/) e [Senado Federal](https://www12.senado.leg.br/dados-abertos): parlamentares, votações, eventos, despesas e proposições
- [TSE, Dados Abertos](https://dadosabertos.tse.jus.br/): candidaturas, bens declarados, receitas de campanha e votos por município
- [Transferegov](https://www.gov.br/transferegov/): emendas Pix (transferências especiais)
- [Siconfi (Tesouro)](https://siconfi.tesouro.gov.br/): contas e relatórios fiscais de estados e municípios
- [TCU](https://portal.tcu.gov.br/): quem está inabilitado para cargo público ou declarado inidôneo para licitar
- [IBGE](https://servicodados.ibge.gov.br/): municípios e estimativa de população

Sempre que possível, o app consulta a API oficial direto. O banco guarda só o que a API não oferece: rankings, filtros que cruzam fontes e históricos.

## Tecnologias

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com); o visual segue o [`DESIGN.md`](DESIGN.md)
- [Neon](https://neon.tech) Postgres + [Prisma 7](https://www.prisma.io)
- [Better Auth](https://www.better-auth.com) com login Google
- react-hook-form + zod nos formulários (que também funcionam sem JavaScript)
- date-fns e dinero.js para datas e valores em reais (em `lib/format`)
- [Bun](https://bun.sh) como gerenciador de pacotes, executor de scripts e de testes

## Como rodar

Pré-requisitos: Bun e um banco Postgres no Neon.

```bash
bun install            # também roda o prisma generate
cp .env.example .env   # preencha as variáveis (abaixo)
bun run db:deploy      # aplica as migrations no banco
bun dev                # http://localhost:3000
```

Para ver se o app alcança o banco, abra `GET /api/health`.

### Variáveis de ambiente

| Variável | Para quê |
| --- | --- |
| `PORTAL_TRANSPARENCIA_API_KEY` | Chave da API do Portal da Transparência ([cadastro](https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email)) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Login Google. Redirect URI: `http://localhost:3000/api/auth/callback/google` |
| `BETTER_AUTH_SECRET` | Segredo das sessões (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | URL base do app (`http://localhost:3000` no dev) |
| `DATABASE_URL` | Conexão do Neon **com pooling** (host com `-pooler`), usada pelo app |
| `DIRECT_URL` | Conexão **direta**, usada por `prisma migrate` e `prisma studio` (aceita `DATABASE_URL_UNPOOLED`) |

## Carga de dados

Os scripts em `scripts/` trazem os dados das fontes para o banco. Todos aceitam `--dry-run`, que busca e mapeia os dados de verdade mas não grava nada: só imprime contagens e exemplos.

Ordem recomendada na primeira carga:

```bash
bun scripts/sync-municipios.ts                      # municípios e população (IBGE)
bun scripts/sync-camara.ts                          # padrão: últimos 30 dias
bun scripts/sync-senado.ts                          # padrão: últimos 30 dias
bun scripts/sync-emendas.ts --anos 2020-2025        # precisa dos municípios
bun scripts/sync-tse.ts                             # precisa de Câmara e Senado
```

Opções úteis: `--desde AAAA-MM-DD` / `--ate AAAA-MM-DD` (Câmara e Senado), `--so votacoes,despesas` para rodar só algumas etapas, `--ufs AC,AM` e `--anos 2018,2022` (TSE). O cabeçalho de cada script tem a lista completa. Cada execução fica registrada na tabela `SyncRun`.

## Scripts do projeto

| Comando | O que faz |
| --- | --- |
| `bun dev` | Servidor de desenvolvimento |
| `bun run build` / `bun start` | Build e servidor de produção |
| `bun run check` | Checagem de tipos + ESLint |
| `bun test` | Testes (`*.test.ts`, com `bun:test`) |
| `bun run db:migrate` | Cria e aplica uma migration no desenvolvimento |
| `bun run db:deploy` | Aplica as migrations pendentes |
| `bun run db:studio` | Abre o Prisma Studio |
| `bun run api:types` | Regenera os tipos da API do Portal da Transparência (`lib/transparencia/schema.d.ts`) |

## Estrutura

```
app/            rotas (páginas, API em app/api)
components/     componentes de interface (components/ui = shadcn)
lib/            um cliente por fonte de dados (camara, senado, tse, siconfi,
                transferegov, tcu, ibge, transparencia), formatação e glossário
prisma/         schema e migrations
scripts/        cargas de dados (sync-*.ts)
```

## Glossário

Todo termo técnico que aparece no app (emenda Pix, empenho, RREO, cota parlamentar...) é definido em `lib/glossario.ts` e marcado na página com o componente `<Termo>`, que abre a explicação ao clicar. Ao adicionar uma tela nova, cadastre lá os termos que ela usa. A página `/glossario` lista todos.

## Como contribuir

Toda ajuda é bem-vinda, de quem programa e de quem não programa.

**Sem programar**

- **Encontrou um dado estranho?** Abra uma issue com o link da página, o valor que aparece e, se souber, onde está o valor certo na fonte oficial.
- **Uma explicação ficou confusa?** Sugira um texto melhor para o termo no glossário. A ideia é explicar para quem nunca ouviu falar no assunto, sem tratar ninguém como criança.
- **Usa leitor de tela, navegação só por teclado ou zoom alto?** Conte onde o portal atrapalha. Esse retorno vale muito.
- **Tem ideia de dado público que ajudaria a cobrar os políticos?** Abra uma issue descrevendo o dado e a fonte.

**Com código**

1. Faça um fork, crie um branch a partir de `main` e siga [Como rodar](#como-rodar). Você não precisa de todas as chaves: os scripts de carga funcionam com `--dry-run` sem banco.
2. Antes de abrir o pull request, rode `bun run check` e `bun test`.
3. No pull request, explique o que mudou e por quê. Se mexer na interface, inclua um print nos temas claro e escuro.

Combinados do projeto:

- **API oficial primeiro.** Só guarde no banco o que a fonte não oferece (rankings, filtros que cruzam fontes).
- **Todo termo técnico vai para o glossário** (`lib/glossario.ts`) e é marcado com `<Termo>`.
- **Acessibilidade não é opcional:** contraste mínimo de 4,5:1 (as cores estão no [`DESIGN.md`](DESIGN.md)), tudo alcançável pelo teclado e formulários que funcionam sem JavaScript (react-hook-form + zod).
- **Datas e dinheiro** passam por `lib/format` (date-fns e dinero.js), nunca formatados à mão.
- Textos da interface, nomes de variáveis do domínio e commits em **português do Brasil**.

Para mudanças grandes, abra uma issue antes para combinarmos o caminho e ninguém perder trabalho.

## Licença

Este projeto é software livre, distribuído sob a [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).

Na prática:

- **Pode** usar, copiar, estudar, modificar e distribuir o código, inclusive para fins comerciais.
- **Precisa** manter o aviso de licença e de autoria, e liberar sob a mesma licença o código de qualquer versão modificada que você distribuir.
- **Vale também para sites:** se você colocar no ar uma versão modificada do portal, quem usa o site tem direito ao código-fonte dela. É isso que garante que um portal de transparência continue transparente.

Os dados exibidos vêm de fontes públicas oficiais (veja [Fontes de dados](#fontes-de-dados)) e seguem as condições de uso de cada órgão. A licença cobre o código, não os dados.

Ao enviar uma contribuição, você concorda em licenciá-la sob a mesma AGPL-3.0.
