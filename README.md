<p align="center">
  <img src="app/icon.png" width="72" alt="" />
</p>

# Jabuti

[![Licença: AGPL-3.0](https://img.shields.io/badge/licen%C3%A7a-AGPL--3.0-blue)](LICENSE)
[![Contribuições bem-vindas](https://img.shields.io/badge/contribui%C3%A7%C3%B5es-bem--vindas-brightgreen)](#como-contribuir)

Um portal para qualquer pessoa acompanhar e cobrar os políticos com dados públicos oficiais: emendas parlamentares, gastos de gabinete, presença, campanhas eleitorais e as contas de estados e municípios. Ele foi feito para quem não é especialista. Todo termo técnico tem uma explicação a um clique (veja [Glossário](#glossário)), e a acessibilidade vem antes de tudo.

**Por que Jabuti?** Na política brasileira, "jabuti" é o trecho enfiado num projeto de lei que não tem nada a ver com ele. O nome vem do ditado: *jabuti não sobe em árvore; se está lá, foi enchente ou mão de gente*. O portal existe para isso: mostrar quem colocou cada coisa onde está.

> **Projeto open-source, sob a licença [AGPL-3.0](LICENSE), e aberto a contribuições.** O código é público para que qualquer pessoa possa conferir de onde vem cada número, apontar erros e ajudar a melhorar o portal. Você pode usar, estudar, modificar e publicar sua própria versão, desde que ela também continue aberta. Não é preciso ser especialista: dá para contribuir com código, com textos do glossário, testando a acessibilidade ou avisando quando um dado parece errado. Veja [Como contribuir](#como-contribuir).

## O que dá para consultar

| Página | Rota | O que mostra |
| --- | --- | --- |
| Início | `/` | O que é o portal e tudo o que dá para consultar |
| Empresas | `/empresas` | Consulta de empresas por CNPJ: contratos e sanções (CEIS, CNEP e TCU) |
| Parlamentares | `/parlamentares` | Lista de deputados e senadores com filtros |
| Perfil de deputado | `/parlamentares/deputado/[id]` | Escolha do ano (`?ano=`, anos da legislatura atual; o ano corrente aparece como "até o momento") para resumo, cota, proposições e emendas. Presença no plenário, como votou, fidelidade ao partido e ao governo, despesas da cota, proposições, leis de toda a carreira (autoria e coautoria), emendas, votos × emendas por cidade, campanha e evolução do patrimônio corrigida pela inflação (TSE), trocas de partido e trajetória política |
| Perfil de senador | `/parlamentares/senador/[codigo]` | O mesmo com os dados do Senado (cota CEAPS, votações e matérias, todas por ano); nas leis, também as que o senador relatou |
| Estados | `/estados`, `/estados/[uf]` | Emendas por estado, com links para cada ano carregado e os autores que mais mandaram dinheiro (com partido/UF) |
| Município | `/estados/[uf]/[ibge]` | Emendas recebidas (autor com partido/UF atual), emenda por habitante, contas do município (Siconfi) |
| Orçamento | `/orcamento`, `/orcamento/loa` | Emendas no orçamento e a Lei Orçamentária Anual |
| Emendas Pix | `/emendas-pix/[id]` | Transferência especial (Transferegov): plano de ação e quem executa o dinheiro |
| Votação | `/votacoes/[casa]/[id]` | Placar de uma votação nominal: total, por partido, por estado o voto de cada parlamentar e a comparação com a consulta popular (o que a população disse e para que lado o plenário foi) |
| Leis e projetos | `/leis` | Projetos de lei de Câmara e Senado por etapa da tramitação, as leis mais recentes e o placar da consulta popular (e-Cidadania e enquetes da Câmara) |
| Comparar | `/comparar` | Dois parlamentares lado a lado no ano escolhido (`?ano=`), com a concordância nos votos e a média da Casa como base |
| Ranking da cota | `/rankings/cota` | Quem mais gastou da cota no ano (com links entre os anos), no total ou por tipo de gasto |
| Glossário | `/glossario` | Todos os termos explicados em linguagem simples |
| Ajuda | `/ajuda` | Perguntas frequentes sobre como usar o portal, a conta e os dados |
| Apoie o projeto | `/apoie` | Para onde vai o dinheiro, doação por Pix (QR Code e copia e cola, com valor à escolha), apoio mensal, o mural de quem já apoiou (nomes adicionados pelo admin em `/admin/apoiadores`, só com autorização da pessoa) e outras formas de ajudar. O botão "Apoie o projeto" do menu abre o mesmo conteúdo num dialog |
| Sugestões e problemas | `/feedback` | Formulário para avisar de erro ou sugerir melhoria, com anexos (vai por email) |
| Configurações | `/configuracoes` | Tema, acessibilidade (tamanho do texto, espaçamento, animações), conta, resumo do meu painel (cidade, empresas vigiadas e listas), notificações e dados salvos, com "Apagar meus dados" removendo tudo o que a conta guarda |
| Meu painel | `/meu` | Com login: novidades dos parlamentares fixados e seguidos desde a última visita, meus representantes (cidade e estado escolhidos), empresas vigiadas e as listas mais recentes |
| Minhas listas | `/listas`, `/listas/[id]` | Com login: listas privadas de votações, leis, empresas, emendas, parlamentares e páginas, com anotações; cada lista baixa em CSV (`/api/csv/lista/[id]`) |
| Notificações | `/notificacoes` | Com login: o que aconteceu com os parlamentares e projetos seguidos |

O login é **opcional**, com Google ou com email e senha (`/entrar`, `/cadastrar`, com confirmação de email e recuperação de senha): serve só para fixar os parlamentares, partidos ou bancadas estaduais que você quer acompanhar. Os fixados viram atalhos e também filtros em `/parlamentares`. Também dá para **seguir** parlamentares e projetos de lei (botão "Seguir" no perfil do senador ou deputado e em cada item de `/leis`): uma vez por dia, depois da carga, o portal gera notificações com o voto de cada parlamentar seguido nas votações nominais, os projetos que ele apresentou e as mudanças de situação dos projetos seguidos. Elas ficam em `/notificacoes` (com o contador no sino do cabeçalho) e, quando o envio por email for ligado (`NOTIFICACOES_POR_EMAIL=1`, depois de verificar um domínio próprio no Resend), também num resumo diário ou semanal escolhido em `/configuracoes`, com link para parar de receber sem login. As preferências de leitura funcionam sem login; com login, elas (e o menu) passam a valer em todos os aparelhos.

Em `/meu` ficam as **empresas vigiadas** (até 20 CNPJs): a cada visita o painel confere sanções (CEIS, CNEP e TCU) e contratos novos no Portal da Transparência e mostra o que mudou desde a última vez. Na seção "Mais" de `/meu` dá para baixar tudo o que o portal guarda da conta num JSON (`/api/meus-dados`, direito previsto na LGPD, art. 18). Login, envio de links e feedback têm limite de tentativas (`lib/limite.ts`), contado no banco para valer em todas as instâncias.

O menu lateral mostra sempre Parlamentares, Leis e projetos e Estados e cidades; os outros assuntos (Consulta CNPJ, Comparar, Ranking da cota, Emendas, LOA e Glossário) a pessoa liga em "Personalizar menu", no fim da lista. A escolha fica neste aparelho (localStorage, `lib/menu.ts`) e a página aberta sempre aparece no menu. Para quem está logado, a sidebar também mostra **Minha cidade** (a escolhida em "Meus representantes", com atalho para `/meu`) e os **Fixados**.

## Fontes de dados

- [Portal da Transparência (CGU)](https://portaldatransparencia.gov.br/api-de-dados): emendas, CNPJ, contratos e sanções (precisa de chave)
- [Câmara dos Deputados](https://dadosabertos.camara.leg.br/) e [Senado Federal](https://www12.senado.leg.br/dados-abertos): parlamentares, votações, eventos, despesas, proposições, autoria e relatoria
- [e-Cidadania (Senado)](https://www12.senado.leg.br/ecidadania) e enquetes da Câmara: placar da consulta popular de cada projeto, lido da página pública porque não está nos dados abertos
- [TSE, Dados Abertos](https://dadosabertos.tse.jus.br/): candidaturas, bens declarados, receitas de campanha e votos por município
- [Transferegov](https://www.gov.br/transferegov/): emendas Pix (transferências especiais)
- [Siconfi (Tesouro)](https://siconfi.tesouro.gov.br/): contas e relatórios fiscais de estados e municípios
- [TCU](https://portal.tcu.gov.br/): quem está inabilitado para cargo público ou declarado inidôneo para licitar
- [IBGE](https://servicodados.ibge.gov.br/): municípios e estimativa de população

As tabelas principais (votos, gastos da cota, ranking e emendas de cada cidade) podem ser baixadas em CSV, pronto para abrir numa planilha.

Sempre que possível, o app consulta a API oficial direto. O banco guarda só o que a API não oferece: rankings, filtros que cruzam fontes e históricos.

## Tecnologias

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com); o visual segue o [`DESIGN.md`](DESIGN.md)
- [Neon](https://neon.tech) Postgres + [Prisma 7](https://www.prisma.io)
- [Better Auth](https://www.better-auth.com) com login Google ou email e senha
- [Resend](https://resend.com) para os emails (feedback, confirmação de email e redefinição de senha)
- [Motion](https://motion.dev) nas animações, que respeitam a preferência de movimento reduzido
- [Biome](https://biomejs.dev) como linter
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
| `NEXT_PUBLIC_SITE_URL` | Endereço público do portal, usado no sitemap, nas imagens e nos links de compartilhar (opcional: sem ele vale o `BETTER_AUTH_URL`) |
| `DATABASE_URL` | Conexão do Neon **com pooling** (host com `-pooler`), usada pelo app |
| `DIRECT_URL` | Conexão **direta**, usada por `prisma migrate` e `prisma studio` (aceita `DATABASE_URL_UNPOOLED`) |
| `RESEND_API_KEY` | Chave do [Resend](https://resend.com/api-keys), para enviar os emails |
| `FEEDBACK_EMAIL` | Quem recebe as mensagens do `/feedback` (vários separados por vírgula) |
| `FEEDBACK_REMETENTE` | Remetente do feedback, de um domínio verificado no Resend (opcional: sem ele vale o remetente de teste, que só entrega ao dono da conta) |
| `EMAIL_REMETENTE` | Remetente dos emails do login (opcional: sem ele vale o `FEEDBACK_REMETENTE`) |
| `ADMIN_EMAILS` | Emails (separados por vírgula) com acesso ao admin em `/admin/apoiadores`, onde se adicionam e tiram nomes do mural de `/apoie`. Para os outros, a página responde 404 |
| `APOIO_PIX_CHAVE`, `APOIO_PIX_NOME`, `APOIO_PIX_CIDADE` | Pix de apoio ao projeto em `/apoie` (opcional: sem os três, o Pix não aparece). O portal gera o QR Code e o copia e cola |
| `APOIO_GITHUB_SPONSORS_URL`, `APOIO_APOIASE_URL` | Links de apoio mensal (opcionais, só `https`) |
| `NEXT_PUBLIC_REPOSITORIO_URL` | Repositório citado em "contribuir no código" (opcional) |

## Carga de dados

Os scripts em `scripts/` trazem os dados das fontes para o banco. Todos aceitam `--dry-run`, que busca e mapeia os dados de verdade mas não grava nada: só imprime contagens e exemplos.

Ordem recomendada na primeira carga:

```bash
bun scripts/sync-municipios.ts                      # municípios e população (IBGE)
bun scripts/sync-camara.ts                          # padrão: últimos 30 dias
bun scripts/sync-senado.ts                          # padrão: últimos 30 dias
bun scripts/sync-emendas.ts --anos 2020-2025        # precisa dos municípios
bun scripts/sync-tse.ts                             # precisa de Câmara e Senado
bun scripts/notificar.ts                            # notificações e resumos por email (--sem-email para não enviar)
```

Opções úteis: `--desde AAAA-MM-DD` / `--ate AAAA-MM-DD` (Câmara e Senado), `--so votacoes,despesas` para rodar só algumas etapas (a etapa `orientacoes`, de Câmara e Senado, guarda a orientação de bancada usada no índice de fidelidade e deve rodar depois de `votacoes`), `--ufs AC,AM` e `--anos 2018,2022` (TSE). O cabeçalho de cada script tem a lista completa. Cada execução fica registrada na tabela `SyncRun`.

### Carga automática

O workflow [`.github/workflows/sync.yml`](.github/workflows/sync.yml) roda as cargas no GitHub Actions:

| Quando | Fontes |
| --- | --- |
| Todo dia, 06:00 UTC | Câmara e Senado (últimos 30 dias) e emendas do ano corrente; depois de Câmara e Senado, as notificações de quem segue parlamentares e projetos |
| Domingo, 09:00 UTC | Municípios (IBGE) e TSE |

Outro workflow, [`.github/workflows/verificar-html.yml`](.github/workflows/verificar-html.yml), roda todo dia às 10:30 UTC `bun scripts/verificar-html.ts`: o placar das consultas populares e as ideias legislativas não têm API e são lidos do HTML do Senado e da Câmara, então o script confere páginas conhecidas e falha (o GitHub avisa por email) se algum leitor parar de achar os dados. Não precisa de banco nem de secrets.

Cada fonte é um job separado, e duas cargas da mesma fonte nunca rodam ao mesmo tempo (a segunda espera a primeira). Para rodar na mão, use **Actions → Carga de dados → Run workflow**, escolha a fonte e, se quiser, passe argumentos extras (ex.: `--anos 2020-2025` para emendas).

Secrets necessários no repositório (**Settings → Secrets and variables → Actions**):

| Secret | Para quê |
| --- | --- |
| `DATABASE_URL` | Conexão do Neon com pooling, onde os scripts gravam |
| `DIRECT_URL` | Conexão direta do Neon |
| `PORTAL_TRANSPARENCIA_API_KEY` | Chave da API do Portal da Transparência (emendas) |
| `RESEND_API_KEY`, `EMAIL_REMETENTE` | Envio dos resumos de notificação por email (só com a variável `NOTIFICACOES_POR_EMAIL=1`) |
| `BETTER_AUTH_SECRET` | O mesmo do app: assina o link de "parar de receber" dos emails |

E a variável (não secret) `NEXT_PUBLIC_SITE_URL`, endereço público do portal usado nos links dos emails.

## Scripts do projeto

| Comando | O que faz |
| --- | --- |
| `bun dev` | Servidor de desenvolvimento |
| `bun run build` / `bun start` | Build e servidor de produção |
| `bun run check` | Checagem de tipos + lint (Biome) |
| `bun test` (ou `bun run test`) | Testes unitários (`lib/**/*.test.ts`, com `bun:test`) |
| `bun run test:a11y` | Acessibilidade (axe, WCAG 2 A e AA) nas páginas principais, temas claro e escuro. Precisa do banco e das chaves, então roda só local: sobe o `bun dev` ou usa o que já estiver na porta `PORTA_E2E` (padrão 3000). Na primeira vez: `bunx playwright install chromium` |
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
prisma/         schema/ (um arquivo por escopo: votacoes, tse, auth...) e migrations
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
