import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, baixarArquivo, enviarArquivo, mensagemDe } from '../../lib/api'
import { dataHora, NOMES_STATUS } from '../../lib/formato'
import { classificar } from '../../lib/manchester'
import type { Anexo, AtendimentoHistorico, DadosTriagem, Dossie, Laudo, Prescricao } from '../../lib/tipos'
import { useAvisar } from '../../ui/avisos'
import { Botao, Carregando, Escore, Selo, SeloPrazo, SeloRisco, Superficie, Vazio } from '../../ui/base'

/** Lista de casos ordenada pelo servidor; cada linha abre o detalhe. */
export function ListaCasos({ casos, aoAbrir, vazio }: { casos: Dossie[]; aoAbrir: (d: Dossie) => void; vazio: string }) {
  if (casos.length === 0) return <Vazio>{vazio}</Vazio>
  return (
    <ul className="space-y-3">
      {casos.map((d) => (
        <li key={d.id}>
          <button
            type="button"
            onClick={() => aoAbrir(d)}
            className="flex w-full items-center gap-4 rounded-[22px] bg-white p-4 text-left shadow-e1 ring-1 ring-black/[0.03] transition-[box-shadow,transform] duration-150 ease-saida hover:shadow-e2 active:scale-[0.995] sm:p-5"
          >
            <Escore caso={d} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {d.paciente.nome} <span className="font-normal text-tinta-suave">· {d.paciente.idade} anos</span>
              </p>
              <p className="truncate text-tinta-suave">{d.dadosTriagem.queixaPrincipal}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <SeloRisco caso={d} />
                <Selo>{NOMES_STATUS[d.status]}</Selo>
                <SeloPrazo prazo={d.prazo} />
                {d.especialidade && <Selo>{d.especialidade.nome}</Selo>}
                <span className="text-[12px] text-tinta-suave">{dataHora(d.coletadoEm)}</span>
              </div>
            </div>
            <svg width="8" height="14" viewBox="0 0 8 14" className="shrink-0 text-tinta-suave/50" aria-hidden>
              <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}

function SinaisVitais({ t }: { t: DadosTriagem }) {
  const itens = [
    ['Temperatura', `${String(t.temperatura).replace('.', ',')} °C`],
    ['Pressão', `${t.pressaoSistolica} × ${t.pressaoDiastolica}`],
    ['Freq. cardíaca', `${t.frequenciaCardiaca} bpm`],
    ['Saturação O₂', `${t.saturacaoO2}%`],
    ['Dor', `${t.dor}/10`],
    ['Comorbidades', (t.comorbidades ?? []).join(', ') || 'Nenhuma'],
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <dt className="text-[12px] text-tinta-suave">{rotulo}</dt>
          <dd className="tabular mt-0.5 font-medium">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Resumo clínico de um caso: risco, sinais vitais, critérios do escore e exames. */
export function DetalheDossie({ d }: { d: Dossie }) {
  const r = classificar(d)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold tracking-tight">{d.paciente.nome}</p>
          <p className="mt-0.5 text-tinta-suave">
            {d.paciente.idade} anos · triagem de {d.acs.usuario.nome} em {dataHora(d.coletadoEm)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Selo>{NOMES_STATUS[d.status]}</Selo>
            <SeloPrazo prazo={d.prazo} />
          </div>
        </div>
        <div className="text-center">
          <Escore caso={d} grande />
          <p className="mt-1 text-[12px] font-medium text-tinta-suave">{r.rotulo}</p>
        </div>
      </div>

      <Superficie>
        <h3 className="font-semibold">Triagem</h3>
        <p className="mt-1 mb-4 text-tinta-suave">{d.dadosTriagem.queixaPrincipal}</p>
        <SinaisVitais t={d.dadosTriagem} />
        {d.relato && (
          <p className="mt-4 border-t border-linha/60 pt-4 text-[15px]">
            <span className="text-tinta-suave">Relato: </span>
            {d.relato}
          </p>
        )}
      </Superficie>

      <Superficie>
        <h3 className="font-semibold">Por que este escore</h3>
        {d.fatoresEscore?.length ? (
          <ul className="mt-3 space-y-1.5">
            {d.fatoresEscore.map((f) => (
              <li key={f} className="flex gap-2 text-[15px]">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-floresta" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-tinta-suave">Nenhum sinal de risco.</p>
        )}
        <p className="mt-4 text-[12px] text-tinta-suave">O escore apoia a priorização e não substitui a avaliação clínica.</p>
      </Superficie>

      <Exames dossieId={d.id} />
    </div>
  )
}

export function Exames({ dossieId, somenteLeitura = false }: { dossieId: number; somenteLeitura?: boolean }) {
  const avisar = useAvisar()
  const [anexos, setAnexos] = useState<Anexo[] | null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [chave, setChave] = useState(0)

  const carregar = useCallback(() => {
    api<Anexo[]>(`/api/dossies/${dossieId}/exames`)
      .then(setAnexos)
      .catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [dossieId, avisar])

  useEffect(carregar, [carregar])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!arquivo) return
    setEnviando(true)
    try {
      await enviarArquivo(`/api/dossies/${dossieId}/exames`, arquivo)
      avisar('Exame anexado ao histórico')
      setArquivo(null)
      setChave((k) => k + 1)
      carregar()
    } catch (falha) {
      avisar(mensagemDe(falha), 'erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Superficie>
      <h3 className="font-semibold">Exames e documentos</h3>
      {!somenteLeitura && (
        <form onSubmit={enviar} className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-linha px-3.5 py-2.5 transition-colors focus-within:border-floresta hover:bg-osso">
            <input
              key={chave}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <span className="rounded-full bg-osso px-3 py-1 text-[13px] font-medium whitespace-nowrap">Escolher arquivo</span>
            <span className="truncate text-[14px] text-tinta-suave">{arquivo ? arquivo.name : 'Nenhum arquivo escolhido'}</span>
          </label>
          <Botao type="submit" variante="secundario" pequeno disabled={!arquivo} carregando={enviando}>
            Anexar
          </Botao>
          <p className="w-full text-[12px] text-tinta-suave">PDF, JPG ou PNG, até 10 MB.</p>
        </form>
      )}
      {anexos === null ? (
        <Carregando />
      ) : anexos.length === 0 ? (
        <p className="mt-3 text-[14px] text-tinta-suave">Nenhum exame anexado.</p>
      ) : (
        <ul className="mt-3 divide-y divide-linha/60">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-medium">{a.nomeArquivo}</span>
                <span className="text-[12px] text-tinta-suave">
                  {Math.max(1, Math.round(a.tamanho / 1024))} KB · {dataHora(a.criadoEm)}
                </span>
              </span>
              <Botao
                variante="discreto"
                pequeno
                onClick={() => baixarArquivo(`/api/exames/${a.id}`).catch((e) => avisar(mensagemDe(e), 'erro'))}
              >
                Baixar
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </Superficie>
  )
}

/** Laudo formatado como documento, pronto para imprimir ou salvar em PDF. */
export function DocumentoLaudo({ laudo, nomePaciente }: { laudo: Laudo; nomePaciente: string }) {
  return (
    <article className="documento-laudo rounded-[22px] bg-white p-6 shadow-e1 ring-1 ring-black/[0.03] sm:p-8">
      <header className="flex items-center justify-between border-b border-linha pb-4">
        <span className="flex items-center gap-2 font-semibold">
          <img src="/marca.svg" alt="" className="size-6" /> RuralMed
        </span>
        <span className="text-[12px] tracking-wide text-tinta-suave uppercase">Laudo médico</span>
      </header>
      <dl className="mt-5 grid gap-3 text-[15px]">
        <div>
          <dt className="text-[12px] text-tinta-suave">Paciente</dt>
          <dd className="font-medium">{nomePaciente}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-tinta-suave">CID</dt>
          <dd>{laudo.cid ? `${laudo.cid.codigo} · ${laudo.cid.descricao}` : 'Não informado nesta consulta'}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-tinta-suave">Parecer</dt>
          <dd className="leading-relaxed whitespace-pre-line">{laudo.parecer}</dd>
        </div>
        {laudo.receitas.map((r, i) => (
          <div key={i}>
            <dt className="text-[12px] text-tinta-suave">Receita</dt>
            <dd className="whitespace-pre-line">{r.prescricao}</dd>
            {r.farmaciaPopular && <Selo tom="verde">Verificar disponibilidade no Farmácia Popular</Selo>}
          </div>
        ))}
      </dl>
      <footer className="mt-6 border-t border-linha pt-4 text-[13px]">
        <p className="font-medium">
          {laudo.medico.usuario.nome} · CRM {laudo.medico.crm}/{laudo.medico.ufCrm}
        </p>
        <p className="text-tinta-suave">Emitido em {dataHora(laudo.emitidoEm)}</p>
        <p className="mt-2 font-mono text-[11px] break-all text-tinta-suave">{laudo.assinaturaDigital}</p>
      </footer>
    </article>
  )
}

export function ItemPrescricao({ r }: { r: Prescricao }) {
  return (
    <article className="rounded-2xl bg-osso p-4">
      <p className="font-semibold">{r.medicamento ? `${r.medicamento} · ${r.apresentacao}` : 'Prescrição anterior'}</p>
      {r.dose ? (
        <p className="mt-1 text-[14px] text-tinta-suave">
          {r.dose} · {r.viaAdministracao} · {r.frequencia} · {r.duracao}
        </p>
      ) : (
        <p className="mt-1 text-[14px]">{r.descricao}</p>
      )}
      {r.orientacoes && <p className="mt-1 text-[14px]">{r.orientacoes}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {r.farmaciaPopular && <Selo tom="verde">Farmácia Popular: disponibilidade não verificada</Selo>}
        <span className="text-[12px] text-tinta-suave">Assinada em {dataHora(r.assinadaEm)}</span>
      </div>
    </article>
  )
}

/** Linha do tempo de todos os atendimentos do paciente, de todas as especialidades. */
export function HistoricoPaciente({ pacienteId }: { pacienteId: number }) {
  const [itens, setItens] = useState<{ d: AtendimentoHistorico; exames: Anexo[]; receitas: Prescricao[] }[] | null>(null)
  const [erro, setErro] = useState('')
  const avisar = useAvisar()

  useEffect(() => {
    let ativo = true
    api<AtendimentoHistorico[]>(`/api/pacientes/${pacienteId}/historico`)
      .then((lista) =>
        Promise.all(
          lista.map(async (d) => {
            const [exames, receitas] = await Promise.all([
              api<Anexo[]>(`/api/dossies/${d.id}/exames`),
              api<Prescricao[]>(`/api/dossies/${d.id}/receitas`),
            ])
            return { d, exames, receitas }
          }),
        ),
      )
      .then((r) => ativo && setItens(r))
      .catch((e) => ativo && setErro(mensagemDe(e)))
    return () => {
      ativo = false
    }
  }, [pacienteId])

  if (erro) return <p className="text-[#a3261b]">{erro}</p>
  if (!itens) return <Carregando />
  if (itens.length === 0) return <Vazio>Nenhum atendimento ainda.</Vazio>

  return (
    <ol className="relative space-y-6 border-l border-linha pl-6">
      {itens.map(({ d, exames, receitas }) => (
        <li key={d.id} className="relative">
          <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-floresta ring-4 ring-osso" aria-hidden />
          <p className="text-[12px] text-tinta-suave">{dataHora(d.coletadoEm)}</p>
          <p className="mt-0.5 font-semibold">{d.dadosTriagem.queixaPrincipal}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Selo>{NOMES_STATUS[d.status]}</Selo>
            <SeloRisco caso={d} />
            <Selo>{Math.round(d.escore)} pontos</Selo>
          </div>
          <p className="mt-1.5 text-[14px] text-tinta-suave">
            {d.especialidade ? `Especialidade: ${d.especialidade}` : 'Ainda sem encaminhamento'}
            {d.medicoNome && ` · Médico: ${d.medicoNome}`}
          </p>
          <details className="group mt-3 rounded-2xl bg-white p-4 shadow-e1">
            <summary className="cursor-pointer text-[14px] font-medium text-floresta">Ver detalhes do atendimento</summary>
            <div className="mt-4 space-y-4">
              <SinaisVitais t={d.dadosTriagem} />
              {d.relato && <p className="text-[14px]"><span className="text-tinta-suave">Relato: </span>{d.relato}</p>}
              {d.fatoresEscore?.length > 0 && (
                <p className="text-[14px]"><span className="text-tinta-suave">Fatores do escore: </span>{d.fatoresEscore.join('; ')}</p>
              )}
              {d.laudo ? (
                <div className="rounded-xl bg-osso p-3 text-[14px]">
                  <p className="font-medium">Laudo{d.laudo.cid && ` · CID ${d.laudo.cid.codigo}`}</p>
                  <p className="mt-1 whitespace-pre-line">{d.laudo.parecer}</p>
                </div>
              ) : (
                <p className="text-[14px] text-tinta-suave">Ainda não há laudo neste atendimento.</p>
              )}
            </div>
          </details>
          {receitas.length > 0 && (
            <div className="mt-3 space-y-2">
              {receitas.map((r) => <ItemPrescricao key={r.id} r={r} />)}
            </div>
          )}
          {exames.length > 0 && (
            <ul className="mt-3 space-y-1">
              {exames.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="truncate">{a.nomeArquivo}</span>
                  <Botao variante="discreto" pequeno onClick={() => baixarArquivo(`/api/exames/${a.id}`).catch((e) => avisar(mensagemDe(e), 'erro'))}>
                    Baixar
                  </Botao>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}
