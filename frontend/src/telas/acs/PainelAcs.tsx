import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Moldura, useAba, type Aba } from '../../app/Moldura'
import { api, mensagemDe } from '../../lib/api'
import { calcularEscore } from '../../lib/escore'
import { classificar } from '../../lib/manchester'
import type { Dossie, Paciente, ResultadoSincronizacao } from '../../lib/tipos'
import { useAvisar } from '../../ui/avisos'
import { AreaTexto, Botao, CabecalhoPagina, Campo, Carregando, Escore, Marcador, Modal, Selecao, Superficie } from '../../ui/base'
import { DetalheDossie, DocumentoLaudo, ListaCasos } from '../comum/Clinico'
import Pacientes from '../comum/Pacientes'

const ABAS: Aba[] = [
  { id: 'triagem', rotulo: 'Nova triagem' },
  { id: 'enviadas', rotulo: 'Minhas triagens' },
  { id: 'pacientes', rotulo: 'Pacientes' },
]

const COMORBIDADES = ['diabetes', 'hipertensão', 'cardiopatia', 'doença pulmonar']
const CHAVE_FILA = 'ruralmed.filaTriagens'
const CHAVE_PACIENTES = 'ruralmed.pacientesOffline'

interface TriagemLocal {
  idLocal: string
  pacienteId: number
  pacienteNome: string
  coletadoEm: string
  relato: string
  dados: {
    queixaPrincipal: string
    temperatura: number
    pressaoSistolica: number
    pressaoDiastolica: number
    frequenciaCardiaca: number
    saturacaoO2: number
    dor: number
    comorbidades: string[]
  }
}

/* A fila fica no aparelho (localStorage) até haver conexão com o servidor (RN01, RNF02). */
const lerFila = (): TriagemLocal[] => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_FILA) ?? '[]')
  } catch {
    return []
  }
}
const gravarFila = (fila: TriagemLocal[]) => localStorage.setItem(CHAVE_FILA, JSON.stringify(fila))

async function servidorDisponivel() {
  if (!navigator.onLine) return false
  try {
    await api('/api/health')
    return true
  } catch {
    return false
  }
}

export default function PainelAcs() {
  const [aba, irPara] = useAba(ABAS)
  const avisar = useAvisar()
  const [pendentes, setPendentes] = useState(() => lerFila().length)
  const [online, setOnline] = useState(navigator.onLine)
  const [versaoTriagens, setVersaoTriagens] = useState(0)
  const enviando = useRef(false)

  const sincronizar = useCallback(async () => {
    const fila = lerFila()
    setPendentes(fila.length)
    if (fila.length === 0 || enviando.current) return
    enviando.current = true
    try {
      if (!(await servidorDisponivel())) return
      const resultados = await api<ResultadoSincronizacao[]>('/api/triagens/sincronizar', 'POST', fila)
      const resolvidas = new Set(resultados.map((r) => r.idLocal))
      gravarFila(lerFila().filter((t) => !resolvidas.has(t.idLocal)))
      const enviadas = resultados.filter((r) => r.situacao !== 'REJEITADO').length
      if (enviadas > 0) avisar(`${enviadas} triagem(ns) enviada(s) para a UBS`)
      resultados.filter((r) => r.situacao === 'REJEITADO').forEach((r) => avisar(`Recusada: ${r.mensagem}`, 'erro'))
      setVersaoTriagens((v) => v + 1)
    } catch {
      avisar('Não foi possível enviar agora. A triagem continua salva no aparelho.', 'alerta')
    } finally {
      enviando.current = false
      setPendentes(lerFila().length)
    }
  }, [avisar])

  useEffect(() => {
    const ficouOnline = () => {
      setOnline(true)
      sincronizar()
    }
    const ficouOffline = () => setOnline(false)
    window.addEventListener('online', ficouOnline)
    window.addEventListener('offline', ficouOffline)
    sincronizar()
    return () => {
      window.removeEventListener('online', ficouOnline)
      window.removeEventListener('offline', ficouOffline)
    }
  }, [sincronizar])

  return (
    <Moldura abas={ABAS} atual={aba} aoTrocar={irPara}>
      <FaixaConexao pendentes={pendentes} online={online} aoEnviar={sincronizar} />
      {aba === 'triagem' && (
        <NovaTriagem
          aoSalvar={(t) => {
            gravarFila([...lerFila(), t])
            avisar('Triagem salva no aparelho')
            sincronizar()
          }}
        />
      )}
      {aba === 'enviadas' && <MinhasTriagens versao={versaoTriagens} />}
      {aba === 'pacientes' && <Pacientes aoMudar={guardarPacientesOffline} />}
    </Moldura>
  )
}

function guardarPacientesOffline(lista: Paciente[]) {
  localStorage.setItem(CHAVE_PACIENTES, JSON.stringify(lista))
}

function FaixaConexao({ pendentes, online, aoEnviar }: { pendentes: number; online: boolean; aoEnviar: () => void }) {
  if (pendentes > 0) {
    return (
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ambar-fundo px-5 py-3 text-ambar">
        <span><strong className="tabular">{pendentes}</strong> triagem(ns) guardada(s) no aparelho, aguardando internet</span>
        <Botao pequeno variante="secundario" onClick={aoEnviar}>Enviar agora</Botao>
      </div>
    )
  }
  if (!online) {
    return (
      <div className="mb-8 rounded-2xl bg-ambar-fundo px-5 py-3 text-ambar">
        Sem conexão. Novas triagens ficam salvas no aparelho e são enviadas quando a internet voltar.
      </div>
    )
  }
  return null
}

function novoId() {
  return crypto.randomUUID?.() ?? `${Date.now().toString(16)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`
}

function NovaTriagem({ aoSalvar }: { aoSalvar: (t: TriagemLocal) => void }) {
  const avisar = useAvisar()
  const [pacientes, setPacientes] = useState<Paciente[] | null>(null)
  const [pacienteId, setPacienteId] = useState('')
  const [queixa, setQueixa] = useState('')
  const [sinais, setSinais] = useState({ temperatura: '', pas: '', pad: '', fc: '', sat: '', dor: '' })
  const [comorbidades, setComorbidades] = useState<string[]>([])
  const [relato, setRelato] = useState('')
  const [ouvindo, setOuvindo] = useState(false)

  useEffect(() => {
    api<Paciente[]>('/api/pacientes')
      .then((lista) => {
        setPacientes(lista)
        guardarPacientesOffline(lista)
      })
      .catch(() => {
        // Sem internet: usa a última lista guardada no aparelho.
        setPacientes(JSON.parse(localStorage.getItem(CHAVE_PACIENTES) ?? '[]'))
      })
  }, [])

  const paciente = pacientes?.find((p) => String(p.id) === pacienteId)
  const numero = (v: string) => (v === '' ? NaN : Number(v.replace(',', '.')))
  const valores = {
    temperatura: numero(sinais.temperatura),
    pressaoSistolica: numero(sinais.pas),
    pressaoDiastolica: numero(sinais.pad),
    frequenciaCardiaca: numero(sinais.fc),
    saturacaoO2: numero(sinais.sat),
    dor: numero(sinais.dor),
  }
  const completo = Object.values(valores).every((v) => !Number.isNaN(v)) && queixa.trim() !== ''
  const previa = completo && paciente ? calcularEscore({ queixaPrincipal: queixa, comorbidades, ...valores }, paciente.idade, relato) : null

  function alterar(campo: keyof typeof sinais, valor: string) {
    setSinais((s) => ({ ...s, [campo]: valor }))
  }

  function ditar() {
    type Reconhecimento = { lang: string; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onend: () => void; start: () => void }
    const Classe = (window as unknown as Record<string, (new () => Reconhecimento) | undefined>).SpeechRecognition
      ?? (window as unknown as Record<string, (new () => Reconhecimento) | undefined>).webkitSpeechRecognition
    if (!Classe) return avisar('Ditado não disponível neste navegador', 'alerta')
    const rec = new Classe()
    rec.lang = 'pt-BR'
    rec.onresult = (e) => setRelato((r) => `${r} ${e.results[0][0].transcript}`.trim())
    rec.onend = () => setOuvindo(false)
    setOuvindo(true)
    rec.start()
  }

  function salvar(e: FormEvent) {
    e.preventDefault()
    if (!paciente) return
    aoSalvar({
      idLocal: novoId(),
      pacienteId: paciente.id,
      pacienteNome: paciente.nome,
      coletadoEm: new Date().toISOString(),
      relato,
      dados: { queixaPrincipal: queixa, comorbidades, ...valores },
    })
    setPacienteId('')
    setQueixa('')
    setSinais({ temperatura: '', pas: '', pad: '', fc: '', sat: '', dor: '' })
    setComorbidades([])
    setRelato('')
  }

  if (!pacientes) return <Carregando />

  return (
    <>
      <CabecalhoPagina titulo="Nova triagem" descricao="Funciona sem internet: a triagem fica no aparelho e sobe sozinha quando a conexão voltar." />
      <form onSubmit={salvar} className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Superficie className="space-y-4">
            <h2 className="font-semibold">Paciente e queixa</h2>
            <Selecao rotulo="Paciente" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} required>
              <option value="">Selecione</option>
              {pacientes.filter((p) => p.ativo).map((p) => (
                <option key={p.id} value={p.id} disabled={!p.consentimentoEm}>
                  {p.nome}{p.consentimentoEm ? '' : ' (sem consentimento)'}
                </option>
              ))}
            </Selecao>
            <Campo rotulo="Queixa principal" value={queixa} onChange={(e) => setQueixa(e.target.value)} maxLength={500} required />
          </Superficie>

          <Superficie>
            <h2 className="mb-4 font-semibold">Sinais vitais</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Campo rotulo="Temperatura (°C)" type="number" step="0.1" min={30} max={45} inputMode="decimal" value={sinais.temperatura} onChange={(e) => alterar('temperatura', e.target.value)} required />
              <Campo rotulo="Pressão sistólica" type="number" min={50} max={300} inputMode="numeric" value={sinais.pas} onChange={(e) => alterar('pas', e.target.value)} required />
              <Campo rotulo="Pressão diastólica" type="number" min={30} max={200} inputMode="numeric" value={sinais.pad} onChange={(e) => alterar('pad', e.target.value)} required />
              <Campo rotulo="Freq. cardíaca (bpm)" type="number" min={20} max={250} inputMode="numeric" value={sinais.fc} onChange={(e) => alterar('fc', e.target.value)} required />
              <Campo rotulo="Saturação O₂ (%)" type="number" min={50} max={100} inputMode="numeric" value={sinais.sat} onChange={(e) => alterar('sat', e.target.value)} required />
              <Campo rotulo="Dor (0 a 10)" type="number" min={0} max={10} inputMode="numeric" value={sinais.dor} onChange={(e) => alterar('dor', e.target.value)} required />
            </div>
          </Superficie>

          <Superficie className="space-y-4">
            <h2 className="font-semibold">Contexto</h2>
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-tinta-suave">Comorbidades</legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {COMORBIDADES.map((c) => (
                  <Marcador
                    key={c}
                    rotulo={c.charAt(0).toUpperCase() + c.slice(1)}
                    checked={comorbidades.includes(c)}
                    onChange={(e) => setComorbidades((lista) => (e.target.checked ? [...lista, c] : lista.filter((x) => x !== c)))}
                  />
                ))}
              </div>
            </fieldset>
            <AreaTexto rotulo="Relato" placeholder="Sintomas nas palavras do paciente" value={relato} onChange={(e) => setRelato(e.target.value)} maxLength={2000} />
            <Botao variante="secundario" pequeno onClick={ditar} disabled={ouvindo}>
              {ouvindo ? 'Ouvindo…' : 'Ditar relato'}
            </Botao>
          </Superficie>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Superficie className="text-center">
            <p className="text-[13px] font-medium text-tinta-suave">Prévia do escore de risco</p>
            {previa ? (
              <>
                <div className="mt-3 flex justify-center">
                  <Escore caso={{ escore: previa.pontos, prioritario: previa.prioritario, dadosTriagem: valores }} grande />
                </div>
                <p className="mt-2 font-semibold">{classificar({ escore: previa.pontos, prioritario: previa.prioritario, dadosTriagem: valores }).rotulo}</p>
                {previa.fatores.length > 0 && <p className="mt-2 text-[12px] leading-snug text-tinta-suave">{previa.fatores.join(' · ')}</p>}
              </>
            ) : (
              <p className="mt-3 text-[14px] text-tinta-suave">Escolha o paciente e preencha os sinais vitais para ver a prévia.</p>
            )}
            <p className="mt-4 text-[11px] text-tinta-suave">O cálculo final é feito pelo servidor.</p>
          </Superficie>
          <Botao type="submit" className="mt-4 w-full">Salvar triagem</Botao>
        </aside>
      </form>
    </>
  )
}

function MinhasTriagens({ versao }: { versao: number }) {
  const avisar = useAvisar()
  const [casos, setCasos] = useState<Dossie[] | null>(null)
  const [aberto, setAberto] = useState<Dossie | null>(null)

  useEffect(() => {
    api<Dossie[]>('/api/dossies')
      .then(setCasos)
      .catch((e) => {
        setCasos((atual) => atual ?? [])
        avisar(mensagemDe(e), 'alerta')
      })
  }, [versao, avisar])

  function ouvirReceita(d: Dossie) {
    const texto = d.laudo?.receitas.map((r) => `Receita: ${r.prescricao}`).join('. ') || 'Sem receita.'
    const fala = new SpeechSynthesisUtterance(texto)
    fala.lang = 'pt-BR'
    speechSynthesis.speak(fala)
  }

  return (
    <>
      <CabecalhoPagina titulo="Minhas triagens" descricao="Acompanhe o encaminhamento e o laudo de cada caso." />
      {casos === null ? <Carregando /> : <ListaCasos casos={casos} aoAbrir={setAberto} vazio="Nenhuma triagem enviada ainda." />}
      <Modal aberto={aberto !== null} aoFechar={() => setAberto(null)} titulo="Triagem" largo>
        {aberto && (
          <div className="space-y-5">
            <DetalheDossie d={aberto} />
            {aberto.laudo && (
              <>
                <DocumentoLaudo laudo={aberto.laudo} nomePaciente={aberto.paciente.nome} />
                <Botao variante="secundario" onClick={() => ouvirReceita(aberto)}>Ouvir receita em voz alta</Botao>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
