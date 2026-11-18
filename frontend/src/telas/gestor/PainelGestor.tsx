import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Moldura } from '../../app/Moldura'
import { api, mensagemDe } from '../../lib/api'
import { hojeIso, moeda } from '../../lib/formato'
import type { LinhaExtrato, Relatorio } from '../../lib/tipos'
import { useAvisar } from '../../ui/avisos'
import { Botao, CabecalhoPagina, Campo, Carregando, Celula, Linha, Superficie, Tabela, Vazio } from '../../ui/base'

export default function PainelGestor() {
  return (
    <Moldura abas={[{ id: 'relatorios', rotulo: 'Relatórios' }]} atual="relatorios" aoTrocar={() => {}}>
      <CabecalhoPagina titulo="Indicadores" descricao="Atendimentos a distância e o que eles evitaram em viagens." />
      <Atendimentos />
      <Repasses />
    </Moldura>
  )
}

function Atendimentos() {
  const avisar = useAvisar()
  const hoje = hojeIso()
  const [inicio, setInicio] = useState(hoje.slice(0, 8) + '01')
  const [fim, setFim] = useState(hoje)
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)

  const gerar = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault()
      api<Relatorio>(`/api/relatorios/atendimentos?inicio=${inicio}&fim=${fim}`)
        .then(setRelatorio)
        .catch((falha) => avisar(mensagemDe(falha), 'erro'))
    },
    [inicio, fim, avisar],
  )

  // Gera o relatório do mês atual ao abrir a tela (as datas mudam só quando o gestor pede).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => gerar(), [])

  const indicadores = relatorio && [
    { valor: relatorio.triagens, rotulo: 'triagens' },
    { valor: relatorio.prioritarias, rotulo: 'casos prioritários' },
    { valor: relatorio.laudosEmitidos, rotulo: 'laudos emitidos' },
    { valor: relatorio.viagensTfdEvitadas, rotulo: 'viagens de TFD evitadas' },
  ]

  return (
    <section aria-labelledby="titulo-atendimentos" className="space-y-5">
      <form onSubmit={gerar} className="flex flex-wrap items-end gap-3">
        <h2 id="titulo-atendimentos" className="sr-only">Atendimentos no período</h2>
        <Campo rotulo="De" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        <Campo rotulo="Até" type="date" value={fim} onChange={(e) => setFim(e.target.value)} required />
        <Botao type="submit" variante="secundario">Atualizar</Botao>
      </form>

      {!relatorio || !indicadores ? (
        <Carregando />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col justify-between rounded-[26px] bg-floresta p-7 text-osso shadow-e2">
            <p className="text-[14px] text-osso/75">Economia estimada com transporte</p>
            <p className="tabular mt-6 text-[clamp(2.6rem,6vw,4.4rem)] leading-none font-semibold tracking-tight">{moeda(relatorio.economiaEstimada)}</p>
            <p className="mt-4 max-w-[44ch] text-[14px] text-osso/75">
              Cada laudo a distância conta como uma viagem de Tratamento Fora do Domicílio evitada, pelo custo médio do município do paciente.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {indicadores.map((i) => (
              <Superficie key={i.rotulo}>
                <dd className="tabular text-[2.2rem] leading-none font-semibold tracking-tight">{i.valor}</dd>
                <dt className="mt-2 text-[14px] text-tinta-suave">{i.rotulo}</dt>
              </Superficie>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}

function Repasses() {
  const avisar = useAvisar()
  const [mes, setMes] = useState(hojeIso().slice(0, 7))
  const [linhas, setLinhas] = useState<LinhaExtrato[] | null>(null)

  const carregar = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault()
      const [ano, m] = mes.split('-')
      api<LinhaExtrato[]>(`/api/relatorios/repasses?ano=${ano}&mes=${Number(m)}`)
        .then(setLinhas)
        .catch((falha) => avisar(mensagemDe(falha), 'erro'))
    },
    [mes, avisar],
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => carregar(), [])

  const total = (linhas ?? []).reduce((soma, l) => soma + Number(l.total), 0)

  return (
    <section aria-labelledby="titulo-repasses" className="mt-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="titulo-repasses" className="text-2xl font-semibold tracking-tight">Repasses aos médicos</h2>
          <p className="mt-1 text-tinta-suave">Valor por laudo emitido no mês.</p>
        </div>
        <form onSubmit={carregar} className="flex items-end gap-3">
          <Campo rotulo="Mês" type="month" value={mes} onChange={(e) => setMes(e.target.value)} required />
          <Botao type="submit" variante="secundario">Ver</Botao>
        </form>
      </div>
      {linhas === null ? (
        <Carregando />
      ) : linhas.length === 0 ? (
        <Vazio>Nenhum laudo neste mês.</Vazio>
      ) : (
        <>
          <Tabela colunas={['Médico', 'Especialidade', 'Laudos', 'Valor por laudo', 'Total']}>
            {linhas.map((l) => (
              <Linha key={l.medico}>
                <Celula><span className="font-medium">{l.medico}</span></Celula>
                <Celula rotulo="Especialidade">{l.especialidade}</Celula>
                <Celula rotulo="Laudos"><span className="tabular">{l.laudos}</span></Celula>
                <Celula rotulo="Valor por laudo"><span className="tabular">{moeda(l.valorPorLaudo)}</span></Celula>
                <Celula rotulo="Total"><span className="tabular font-semibold">{moeda(l.total)}</span></Celula>
              </Linha>
            ))}
          </Tabela>
          <p className="mt-4 text-right text-lg">
            Total do mês: <span className="tabular font-semibold">{moeda(total)}</span>
          </p>
        </>
      )}
    </section>
  )
}
