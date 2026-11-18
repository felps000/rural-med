/**
 * Cópia fiel de RegrasDeNegocio.calcularEscore (backend). A landing page usa a mesma
 * regra do sistema para que a triagem demonstrada seja real, não ilustrativa.
 * Se a regra mudar no backend, mude aqui também (há teste comparando os dois).
 */
export interface DadosTriagem {
  queixaPrincipal: string
  temperatura: number
  pressaoSistolica: number
  pressaoDiastolica: number
  frequenciaCardiaca: number
  saturacaoO2: number
  dor: number
  comorbidades: string[]
}

export interface Escore {
  pontos: number
  prioritario: boolean
  fatores: string[]
}

export const LIMITE_PRIORITARIO = 50

export function calcularEscore(d: DadosTriagem, idade: number, relato = ''): Escore {
  const fatores: string[] = []
  let pontos = 0
  let sinalDeAlerta = false
  const somar = (valor: number, fator: string, alerta = false) => {
    pontos += valor
    fatores.push(`${fator} (+${valor})`)
    if (alerta) sinalDeAlerta = true
  }

  if (idade >= 65) somar(10, 'idade 65 anos ou mais')

  if (d.temperatura >= 39) somar(15, 'febre alta')
  else if (d.temperatura >= 37.8) somar(8, 'febre')

  if (d.saturacaoO2 < 90) somar(25, 'saturação de O2 crítica', true)
  else if (d.saturacaoO2 <= 94) somar(12, 'saturação de O2 baixa')

  if (d.frequenciaCardiaca > 120 || d.frequenciaCardiaca < 50) somar(15, 'frequência cardíaca alterada')

  if (d.pressaoSistolica >= 180 || d.pressaoDiastolica >= 110) somar(20, 'pressão muito alta', true)
  else if (d.pressaoSistolica < 90) somar(20, 'pressão muito baixa', true)

  if (d.dor >= 8) somar(12, 'dor intensa')
  else if (d.dor >= 5) somar(6, 'dor moderada')

  for (const doenca of d.comorbidades) somar(5, `comorbidade: ${doenca}`)

  const texto = `${relato} ${d.queixaPrincipal}`.toLowerCase()
  if (texto.includes('dor no peito')) somar(15, 'relato: dor no peito', true)
  if (texto.includes('falta de ar')) somar(15, 'relato: falta de ar', true)
  if (texto.includes('desmai')) somar(12, 'relato: desmaio', true)
  if (texto.includes('sangra')) somar(10, 'relato: sangramento')

  return { pontos, prioritario: pontos >= LIMITE_PRIORITARIO || sinalDeAlerta, fatores }
}
