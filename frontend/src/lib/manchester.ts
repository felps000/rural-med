import type { DadosTriagem } from './tipos'

/**
 * Classificação de risco com as 5 cores do Protocolo de Manchester, usado nos prontos-socorros.
 * Usa o escore e a prioridade calculados pelo servidor, mais os sinais vitais de alerta grave.
 */
export type CorManchester = 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul'

export interface Classificacao {
  cor: CorManchester
  rotulo: string
  /** Classes do Tailwind para fundo e texto, com contraste conferido. */
  classes: string
}

export const CLASSIFICACOES: Record<CorManchester, Classificacao> = {
  vermelho: { cor: 'vermelho', rotulo: 'Emergência', classes: 'bg-[#fbe0dd] text-[#9b1c12]' },
  laranja: { cor: 'laranja', rotulo: 'Muito urgente', classes: 'bg-[#ffe6d1] text-[#8f3a00]' },
  amarelo: { cor: 'amarelo', rotulo: 'Urgente', classes: 'bg-[#fff2b8] text-[#6b4f00]' },
  verde: { cor: 'verde', rotulo: 'Pouco urgente', classes: 'bg-[#dcefc8] text-[#1f4e3d]' },
  azul: { cor: 'azul', rotulo: 'Não urgente', classes: 'bg-[#dde9f8] text-[#1c4a7e]' },
}

/** Sinais que, sozinhos, colocam o caso em emergência (mesmos limites da regra do servidor). */
export function temAlertaGrave(d?: Partial<DadosTriagem> | null) {
  if (!d) return false
  return (
    (d.saturacaoO2 != null && d.saturacaoO2 < 90) ||
    (d.pressaoSistolica != null && (d.pressaoSistolica >= 180 || d.pressaoSistolica < 90)) ||
    (d.pressaoDiastolica != null && d.pressaoDiastolica >= 110)
  )
}

export function classificar(caso: { escore: number; prioritario: boolean; dadosTriagem?: Partial<DadosTriagem> | null }): Classificacao {
  if (temAlertaGrave(caso.dadosTriagem)) return CLASSIFICACOES.vermelho
  if (caso.prioritario) return CLASSIFICACOES.laranja
  const escore = Number(caso.escore)
  if (escore >= 25) return CLASSIFICACOES.amarelo
  if (escore >= 10) return CLASSIFICACOES.verde
  return CLASSIFICACOES.azul
}
