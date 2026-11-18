import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Moldura, useAba, type Aba } from '../../app/Moldura'
import { api, mensagemDe } from '../../lib/api'
import { dataHora, idRuralMed } from '../../lib/formato'
import type { Cid, Dossie, Laudo, Medicamento, PacienteResumo, Prescricao } from '../../lib/tipos'
import { useAvisar } from '../../ui/avisos'
import { AreaTexto, Botao, LegendaManchester, CabecalhoPagina, Campo, Carregando, Celula, Linha, Marcador, Modal, Selecao, Superficie, Tabela, Vazio } from '../../ui/base'
import { DetalheDossie, DocumentoLaudo, HistoricoPaciente, ItemPrescricao, ListaCasos } from '../comum/Clinico'

const ABAS: Aba[] = [
  { id: 'fila', rotulo: 'Fila de casos' },
  { id: 'historico', rotulo: 'Histórico clínico' },
  { id: 'laudos', rotulo: 'Meus laudos' },
]

export default function PainelMedico() {
  const [aba, irPara] = useAba(ABAS)
  const [laudoAberto, setLaudoAberto] = useState<Laudo | null>(null)
  const [versao, setVersao] = useState(0)

  return (
    <Moldura abas={ABAS} atual={aba} aoTrocar={irPara}>
      {aba === 'fila' && (
        <Fila
          versao={versao}
          aoEmitir={(laudo) => {
            setLaudoAberto(laudo)
            setVersao((v) => v + 1)
          }}
        />
      )}
      {aba === 'historico' && <BuscaHistorico />}
      {aba === 'laudos' && <MeusLaudos versao={versao} aoAbrir={setLaudoAberto} />}

      <Modal aberto={laudoAberto !== null} aoFechar={() => setLaudoAberto(null)} titulo="Laudo">
        {laudoAberto && (
          <div className="space-y-4">
            <DocumentoLaudo laudo={laudoAberto} nomePaciente={laudoAberto.dossie?.paciente.nome ?? ''} />
            <Botao variante="secundario" onClick={() => window.print()}>Imprimir ou salvar PDF</Botao>
          </div>
        )}
      </Modal>
    </Moldura>
  )
}

function Fila({ versao, aoEmitir }: { versao: number; aoEmitir: (laudo: Laudo) => void }) {
  const avisar = useAvisar()
  const [casos, setCasos] = useState<Dossie[] | null>(null)
  const [aberto, setAberto] = useState<Dossie | null>(null)
  const [historicoDe, setHistoricoDe] = useState<number | null>(null)

  const carregar = useCallback(() => {
    api<Dossie[]>('/api/fila').then(setCasos).catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [avisar])
  useEffect(carregar, [carregar, versao])

  return (
    <>
      <CabecalhoPagina titulo="Fila de casos" descricao="Ordenada por risco. Casos prioritários têm até 24 horas para receber laudo." acao={<LegendaManchester />} />
      {casos === null ? <Carregando /> : <ListaCasos casos={casos} aoAbrir={setAberto} vazio="Nenhum caso esperando laudo. Bom trabalho." />}

      <Modal aberto={aberto !== null} aoFechar={() => setAberto(null)} titulo="Atendimento" largo>
        {aberto && (
          <div className="space-y-5">
            <DetalheDossie d={aberto} />
            <Botao variante="secundario" pequeno onClick={() => setHistoricoDe(aberto.paciente.id)}>
              Ver histórico completo do paciente
            </Botao>
            <Prescricoes dossieId={aberto.id} />
            <FormLaudo
              dossieId={aberto.id}
              aoEmitir={(laudo) => {
                setAberto(null)
                aoEmitir(laudo)
              }}
            />
          </div>
        )}
      </Modal>

      <Modal aberto={historicoDe !== null} aoFechar={() => setHistoricoDe(null)} titulo="Histórico do paciente" largo>
        {historicoDe !== null && <HistoricoPaciente pacienteId={historicoDe} />}
      </Modal>
    </>
  )
}

/** Campo de busca com sugestões (CID, medicamentos). */
function Sugestoes<T>({
  rotulo,
  placeholder,
  buscar,
  descrever,
  aoEscolher,
  ajuda,
}: {
  rotulo: string
  placeholder: string
  buscar: (termo: string) => Promise<T[]>
  descrever: (item: T) => { titulo: string; detalhe: string }
  aoEscolher: (item: T | null) => void
  ajuda?: string
}) {
  const [texto, setTexto] = useState('')
  const [itens, setItens] = useState<T[] | null>(null)
  // Depois de escolher uma sugestão, o campo mostra o nome dela: não deve buscar de novo.
  const [escolhido, setEscolhido] = useState<string | null>(null)

  useEffect(() => {
    if (texto.trim().length < 2 || texto === escolhido) return
    let ativo = true
    const espera = setTimeout(() => {
      buscar(texto.trim())
        .then((r) => ativo && setItens(r))
        .catch(() => ativo && setItens([]))
    }, 200)
    return () => {
      ativo = false
      clearTimeout(espera)
    }
  }, [texto, escolhido, buscar])

  return (
    <div className="relative">
      <Campo
        rotulo={rotulo}
        placeholder={placeholder}
        value={texto}
        autoComplete="off"
        ajuda={ajuda}
        onChange={(e) => {
          setTexto(e.target.value)
          setEscolhido(null)
          if (e.target.value.trim().length < 2) setItens(null)
          aoEscolher(null)
        }}
        onKeyDown={(e) => e.key === 'Escape' && itens && (e.preventDefault(), setItens(null))}
      />
      {itens && texto.trim().length >= 2 && texto !== escolhido && (
        <ul className="absolute inset-x-0 top-[72px] z-10 max-h-64 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-e3 ring-1 ring-black/5">
          {itens.length === 0 && <li className="px-3 py-2 text-[14px] text-tinta-suave">Nada encontrado.</li>}
          {itens.map((item, i) => {
            const { titulo, detalhe } = descrever(item)
            return (
              <li key={i}>
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-osso"
                  onClick={() => {
                    aoEscolher(item)
                    setTexto(titulo)
                    setEscolhido(titulo)
                    setItens(null)
                  }}
                >
                  <span className="block text-[14px] font-medium">{titulo}</span>
                  <span className="block text-[12px] text-tinta-suave">{detalhe}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const buscarCids = (termo: string) => api<Cid[]>(`/api/cids?busca=${encodeURIComponent(termo)}`)
const buscarMedicamentos = (termo: string) => api<Medicamento[]>(`/api/medicamentos?busca=${encodeURIComponent(termo)}`)

function FormLaudo({ dossieId, aoEmitir }: { dossieId: number; aoEmitir: (laudo: Laudo) => void }) {
  const avisar = useAvisar()
  const [parecer, setParecer] = useState('')
  const [cid, setCid] = useState<Cid | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function emitir(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      const laudo = await api<Laudo>(`/api/dossies/${dossieId}/laudo`, 'POST', {
        parecer,
        cidCodigo: cid?.codigo ?? null,
        prescricao: null,
        farmaciaPopular: false,
      })
      avisar('Laudo emitido e assinado')
      aoEmitir(laudo)
    } catch (falha) {
      avisar(mensagemDe(falha), 'erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Superficie>
      <form onSubmit={emitir} className="space-y-4">
        <h3 className="font-semibold">Parecer e laudo</h3>
        <AreaTexto rotulo="Parecer" value={parecer} onChange={(e) => setParecer(e.target.value)} maxLength={10000} rows={5} required />
        <Sugestoes
          rotulo="CID (opcional)"
          placeholder="Busque por código ou doença"
          buscar={buscarCids}
          descrever={(c) => ({ titulo: `${c.codigo} · ${c.descricao}`, detalhe: 'CID-10' })}
          aoEscolher={setCid}
        />
        <div className="flex justify-end">
          <Botao type="submit" carregando={enviando}>Emitir e assinar laudo</Botao>
        </div>
      </form>
    </Superficie>
  )
}

const VIAS = ['Oral', 'Tópica', 'Inalatória', 'Oftálmica', 'Otológica', 'Outra']

function Prescricoes({ dossieId }: { dossieId: number }) {
  const avisar = useAvisar()
  const [receitas, setReceitas] = useState<Prescricao[] | null>(null)
  const [medicamento, setMedicamento] = useState<Medicamento | null>(null)
  const [f, setF] = useState({ dose: '', via: '', frequencia: '', duracao: '', orientacoes: '', farmaciaPopular: false })
  const [chave, setChave] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const mudar = (campo: keyof typeof f, valor: string | boolean) => setF((a) => ({ ...a, [campo]: valor }))

  const carregar = useCallback(() => {
    api<Prescricao[]>(`/api/dossies/${dossieId}/receitas`).then(setReceitas).catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [dossieId, avisar])
  useEffect(carregar, [carregar])

  async function assinar(e: FormEvent) {
    e.preventDefault()
    if (!medicamento) return avisar('Escolha um medicamento da lista de referência', 'erro')
    setEnviando(true)
    try {
      await api(`/api/dossies/${dossieId}/receitas`, 'POST', {
        medicamento: medicamento.nome,
        apresentacao: medicamento.apresentacao,
        dose: f.dose,
        viaAdministracao: f.via,
        frequencia: f.frequencia,
        duracao: f.duracao,
        orientacoes: f.orientacoes,
        farmaciaPopular: f.farmaciaPopular,
      })
      avisar('Prescrição assinada')
      setF({ dose: '', via: '', frequencia: '', duracao: '', orientacoes: '', farmaciaPopular: false })
      setMedicamento(null)
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
      <h3 className="font-semibold">Prescrição</h3>
      <p className="mt-1 text-[12px] text-tinta-suave">
        Catálogo de referência para busca. Ele não sugere remédio por sintoma nem preenche doses: a decisão é do médico.
      </p>
      {receitas && receitas.length > 0 && (
        <div className="mt-4 space-y-2">{receitas.map((r) => <ItemPrescricao key={r.id} r={r} />)}</div>
      )}
      <form onSubmit={assinar} className="mt-4 space-y-4">
        <Sugestoes
          key={chave}
          rotulo="Medicamento ou princípio ativo"
          placeholder="Digite ao menos 2 letras"
          buscar={buscarMedicamentos}
          descrever={(m) => ({ titulo: m.nome, detalhe: `${m.principioAtivo} · ${m.apresentacao}` })}
          aoEscolher={setMedicamento}
          ajuda={medicamento ? `${medicamento.principioAtivo} · ${medicamento.apresentacao}` : undefined}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Dose" value={f.dose} onChange={(e) => mudar('dose', e.target.value)} maxLength={180} required />
          <Selecao rotulo="Via de administração" value={f.via} onChange={(e) => mudar('via', e.target.value)} required>
            <option value="">Selecione</option>
            {VIAS.map((v) => <option key={v}>{v}</option>)}
          </Selecao>
          <Campo rotulo="Frequência" value={f.frequencia} onChange={(e) => mudar('frequencia', e.target.value)} maxLength={180} required />
          <Campo rotulo="Duração" value={f.duracao} onChange={(e) => mudar('duracao', e.target.value)} maxLength={180} required />
        </div>
        <AreaTexto rotulo="Orientações ao paciente" value={f.orientacoes} onChange={(e) => mudar('orientacoes', e.target.value)} maxLength={2000} rows={3} />
        <Marcador rotulo="Orientar sobre o Farmácia Popular (disponibilidade não verificada)" checked={f.farmaciaPopular} onChange={(e) => mudar('farmaciaPopular', e.target.checked)} />
        <div className="flex justify-end">
          <Botao type="submit" variante="secundario" carregando={enviando}>Assinar prescrição</Botao>
        </div>
      </form>
    </Superficie>
  )
}

function BuscaHistorico() {
  const [identificador, setIdentificador] = useState('')
  const [paciente, setPaciente] = useState<PacienteResumo | null>(null)
  const [erro, setErro] = useState('')
  const [buscando, setBuscando] = useState(false)

  async function buscar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setPaciente(null)
    setBuscando(true)
    try {
      setPaciente(await api<PacienteResumo>(`/api/pacientes/localizar?identificador=${encodeURIComponent(identificador)}`))
    } catch (falha) {
      setErro(mensagemDe(falha))
    } finally {
      setBuscando(false)
    }
  }

  return (
    <>
      <CabecalhoPagina titulo="Histórico clínico" descricao="Atendimentos anteriores em todas as especialidades. Busque pelo CPF ou pelo ID RuralMed completo." />
      <Superficie className="max-w-2xl">
        <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
          <Campo
            className="min-w-0 flex-1"
            rotulo="CPF ou ID RuralMed"
            placeholder="CPF ou RM-…"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            autoComplete="off"
            required
            ajuda="A busca é exata. O CPF não aparece nos resultados."
          />
          <Botao type="submit" carregando={buscando} className="mb-6">Localizar</Botao>
        </form>
        {erro && <p role="alert" className="mt-2 rounded-xl bg-[#fdeceb] px-3.5 py-2.5 text-[14px] text-[#a3261b]">{erro}</p>}
      </Superficie>
      {paciente && (
        <section className="mt-8">
          <div className="mb-6">
            <p className="text-2xl font-semibold tracking-tight">{paciente.nome}</p>
            <p className="text-tinta-suave">{paciente.idade} anos · <code className="text-[13px]">{idRuralMed(paciente)}</code></p>
          </div>
          <HistoricoPaciente pacienteId={paciente.id} />
        </section>
      )}
    </>
  )
}

function MeusLaudos({ versao, aoAbrir }: { versao: number; aoAbrir: (l: Laudo) => void }) {
  const avisar = useAvisar()
  const [laudos, setLaudos] = useState<Laudo[] | null>(null)
  useEffect(() => {
    api<Laudo[]>('/api/laudos').then(setLaudos).catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [versao, avisar])

  return (
    <>
      <CabecalhoPagina titulo="Meus laudos" descricao="Pareceres emitidos e assinados por você." />
      {laudos === null ? (
        <Carregando />
      ) : laudos.length === 0 ? (
        <Vazio>Nenhum laudo emitido ainda.</Vazio>
      ) : (
        <Tabela colunas={['Data', 'Paciente', 'CID', '']}>
          {laudos.map((l) => (
            <Linha key={l.id}>
              <Celula rotulo="Data">{dataHora(l.emitidoEm)}</Celula>
              <Celula rotulo="Paciente"><span className="font-medium">{l.dossie?.paciente.nome}</span></Celula>
              <Celula rotulo="CID">{l.cid ? l.cid.codigo : 'Não informado'}</Celula>
              <Celula acoes><Botao variante="secundario" pequeno onClick={() => aoAbrir(l)}>Abrir</Botao></Celula>
            </Linha>
          ))}
        </Tabela>
      )}
    </>
  )
}
