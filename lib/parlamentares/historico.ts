import type { HistoricoDeputadoApi } from "../camara/types";

// Trocas de partido e mudanças de situação no mandato, no mesmo formato para as duas Casas.

export interface PeriodoPartido {
  partido: string;
  /** AAAA-MM-DD */
  desde: string;
  /** null: é o partido atual (ou o último registrado). */
  ate: string | null;
}

export interface MudancaSituacao {
  /** AAAA-MM-DD */
  data: string;
  /** "Exercício", "Licença", "Afastado"... */
  situacao: string;
  descricao: string | null;
}

const dia = (dataHora: string) => dataHora.slice(0, 10);

/** Junta registros seguidos do mesmo partido em um período; o período termina quando começa o seguinte. */
export function periodosCamara(historico: HistoricoDeputadoApi[]): PeriodoPartido[] {
  const ordenado = historico.filter((h) => h.siglaPartido?.trim()).toSorted((a, b) => a.dataHora.localeCompare(b.dataHora));
  const periodos: PeriodoPartido[] = [];
  for (const h of ordenado) {
    const partido = h.siglaPartido!.trim();
    const atual = periodos.at(-1);
    if (atual?.partido === partido) continue;
    if (atual) atual.ate = dia(h.dataHora);
    periodos.push({ partido, desde: dia(h.dataHora), ate: null });
  }
  // A Câmara às vezes lança dois partidos no mesmo dia (ex.: o antigo e o novo na posse); o que dura
  // zero dias é registro administrativo, não troca. Sem ele, períodos vizinhos do mesmo partido se juntam.
  const reais: PeriodoPartido[] = [];
  for (const periodo of periodos.filter((p) => p.ate !== p.desde)) {
    const anterior = reais.at(-1);
    if (anterior?.partido === periodo.partido) anterior.ate = periodo.ate;
    else {
      if (anterior) anterior.ate = periodo.desde;
      reais.push({ ...periodo });
    }
  }
  return reais;
}

/** Cada vez que a situação muda (posse, licença, afastamento, volta ao exercício, fim de mandato). */
export function mudancasCamara(historico: HistoricoDeputadoApi[]): MudancaSituacao[] {
  const ordenado = historico.toSorted((a, b) => a.dataHora.localeCompare(b.dataHora));
  const mudancas: MudancaSituacao[] = [];
  let anterior: string | null = null;
  for (const h of ordenado) {
    const situacao = h.situacao?.trim();
    if (!situacao || situacao === anterior) continue;
    anterior = situacao;
    mudancas.push({ data: dia(h.dataHora), situacao, descricao: h.descricaoStatus?.trim() || null });
  }
  return mudancas;
}

export function periodosSenado(filiacoes: { partido: string; desde: string; ate: string | null }[]): PeriodoPartido[] {
  return filiacoes
    .toSorted((a, b) => a.desde.localeCompare(b.desde))
    .map(({ partido, desde, ate }) => ({ partido, desde, ate }));
}
