import { calcularEscore, type DadosTriagem } from '../lib/escore'

/** Caso de demonstração: um paciente idoso com falta de ar. Valores fictícios, regra real. */
const IDADE = 71
const QUEIXA = 'Falta de ar e cansaço'

interface Etapa {
  inicio: number
  fim: number
}

const ETAPAS = {
  queixa: { inicio: 0.0, fim: 0.14 },
  temperatura: { inicio: 0.14, fim: 0.28 },
  pressao: { inicio: 0.28, fim: 0.42 },
  frequencia: { inicio: 0.42, fim: 0.56 },
  saturacao: { inicio: 0.56, fim: 0.7 },
  dor: { inicio: 0.7, fim: 0.8 },
  comorbidade: { inicio: 0.8, fim: 0.86 },
  resultado: { inicio: 0.86, fim: 0.96 },
} satisfies Record<string, Etapa>

const avanco = (p: number, e: Etapa) => Math.min(1, Math.max(0, (p - e.inicio) / (e.fim - e.inicio)))
const entre = (de: number, ate: number, t: number) => de + (ate - de) * t

interface Props {
  /** 0 a 1: quanto da triagem já foi preenchido (vem da rolagem). */
  progresso: number
  /** Quando o visitante mexe no controle, a saturação dele substitui a do roteiro. */
  saturacaoManual?: number | null
}

export default function TelaTriagem({ progresso, saturacaoManual = null }: Props) {
  const t = (nome: keyof typeof ETAPAS) => avanco(progresso, ETAPAS[nome])

  const queixaVisivel = QUEIXA.slice(0, Math.round(QUEIXA.length * t('queixa')))
  const dados: DadosTriagem = {
    queixaPrincipal: t('queixa') >= 1 ? QUEIXA : '',
    temperatura: Math.round(entre(36.5, 37.9, t('temperatura')) * 10) / 10,
    pressaoSistolica: Math.round(entre(120, 158, t('pressao'))),
    pressaoDiastolica: Math.round(entre(80, 96, t('pressao'))),
    frequenciaCardiaca: Math.round(entre(78, 112, t('frequencia'))),
    saturacaoO2: saturacaoManual ?? Math.round(entre(98, 92, t('saturacao'))),
    dor: Math.round(entre(0, 4, t('dor'))),
    comorbidades: t('comorbidade') >= 1 ? ['hipertensão'] : [],
  }
  const escore = calcularEscore(dados, IDADE)
  const mostrarResultado = t('resultado') > 0 || saturacaoManual !== null
  const opacidadeResultado = saturacaoManual !== null ? 1 : t('resultado')

  const sinais: { rotulo: string; valor: string; unidade: string; etapa: keyof typeof ETAPAS; alterado: boolean }[] = [
    { rotulo: 'Temperatura', valor: dados.temperatura.toFixed(1).replace('.', ','), unidade: '°C', etapa: 'temperatura', alterado: dados.temperatura >= 37.8 },
    { rotulo: 'Pressão', valor: `${dados.pressaoSistolica}/${dados.pressaoDiastolica}`, unidade: 'mmHg', etapa: 'pressao', alterado: false },
    { rotulo: 'Frequência', valor: String(dados.frequenciaCardiaca), unidade: 'bpm', etapa: 'frequencia', alterado: dados.frequenciaCardiaca > 120 || dados.frequenciaCardiaca < 50 },
    { rotulo: 'Saturação', valor: String(dados.saturacaoO2), unidade: '% O₂', etapa: 'saturacao', alterado: dados.saturacaoO2 <= 94 },
  ]

  return (
    <div className="flex h-full flex-col bg-superficie px-4 pt-10 pb-4 text-[13px] text-tinta">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Nova triagem</span>
        <span className="flex items-center gap-1.5 rounded-full bg-osso px-2 py-0.5 text-[11px] text-tinta-suave">
          <span className="size-1.5 rounded-full bg-tinta-suave/60" aria-hidden />
          sem sinal · salvo no aparelho
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-osso px-3 py-2.5">
        <p className="font-semibold">Seu Antônio</p>
        <p className="text-tinta-suave">{IDADE} anos · Microárea 03</p>
      </div>

      <label className="mt-3 block text-[11px] font-medium text-tinta-suave">Queixa principal</label>
      <div className="mt-1 min-h-9 rounded-xl border border-linha bg-white px-3 py-2">
        {queixaVisivel}
        {t('queixa') > 0 && t('queixa') < 1 && <span className="ml-px inline-block h-4 w-px translate-y-0.5 bg-floresta" />}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {sinais.map((s) => (
          <div
            key={s.rotulo}
            className="rounded-xl border border-linha bg-white px-3 py-2 transition-opacity duration-200"
            style={{ opacity: 0.35 + 0.65 * Math.min(1, t(s.etapa) * 3) }}
          >
            <p className="text-[11px] text-tinta-suave">{s.rotulo}</p>
            <p className={`tabular text-lg font-semibold tracking-tight ${s.alterado ? 'text-ambar' : ''}`}>
              {s.valor}
              <span className="ml-1 text-[11px] font-normal text-tinta-suave">{s.unidade}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2 text-[11px]">
        <span className="rounded-full border border-linha bg-white px-2.5 py-1" style={{ opacity: 0.35 + 0.65 * t('dor') }}>
          Dor {dados.dor}/10
        </span>
        <span className="rounded-full border border-linha bg-white px-2.5 py-1" style={{ opacity: 0.35 + 0.65 * t('comorbidade') }}>
          Hipertensão
        </span>
      </div>

      <div
        className="mt-auto rounded-2xl px-3 py-3 transition-colors duration-200"
        style={{
          opacity: mostrarResultado ? opacidadeResultado : 0,
          transform: `translateY(${(1 - opacidadeResultado) * 8}px)`,
          background: escore.prioritario ? 'var(--color-ambar-fundo)' : 'var(--color-osso)',
        }}
        aria-live="polite"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-tinta-suave">Escore de risco</span>
          {escore.prioritario && (
            <span className="rounded-full bg-ambar px-2 py-0.5 text-[11px] font-semibold text-white">Prioritário</span>
          )}
        </div>
        <p className="tabular text-3xl font-semibold tracking-tight">{escore.pontos}</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-tinta-suave">{escore.fatores.join(' · ')}</p>
      </div>
    </div>
  )
}
