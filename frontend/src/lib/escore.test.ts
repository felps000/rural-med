import { describe, expect, it } from 'vitest'
import { calcularEscore, type DadosTriagem } from './escore'

// Mesmos casos de backend/.../comum/RegrasDeNegocioTest.java: se um mudar, o outro avisa.
const leve = (mudancas: Partial<DadosTriagem> = {}): DadosTriagem => ({
  queixaPrincipal: 'Coceira',
  temperatura: 36.5,
  pressaoSistolica: 120,
  pressaoDiastolica: 80,
  frequenciaCardiaca: 80,
  saturacaoO2: 98,
  dor: 1,
  comorbidades: [],
  ...mudancas,
})

describe('calcularEscore (espelho da regra Java)', () => {
  it.each([
    [89, 25, true],
    [90, 12, false],
    [94, 12, false],
    [95, 0, false],
  ])('saturação %i soma %i pontos (prioritário: %s)', (saturacaoO2, pontos, prioritario) => {
    const escore = calcularEscore(leve({ saturacaoO2 }), 30)
    expect(escore.pontos).toBe(pontos)
    expect(escore.prioritario).toBe(prioritario)
  })

  it.each([
    [49, 15],
    [50, 0],
    [120, 0],
    [121, 15],
  ])('frequência %i soma %i pontos', (frequenciaCardiaca, pontos) => {
    expect(calcularEscore(leve({ frequenciaCardiaca }), 30).pontos).toBe(pontos)
  })

  it.each([
    [4, 0],
    [5, 6],
    [7, 6],
    [8, 12],
  ])('dor %i soma %i pontos', (dor, pontos) => {
    expect(calcularEscore(leve({ dor }), 30).pontos).toBe(pontos)
  })

  it.each([
    [64, 0],
    [65, 10],
  ])('idade %i soma %i pontos', (idade, pontos) => {
    expect(calcularEscore(leve(), idade).pontos).toBe(pontos)
  })

  it('caso leve fica sem pontos e sem prioridade', () => {
    const escore = calcularEscore(leve(), 40, 'mancha vermelha')
    expect(escore).toEqual({ pontos: 0, prioritario: false, fatores: [] })
  })

  it('falta de ar é sinal de alerta e aparece nos motivos', () => {
    const escore = calcularEscore(leve(), 30, 'falta de ar ao caminhar')
    expect(escore.prioritario).toBe(true)
    expect(escore.fatores).toContain('relato: falta de ar (+15)')
  })

  it('caso da landing page: 71 anos, falta de ar, febre, saturação 92, hipertensão', () => {
    const escore = calcularEscore(
      leve({
        queixaPrincipal: 'Falta de ar e cansaço',
        temperatura: 37.9,
        pressaoSistolica: 158,
        pressaoDiastolica: 96,
        frequenciaCardiaca: 112,
        saturacaoO2: 92,
        dor: 4,
        comorbidades: ['hipertensão'],
      }),
      71,
    )
    expect(escore.pontos).toBe(50)
    expect(escore.prioritario).toBe(true)
  })
})
