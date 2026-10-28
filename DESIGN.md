---
version: "alpha"
name: "Logoisum Video Agency Hero (portal)"
description: "Logoisum Video Agency Hero (designmd.app.br/library/logoisum-video-agency-hero) adaptado para um portal público: monocromático charcoal, navbar branca flutuante, Barlow com destaque em Instrument Serif itálico, cantos de 12px e contraste AA verificado."
colors:
  primary: "#222222"
  secondary: "#F5F5F5"
  neutral: "#666666"
  surface: "#FFFFFF"
  ink: "#222222"
  deep: "#333333"
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

Base do Logoisum Video Agency Hero: estética premium e limpa de agência, quase toda em branco e charcoal, com navbar branca flutuante e um título em duas vozes (Barlow bold apertado + Instrument Serif itálico). O original mostra um vídeo de fundo em tela cheia. Aqui não há vídeo: o hero usa fundo charcoal com um SVG estático, porque o portal é público, precisa carregar rápido em conexões fracas e não pode depender de movimento para comunicar.

- Density: 3/10 — Airy
- Variance: 3/10 — Restrained
- Motion: 5/10 — Moderado (o original é 6; reduzido por acessibilidade)

- **Style:** Agency, Floating White Navbar, Instrument Serif Italic accent, Minimal Premium, Monochrome
- **Light/Dark:** ✓ Full / ✓ Full

## Colors

Tokens em `app/globals.css`. Monocromático: a cor só aparece para significado (sucesso, erro, gráficos) e, como acento, para dizer em que seção do portal o visitante está (ver "Cores das seções"). Contraste medido nos dois temas:

| Papel | Claro | Escuro | Uso |
|---|---|---|---|
| Fundo | #FFFFFF | #1A1A1A | `background` (nunca preto puro) |
| Superfície | #F5F5F5 | #222222 | `muted`, `secondary`, `sidebar` |
| Card | #FFFFFF | #222222 | `card`, `popover` |
| Texto | #222222 (15,9:1) | #F5F5F5 (15,6:1) | `foreground` |
| Texto secundário | #666666 (5,7:1; 5,3:1 sobre #F5F5F5) | #A6A6A6 (7,5:1) | `muted-foreground` |
| Primário | #222222, texto branco 15,9:1 | #F5F5F5, texto #222 15,9:1 | `primary`, `ring`: botões e foco |
| Sucesso | #2F6B47, texto branco 6,4:1 | #7CC497, texto escuro 8,9:1 | valor pago, situação positiva |
| Erro | #B3362F, texto branco 5,9:1 | #EE8C82, texto escuro 7,3:1 | `destructive` |
| Gráficos | escala de cinzas + sucesso/erro | idem invertido | sempre com rótulo em texto |
| Borda | #E5E5E5 (decorativa) / input #8A8A8A (3,4:1) | #333333 / input #737373 (3,6:1) | `border`, `input` |

Cor nunca é o único sinal: todo estado tem também texto ou ícone.

### Cores das seções

Cada área do portal tem um acento próprio, para o visitante saber de relance onde está. A página marca a seção no elemento raiz com `data-secao`, e os utilitários `text-secao`, `border-secao` e `bg-secao-suave` usam a cor dela. A sidebar usa as cores fixas (`text-secao-<nome>`) nos ícones.

| Seção | Páginas | Claro (acento / suave) | Escuro (acento / suave) | Contraste do acento |
|---|---|---|---|---|
| Empresas | `/` (consulta CNPJ) | #2453B3 / #EBF0FA | #93B1EC / #1F2940 | claro 7,1:1 · escuro 8,1:1 |
| Parlamentares | `/parlamentares`, perfis | #6A3FB8 / #F1ECFA | #B9A0EE / #2A2340 | claro 7,0:1 · escuro 7,7:1 |
| Estados e cidades | `/estados`, estado, cidade | #1D6683 / #E6F2F7 | #79BFDC / #172C36 | claro 6,4:1 · escuro 8,5:1 |
| Orçamento e emendas | `/orcamento`, `/emendas-pix` | #865418 / #FBF1E2 | #E3AD5C / #352816 | claro 6,4:1 · escuro 8,6:1 |
| Glossário | `/glossario` | #A12D6C / #FBEAF3 | #EE93C2 / #3A1F2D | claro 6,8:1 · escuro 7,9:1 |

Contraste do acento: claro sobre #FFFFFF, escuro sobre #1A1A1A. Sobre o fundo suave da própria seção, fica entre 5,6:1 e 7,1:1 nos dois temas.

Regras:
- **Uso:** só como acento (rótulo do topo da página, ícone, borda fina de destaque). Nada de fundo grande colorido nem gradiente. O fundo suave serve só para pequenas áreas, como um chip.
- **Saturação:** até 80%.
- **Matiz:** a pelo menos 29° do vermelho de erro e 52° do verde de sucesso, para não ser confundida com estado.
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
- **Hero da home:** bloco charcoal `rounded-2xl`, `min-h-[90dvh]` no desktop (sem `h-screen`), conteúdo centralizado, título em duas linhas, subtexto 18px centralizado, CTA pill branco + CTA escuro com seta 45° em círculo.
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

## Shapes

`--radius: 0.75rem` (12px). Navbar flutuante e hero: 16px (`rounded-2xl`). CTAs do hero e ícone da seta: `rounded-full`.

## Components

- **Botão primário:** 12px de raio, fundo charcoal, texto branco, peso 600. Hover 8% mais claro/escuro + `shadow-lift`. Active: translate de -1px. Sem glow.
- **CTA do hero (pill):** branco, texto charcoal, `rounded-full`, ícone à esquerda.
- **CTA escuro com seta:** fundo #222 (ou #333 sobre fundo charcoal), texto branco, seta `ArrowUpRight` dentro de um círculo branco.
- **Botão secundário / ghost:** contorno de 1.5px na cor de borda, texto na cor principal, hover com fundo sutil.
- **Cards:** 12px de raio, fundo `card`, borda de 1px, `shadow-soft`.
- **Inputs:** rótulo acima, borda de 1px, foco com anel de 2px na cor `ring` e offset de 2px, erro em texto vermelho abaixo (ligado por `aria-describedby`). Sem label flutuante.
- **Navegação:** barra do topo branca flutuante (margem, 16px de raio, `shadow-lift`). Item ativo com indicador charcoal, peso 500 e `aria-current="page"`.
- **Badges:** `rounded-full`; `success` para valores pagos e situações positivas.
- **Tabelas:** `<caption>`, `<th scope>`, números alinhados à direita em mono.
- **Skeletons:** shimmer no tamanho do componente. Sem spinner circular.
- **Empty states:** ícone, texto explicativo e ação.

## Do's and Don'ts

- Sem emoji na UI; ícones Lucide com `aria-hidden` quando decorativos.
- Sem gradientes decorativos; cor chapada.
- Sem preto puro (#000000); use #222 / #1A1A1A.
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
