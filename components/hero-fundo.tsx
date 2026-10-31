/**
 * Linhas de grade e círculos concêntricos atrás do hero (no lugar do vídeo do original); só decoração.
 * Os círculos usam o limão do ícone (--marca), como um eco do selo; a grade continua neutra.
 * `grade={false}` desenha só os círculos, para quando a grade já cobre a página inteira (ver FundoGrade).
 */
export function HeroFundo({ grade = true }: { grade?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      data-decorativo
      className="pointer-events-none absolute inset-0 -z-10 size-full text-border"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 800"
    >
      {grade && (
        <>
          <defs>
            <pattern id="hero-grade" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M80 0H0V80" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1200" height="800" fill="url(#hero-grade)" opacity="0.5" />
        </>
      )}
      <g fill="none" stroke="var(--marca)" strokeOpacity="0.7" strokeWidth="1.5">
        <circle cx="600" cy="400" r="220" />
        <circle cx="600" cy="400" r="340" />
        <circle cx="600" cy="400" r="460" />
      </g>
    </svg>
  );
}

/** Só a grade, em quadros de 80px que se repetem sem esticar, para cobrir um bloco de qualquer altura. */
export function FundoGrade() {
  return (
    <svg aria-hidden="true" data-decorativo className="pointer-events-none absolute inset-0 -z-10 size-full text-border">
      <defs>
        <pattern id="fundo-grade" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M80 0H0V80" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#fundo-grade)" opacity="0.5" />
    </svg>
  );
}
