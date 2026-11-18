import type { Paciente, PacienteResumo, Prazo, StatusDossie } from './tipos'

export const dataHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'

export const moeda = (valor: number | string | null | undefined) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const idRuralMed = (p: Pick<Paciente | PacienteResumo, 'identificadorUnico'>) =>
  'RM-' + (p.identificadorUnico ?? '').replace(/-/g, '').toUpperCase()

export const NOMES_STATUS: Record<StatusDossie, string> = {
  SINCRONIZADO: 'Recebido na UBS',
  AGUARDANDO_ENCAMINHAMENTO: 'Aguardando médico',
  ENCAMINHADO: 'Encaminhado',
  LAUDO_EMITIDO: 'Laudo emitido',
}

export type NivelRisco = 'alto' | 'medio' | 'baixo'

export function risco(d: { prioritario: boolean; escore: number }): { nivel: NivelRisco; rotulo: string } {
  if (d.prioritario) return { nivel: 'alto', rotulo: 'Urgente' }
  if (Number(d.escore) >= 25) return { nivel: 'medio', rotulo: 'Atenção' }
  return { nivel: 'baixo', rotulo: 'Baixo risco' }
}

export function textoPrazo(prazo: Prazo | null | undefined): { texto: string; tom: 'neutro' | 'alerta' | 'perigo' } | null {
  if (!prazo || prazo.situacao === 'SEM_PRAZO' || prazo.minutosRestantes == null) return null
  const minutos = Math.abs(prazo.minutosRestantes)
  const horas = Math.floor(minutos / 60)
  if (prazo.situacao === 'ATRASADO') return { texto: 'Prazo vencido', tom: 'perigo' }
  if (prazo.situacao === 'ALERTA') return { texto: `Restam ${horas}h${String(minutos % 60).padStart(2, '0')}`, tom: 'alerta' }
  return { texto: `Restam ${horas}h`, tom: 'neutro' }
}

export function cpfValido(cpf: string) {
  const n = cpf.replace(/\D/g, '')
  if (!/^\d{11}$/.test(n) || /^(\d)\1{10}$/.test(n)) return false
  const digito = (tamanho: number) => {
    let soma = 0
    for (let i = 0; i < tamanho; i++) soma += Number(n[i]) * (tamanho + 1 - i)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return digito(9) === Number(n[9]) && digito(10) === Number(n[10])
}

export const hojeIso = () => new Date().toISOString().slice(0, 10)
