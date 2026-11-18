import { describe, expect, it } from 'vitest'
import { classificar } from './manchester'

const sinais = { saturacaoO2: 97, pressaoSistolica: 120, pressaoDiastolica: 80 }

describe('classificar (Protocolo de Manchester)', () => {
  it.each([
    [{ escore: 30, prioritario: true, dadosTriagem: { ...sinais, saturacaoO2: 88 } }, 'vermelho'],
    [{ escore: 20, prioritario: true, dadosTriagem: { ...sinais, pressaoSistolica: 185 } }, 'vermelho'],
    [{ escore: 20, prioritario: true, dadosTriagem: { ...sinais, pressaoSistolica: 85 } }, 'vermelho'],
    [{ escore: 15, prioritario: true, dadosTriagem: sinais }, 'laranja'],
    [{ escore: 55, prioritario: true, dadosTriagem: sinais }, 'laranja'],
    [{ escore: 25, prioritario: false, dadosTriagem: sinais }, 'amarelo'],
    [{ escore: 10, prioritario: false, dadosTriagem: sinais }, 'verde'],
    [{ escore: 9, prioritario: false, dadosTriagem: sinais }, 'azul'],
    [{ escore: 9, prioritario: false }, 'azul'],
  ] as const)('%o vira %s', (caso, cor) => {
    expect(classificar(caso).cor).toBe(cor)
  })
})
