---
version: "alpha"
name: "Logoisum Video Agency Hero (portal)"
description: "Logoisum Video Agency Hero (designmd.app.br/library/logoisum-video-agency-hero) adaptado para um portal público: quase monocromático em oliva escuro com o limão do ícone do Jabuti como marca, navbar branca flutuante, Barlow com destaque em Instrument Serif itálico, cantos de 12px e contraste AA verificado."
colors:
  primary: "#262C12"
  secondary: "#F4F6EC"
  neutral: "#5B6150"
  surface: "#FFFFFF"
  ink: "#262C12"
  deep: "#30361F"
  brand: "#BEDC54"
  success: "#2F6B47"
  destructive: "#B3362F"
typography:
  hero:
    fontFamily: Barlow
    fontSize: clamp(2.5rem, 6vw, 5.25rem)
    fontWeight: 700
  hero-accent:
    fontFamily: Instrument Serif
    fontStyle: italic
    fontWeight: 400
  h1:
    fontFamily: Barlow
    fontSize: 2.25rem
    fontWeight: 700
  body-md:
    fontFamily: Barlow
    fontSize: 1rem
    fontWeight: 400
  nav:
    fontFamily: Barlow
    fontSize: 0.875rem
    fontWeight: 500
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  sm: 2.0rem
  md: 4.0rem
  lg: 8.0rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px
  button-hero:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
---

## Overview

Base do Logoisum Video Agency Hero: estética premium e limpa de agência, quase toda em branco e oliva escuro (do ícone do Jabuti), com navbar branca flutuante e um título em duas vozes (Barlow bold apertado + Instrument Serif itálico). O original mostra um vídeo de fundo em tela cheia. Aqui não há vídeo: o hero usa um SVG estático (grade neutra e círculos no limão do ícone), porque o portal é público, precisa carregar rápido em conexões fracas e não pode depender de movimento para comunicar.

- Density: 3/10 — Airy
- Variance: 3/10 — Restrained
- Motion: 5/10 — Moderado (o original é 6; reduzido por acessibilidade)

- **Style:** Agency, Floating White Navbar, Instrument Serif Italic accent, Minimal Premium, Monochrome
- **Light/Dark:** ✓ Full / ✓ Full

## Colors

Tokens em `app/globals.css`. Quase monocromático, com uma leve referência ao ícone do Jabuti (fundo limão #BEDC54, jabuti oliva #3A4215): no claro, os neutros puxam para o oliva, o texto e o primário são o oliva escuro do jabuti e o limão é a cor da marca. No escuro, os fundos e o texto ficam em charcoal neutro e o ícone aparece só em bordas (oliva) e destaques (limão: foco, item ativo, seleção, primeira série dos gráficos). Fora isso, a cor só aparece para significado (sucesso, erro, gráficos) e, como destaque, na cor da marca (ver "Destaque das páginas"). Contraste medido nos dois temas:

| Papel | Claro | Escuro | Uso |
|---|---|---|---|
| Fundo | #FFFFFF | #1A1A1A | `background` (nunca preto puro) |
| Superfície | #F4F6EC | #262626 / #2B2B2B | `muted`, `secondary` |
| Card | #FFFFFF | #222222 | `card`, `popover` (#262626 no escuro), `sidebar` |
| Texto | #262C12 (14,5:1) | #F5F5F5 (15,6:1) | `foreground` |
| Texto secundário | #5B6150 (6,4:1; 5,9:1 sobre #F4F6EC) | #A6A6A6 (7,5:1; 6,2:1 sobre a superfície) | `muted-foreground` |
| Primário | #262C12, texto branco 14,5:1 | #F5F5F5, texto #222 15,9:1; foco (`ring`) no limão #C4E05C (11,7:1) | `primary`, `ring`, `link`: botões e foco |
| Marca | limão #BEDC54 / suave #EEF6D4 | #C4E05C / suave #2C3218 | `marca`: só enfeite no claro (1,55:1 no branco, nunca texto): seleção de texto, item ativo da sidebar, círculos do hero |
| Sucesso | #2F6B47, texto branco 6,4:1 | #7CC497, texto escuro 8,6:1 | valor pago, situação positiva |
| Erro | #B3362F, texto branco 5,9:1 | #EE8C82, texto escuro 7,4:1 | `destructive` |
| Gráficos | escala oliva + sucesso/erro | limão + escala de cinzas + sucesso/erro | sempre com rótulo em texto |
| Borda | #E1E6D3 (decorativa) / input #7D846A (3,9:1) | oliva #363C24 / input #70775C (3,7:1; texto de exemplo nos campos 4,7:1) | `border`, `input` |

Cor nunca é o único sinal: todo estado tem também texto ou ícone.

### Destaque das páginas

Todas as áreas do portal usam a cor da marca como destaque. A página marca a seção no elemento raiz com `data-secao`, e os utilitários `text-secao`, `border-secao` e `bg-secao-suave` usam a cor de destaque. Os antigos `text-secao-<nome>` da sidebar apontam para a mesma cor. O `data-secao` continua nas páginas caso um acento próprio por seção volte a ser preciso.

| Tema | Destaque | Suave | Contraste do destaque |
|---|---|---|---|
| Claro | #536414 (limão escuro: o limão puro não tem contraste para texto) | #EEF6D4 | 6,6:1 no #FFFFFF · 5,9:1 no suave |
| Escuro | #C4E05C (o limão da marca) | #2C3218 | 11,7:1 no #1A1A1A · 10,7:1 no card #222222 |

Regras:
- **Uso:** só como destaque (rótulo do topo da página, ícone, borda fina dos cards). Nada de fundo grande colorido nem gradiente. O fundo suave serve só para pequenas áreas, como um chip.
- **Não confundir com sucesso:** o limão fica perto do verde de sucesso. Por isso o destaque nunca marca estado; sucesso sempre vem com texto ou ícone próprio.
- **Nome da seção:** sempre aparece em texto; a cor reforça, não substitui.

## Typography

- **Display / Hero:** Barlow 700, `tracking-[-0.04em]`, `leading-[0.95]`. Segunda linha (ou palavra-chave) em Instrument Serif itálico 400, sem tracking negativo.
- **Accent:** Instrument Serif itálico só em títulos (hero e H1 de página), uma vez por título. Nunca em texto corrido, botões ou tabelas.
- **Body:** Barlow 400, 16px/1.6, no máximo 72ch por linha. Subtexto do hero em 18px.
- **Nav / labels:** Barlow 500, 0.875rem.
- **Monospace:** JetBrains Mono para valores, códigos (IBGE, emenda) e números em tabela (`tabular-nums`).

Escala: Hero clamp(2.5rem, 6vw, 5.25rem) · H1 2.25rem · H2 1.5rem · Body 1rem/1.6 · Small 0.875rem.

Fontes carregadas com `next/font/google` (`--font-barlow`, `--font-instrument-serif`, `--font-jetbrains-mono`), com fallback para a pilha do sistema.

## Layout

- **Grid:** CSS Grid. Conteúdo em até 1280px centralizado, 1.5rem de margem lateral.
- **Wrapper das páginas:** o layout já tem `<main id="conteudo">`; as páginas não criam outro `<main>` e envolvem o conteúdo em `mx-auto flex w-full max-w-7xl flex-col gap-[clamp(3rem,6vw,5rem)] px-6 py-[clamp(2.5rem,6vw,5rem)]`.
- **Hero da home:** bloco oliva escuro `rounded-2xl`, `min-h-[90dvh]` no desktop (sem `h-screen`), conteúdo centralizado, título em duas linhas, subtexto 18px centralizado, CTA pill branco + CTA escuro com seta 45° em círculo.
- **Ritmo:** unidade base 0.5rem (8px). Entre seções, clamp(4rem, 8vw, 8rem).
- **Sem 3 colunas iguais** em seções de destaque; use zig-zag ou grid assimétrico.
- **Mobile:** tudo vira uma coluna abaixo de 768px, sem rolagem horizontal da página (tabelas largas rolam dentro da própria região, focável pelo teclado).
- **z-index:** base (0) / sticky-nav (100) / overlay (200) / modal (300) / toast (500).

## Elevation & Depth

Leve. Sombras nunca passam de `0 2px 8px rgba(0,0,0,0.08)`.

- **Sombras:** `shadow-soft` = 0 1px 3px rgba(0,0,0,0.06); `shadow-lift` = 0 2px 8px rgba(0,0,0,0.08), em hover e na navbar flutuante.
- **Física:** ease-out (aproximação da spring 120/20 do original), 200-480ms.
- **Entrada:** fade + translate-Y 16px → 0 em 480ms (`animate-enter`, cascata com `style={{ "--stagger": i }}` de 100ms).
- **Hover:** `scale(1.03)` só em CTAs do hero e cards clicáveis, mais `shadow-lift`, em 200ms.
- **Performance:** só `transform` e `opacity` animam. `prefers-reduced-motion` desliga tudo.
- **Ao rolar:** blocos abaixo da dobra levam `data-revelar` e entram ao aparecer na tela (`RevelarAoRolar`, com `inView` + `motion/mini`). Só some o que está fora da tela e com JS rodando; sem JS ou impressão, nada fica escondido.
- **Motion (`motion/react`):** usar `m.*` (o `LazyMotion` com `domAnimation` está no layout, em modo strict), nunca `motion.*`. Para trocas de estado (`AnimatePresence`) e indicadores que deslizam (`layoutId`); entrada simples continua em CSS.
- **Preferência da pessoa:** menu de aparência do header, "Ligadas / Desligadas (mais leve) / Sistema" (`lib/animacoes.ts`). Vira `data-animacoes` no `<html>` antes da pintura; `motion-safe:`/`motion-reduce:` e o `MotionConfig` seguem esse atributo. "Desligadas" também tira o `backdrop-filter`.

## Shapes

`--radius: 0.75rem` (12px). Navbar flutuante e hero: 16px (`rounded-2xl`). CTAs do hero e ícone da seta: `rounded-full`.

## Components

- **Botão primário:** 12px de raio, fundo oliva escuro, texto branco (no escuro, off-white com texto charcoal), peso 600. Hover 8% mais claro/escuro + `shadow-lift`. Active: translate de -1px. Sem glow.
- **CTA do hero (pill):** branco, texto oliva escuro, `rounded-full`, ícone à esquerda.
- **CTA escuro com seta:** fundo oliva #262C12 (ou #30361F sobre fundo oliva), texto branco, seta `ArrowUpRight` dentro de um círculo branco.
- **Botão secundário / ghost:** contorno de 1.5px na cor de borda, texto na cor principal, hover com fundo sutil.
- **Cards:** 12px de raio, fundo `card`, borda de 1px, `shadow-soft`.
- **Inputs:** rótulo acima, borda de 1px, foco com anel de 2px na cor `ring` e offset de 2px, erro em texto vermelho abaixo (ligado por `aria-describedby`). Sem label flutuante.
- **Navegação:** barra do topo branca flutuante (margem, 16px de raio, `shadow-lift`). Item ativo com fundo limão suave (`sidebar-accent`), peso 500 e `aria-current="page"`.
- **Badges:** `rounded-full`; `success` para valores pagos e situações positivas.
- **Tabelas:** `<caption>`, `<th scope>`, números alinhados à direita em mono.
- **Skeletons:** shimmer no tamanho do componente. Sem spinner circular.
- **Empty states:** ícone, texto explicativo e ação.

## Do's and Don'ts

- Sem emoji na UI; ícones Lucide com `aria-hidden` quando decorativos.
- Sem gradientes decorativos; cor chapada.
- Sem preto puro (#000000); use o oliva #262C12 no claro e #1A1A1A no escuro.
- Sem sombra acima de 0 2px 8px rgba(0,0,0,0.08).
- Sem `h-screen`; use `min-h-[100dvh]` / `min-h-[90dvh]`.
- Sem vídeo de fundo com autoplay.
- Sem clichês de copy ("Eleve", "Sem complicação", "Próxima geração").
- Cor não pode ser o único meio de transmitir informação.

- Faça o título do hero em duas vozes: Barlow bold + Instrument Serif itálico.
- Faça a navbar branca flutuante com 16px de raio.
- Faça contraste AA verificado nos dois temas (texto ≥ 4.5:1, componentes ≥ 3:1).
- Faça foco sempre visível.

## Use Case

Portal público de transparência: consulta de emendas, parlamentares, votos, presença e orçamento por qualquer pessoa.

<!-- Base: https://designmd.app.br/library/logoisum-video-agency-hero · designmd.app -->
