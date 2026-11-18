import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSessaoAtiva } from '../../app/sessao'
import { api, mensagemDe } from '../../lib/api'
import { cpfValido, hojeIso, idRuralMed } from '../../lib/formato'
import type { Microarea, Paciente } from '../../lib/tipos'
import { useAvisar } from '../../ui/avisos'
import { Botao, CabecalhoPagina, Campo, Carregando, Celula, Confirmacao, Linha, Marcador, Modal, Selecao, Selo, Tabela, Vazio } from '../../ui/base'
import { HistoricoPaciente } from './Clinico'

/** Cadastro de pacientes, usado pelo ACS (só a própria microárea) e pela UBS (todas). */
export default function Pacientes({ aoMudar }: { aoMudar?: (lista: Paciente[]) => void }) {
  const sessao = useSessaoAtiva()
  const ehUbs = sessao.usuario.perfil === 'UBS'
  const avisar = useAvisar()
  const [pacientes, setPacientes] = useState<Paciente[] | null>(null)
  const [editando, setEditando] = useState<Paciente | 'novo' | null>(null)
  const [historico, setHistorico] = useState<Paciente | null>(null)
  const [inativando, setInativando] = useState<Paciente | null>(null)

  const carregar = useCallback(() => {
    api<Paciente[]>('/api/pacientes')
      .then((lista) => {
        setPacientes(lista)
        aoMudar?.(lista)
      })
      .catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [avisar, aoMudar])

  useEffect(carregar, [carregar])

  async function inativar(p: Paciente) {
    setInativando(null)
    try {
      await api(`/api/pacientes/${p.id}`, 'DELETE')
      avisar('Paciente inativado')
      carregar()
    } catch (e) {
      avisar(mensagemDe(e), 'erro')
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Pacientes"
        descricao={ehUbs ? 'Cadastro e acompanhamento dos pacientes da unidade.' : 'Pacientes da sua microárea.'}
        acao={<Botao onClick={() => setEditando('novo')}>Novo paciente</Botao>}
      />
      {pacientes === null ? (
        <Carregando />
      ) : pacientes.length === 0 ? (
        <Vazio>Nenhum paciente cadastrado.</Vazio>
      ) : (
        <Tabela colunas={['Nome', 'Cartão SUS', 'Idade', 'Microárea', 'Consentimento', 'Situação', '']}>
          {pacientes.map((p) => (
            <Linha key={p.id}>
              <Celula>
                <span className="block font-medium">{p.nome}</span>
                <code className="text-[11px] text-tinta-suave">{idRuralMed(p)}</code>
              </Celula>
              <Celula rotulo="Cartão SUS">
                {p.cartaoSus ? <span className="tabular whitespace-nowrap">{formatarSus(p.cartaoSus)}</span> : <span className="text-tinta-suave">Usa o ID RuralMed</span>}
              </Celula>
              <Celula rotulo="Idade"><span className="whitespace-nowrap">{p.idade} anos</span></Celula>
              <Celula rotulo="Microárea">{p.microarea.nome}</Celula>
              <Celula rotulo="Consentimento">{p.consentimentoEm ? 'Sim' : <Selo tom="alerta">Pendente</Selo>}</Celula>
              <Celula rotulo="Situação">{p.ativo ? 'Ativo' : <Selo tom="apagado">Inativo</Selo>}</Celula>
              <Celula acoes>
                <Botao variante="secundario" pequeno onClick={() => setHistorico(p)}>Histórico</Botao>
                <Botao variante="secundario" pequeno onClick={() => setEditando(p)}>Editar</Botao>
                {p.ativo && <Botao variante="discreto" pequeno onClick={() => setInativando(p)}>Inativar</Botao>}
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}

      <Modal aberto={editando !== null} aoFechar={() => setEditando(null)} titulo={editando === 'novo' ? 'Novo paciente' : 'Editar paciente'}>
        {editando !== null && (
          <FormPaciente
            paciente={editando === 'novo' ? null : editando}
            ehUbs={ehUbs}
            aoSalvar={() => {
              setEditando(null)
              carregar()
            }}
          />
        )}
      </Modal>

      <Modal aberto={historico !== null} aoFechar={() => setHistorico(null)} titulo={historico ? `Histórico de ${historico.nome}` : ''} largo>
        {historico && <HistoricoPaciente pacienteId={historico.id} />}
      </Modal>

      <Confirmacao
        aberto={inativando !== null}
        titulo="Inativar paciente?"
        texto="O histórico de atendimentos continua guardado."
        rotuloAcao="Inativar"
        aoFechar={() => setInativando(null)}
        aoConfirmar={() => inativando && inativar(inativando)}
      />
    </>
  )
}

function FormPaciente({ paciente, ehUbs, aoSalvar }: { paciente: Paciente | null; ehUbs: boolean; aoSalvar: () => void }) {
  const avisar = useAvisar()
  const [microareas, setMicroareas] = useState<Microarea[]>([])
  const [nome, setNome] = useState(paciente?.nome ?? '')
  const [cpf, setCpf] = useState(paciente?.cpf ?? '')
  const [cns, setCns] = useState(paciente?.cns ?? '')
  const [nascimento, setNascimento] = useState(paciente?.dataNascimento ?? '')
  const [telefone, setTelefone] = useState(paciente?.telefone ?? '')
  const [microareaId, setMicroareaId] = useState(String(paciente?.microarea?.id ?? ''))
  const [consentiu, setConsentiu] = useState(Boolean(paciente?.consentimentoEm))
  const [ativo, setAtivo] = useState(paciente?.ativo ?? true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!ehUbs) return
    api<Microarea[]>('/api/microareas')
      .then((lista) => {
        setMicroareas(lista)
        setMicroareaId((atual) => atual || String(lista[0]?.id ?? ''))
      })
      .catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [ehUbs, avisar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const cpfLimpo = cpf.replace(/[.\-\s]/g, '')
    const cnsLimpo = cns.replace(/\s/g, '')
    if (/[^0-9.\-\s]/.test(cpf) || /[^0-9\s]/.test(cns)) return setErro('CPF e Cartão SUS devem conter apenas números.')
    if (cpfLimpo && !cpfValido(cpfLimpo)) return setErro('Confira o CPF: os dígitos verificadores não batem.')
    if (!cpfLimpo && cnsLimpo && !/^\d{15}$/.test(cnsLimpo)) return setErro('O cartão SUS antigo (CNS) tem 15 números.')

    const corpo = {
      nome,
      cpf: cpfLimpo || null,
      cns: cpfLimpo ? null : cnsLimpo || null,
      dataNascimento: nascimento,
      telefone,
      consentimentoEm: consentiu ? (paciente?.consentimentoEm ?? new Date().toISOString()) : null,
      ativo,
      ...(ehUbs ? { microarea: { id: Number(microareaId) } } : {}),
    }
    setSalvando(true)
    try {
      await api(paciente ? `/api/pacientes/${paciente.id}` : '/api/pacientes', paciente ? 'PUT' : 'POST', corpo)
      avisar('Paciente salvo')
      aoSalvar()
    } catch (falha) {
      setErro(mensagemDe(falha))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      {ehUbs && (
        <Selecao rotulo="Microárea" value={microareaId} onChange={(e) => setMicroareaId(e.target.value)} required>
          {microareas.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </Selecao>
      )}
      <Campo rotulo="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} minLength={2} maxLength={120} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="CPF (opcional)" value={cpf} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" maxLength={14} placeholder="000.000.000-00" autoComplete="off" />
        <Campo
          rotulo="Cartão SUS"
          value={cpf.trim() ? cpf : cns}
          onChange={(e) => setCns(e.target.value)}
          readOnly={Boolean(cpf.trim())}
          inputMode="numeric"
          maxLength={15}
          placeholder="Só se não tiver CPF: cartão antigo, 15 números"
          autoComplete="off"
          ajuda={cpf.trim() ? 'É o próprio CPF (Lei 14.534/2023).' : 'Sem CPF nem cartão, o paciente usa o ID RuralMed.'}
        />
        <Campo rotulo="Data de nascimento" type="date" value={nascimento} max={hojeIso()} onChange={(e) => setNascimento(e.target.value)} required />
        <Campo rotulo="Telefone" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={20} placeholder="(00) 00000-0000" />
      </div>
      {paciente && <Campo rotulo="ID RuralMed" value={idRuralMed(paciente)} readOnly />}
      <div className="space-y-3 rounded-2xl bg-white p-4">
        <Marcador rotulo="O paciente consentiu com o atendimento por telessaúde (Lei 14.510/2022)" checked={consentiu} onChange={(e) => setConsentiu(e.target.checked)} />
        <Marcador rotulo="Cadastro ativo" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
      </div>
      {erro && <p role="alert" className="rounded-xl bg-[#fdeceb] px-3.5 py-2.5 text-[14px] text-[#a3261b]">{erro}</p>}
      <div className="flex justify-end">
        <Botao type="submit" carregando={salvando}>Salvar paciente</Botao>
      </div>
    </form>
  )
}

/** CPF com pontuação; CNS em blocos de 3-4-4-4. */
function formatarSus(numero: string) {
  if (numero.length === 11) return numero.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (numero.length === 15) return numero.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')
  return numero
}
