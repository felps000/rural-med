import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Moldura, useAba, type Aba } from '../../app/Moldura'
import { api, mensagemDe } from '../../lib/api'
import type { Clinica, Dossie, Especialidade, Medico, Microarea, Municipio, Perfil, StatusDossie, Usuario } from '../../lib/tipos'
import { useAvisar } from '../../ui/avisos'
import { Botao, CabecalhoPagina, Campo, Carregando, Celula, Confirmacao, Linha, Marcador, Modal, Selecao, Selo, Superficie, Tabela, Vazio } from '../../ui/base'
import { DetalheDossie, DocumentoLaudo, ListaCasos } from '../comum/Clinico'
import Pacientes from '../comum/Pacientes'

const ABAS: Aba[] = [
  { id: 'dossies', rotulo: 'Dossiês' },
  { id: 'pacientes', rotulo: 'Pacientes' },
  { id: 'usuarios', rotulo: 'Usuários' },
  { id: 'especialidades', rotulo: 'Especialidades' },
  { id: 'clinicas', rotulo: 'Clínicas' },
]

export default function PainelUbs() {
  const [aba, irPara] = useAba(ABAS)
  return (
    <Moldura abas={ABAS} atual={aba} aoTrocar={irPara}>
      {aba === 'dossies' && <Dossies />}
      {aba === 'pacientes' && <Pacientes />}
      {aba === 'usuarios' && <Usuarios />}
      {aba === 'especialidades' && <Especialidades />}
      {aba === 'clinicas' && <Clinicas />}
    </Moldura>
  )
}

const FILTROS: { valor: StatusDossie | ''; rotulo: string }[] = [
  { valor: 'SINCRONIZADO', rotulo: 'A encaminhar' },
  { valor: 'AGUARDANDO_ENCAMINHAMENTO', rotulo: 'Aguardando médico' },
  { valor: 'ENCAMINHADO', rotulo: 'Encaminhados' },
  { valor: 'LAUDO_EMITIDO', rotulo: 'Com laudo' },
  { valor: '', rotulo: 'Todos' },
]

function Dossies() {
  const avisar = useAvisar()
  const [filtro, setFiltro] = useState<StatusDossie | ''>('SINCRONIZADO')
  const [casos, setCasos] = useState<Dossie[] | null>(null)
  const [aberto, setAberto] = useState<Dossie | null>(null)

  const carregar = useCallback(() => {
    api<Dossie[]>(`/api/dossies${filtro ? `?status=${filtro}` : ''}`)
      .then(setCasos)
      .catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [filtro, avisar])

  useEffect(carregar, [carregar])

  return (
    <>
      <CabecalhoPagina titulo="Dossiês recebidos" descricao="Revise o risco e encaminhe cada caso para a especialidade certa. Os mais graves aparecem primeiro." />
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar por situação">
        {FILTROS.map((f) => (
          <button
            key={f.rotulo}
            type="button"
            onClick={() => {
              setCasos(null)
              setFiltro(f.valor)
            }}
            aria-pressed={filtro === f.valor}
            className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors ${
              filtro === f.valor ? 'bg-tinta text-osso' : 'bg-white text-tinta-suave ring-1 ring-linha hover:text-tinta'
            }`}
          >
            {f.rotulo}
          </button>
        ))}
      </div>
      {casos === null ? <Carregando /> : <ListaCasos casos={casos} aoAbrir={setAberto} vazio="Nenhum dossiê nesta situação." />}

      <Modal aberto={aberto !== null} aoFechar={() => setAberto(null)} titulo="Dossiê" largo>
        {aberto && (
          <div className="space-y-5">
            <DetalheDossie d={aberto} />
            {aberto.laudo ? (
              <DocumentoLaudo laudo={aberto.laudo} nomePaciente={aberto.paciente.nome} />
            ) : (
              <Encaminhar
                dossie={aberto}
                aoEncaminhar={() => {
                  setAberto(null)
                  carregar()
                }}
              />
            )}
          </div>
        )}
      </Modal>
    </>
  )
}

function Encaminhar({ dossie, aoEncaminhar }: { dossie: Dossie; aoEncaminhar: () => void }) {
  const avisar = useAvisar()
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([])
  const [escolhida, setEscolhida] = useState(String(dossie.especialidade?.id ?? ''))
  const [medicos, setMedicos] = useState<Medico[] | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api<Especialidade[]>('/api/especialidades').then(setEspecialidades).catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [avisar])

  useEffect(() => {
    if (!escolhida) return
    let ativo = true
    api<Medico[]>(`/api/medicos?especialidadeId=${escolhida}`)
      .then((lista) => ativo && setMedicos(lista))
      .catch(() => ativo && setMedicos(null))
    return () => {
      ativo = false
    }
  }, [escolhida])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      const d = await api<Dossie>(`/api/dossies/${dossie.id}/encaminhar`, 'POST', { especialidadeId: Number(escolhida) })
      if (d.status === 'ENCAMINHADO') avisar(`Encaminhado para ${d.especialidade?.nome}`)
      else avisar('Sem médico disponível: o caso fica aguardando', 'alerta')
      aoEncaminhar()
    } catch (falha) {
      avisar(mensagemDe(falha), 'erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Superficie>
      <form onSubmit={enviar} className="space-y-4">
        <h3 className="font-semibold">Encaminhar para especialidade</h3>
        <Selecao
          rotulo="Especialidade"
          value={escolhida}
          onChange={(e) => {
            setEscolhida(e.target.value)
            setMedicos(null)
          }}
          required
          ajuda={
            escolhida && medicos
              ? medicos.length
                ? `Disponíveis: ${medicos.map((m) => m.usuario.nome).join(', ')}`
                : 'Nenhum médico disponível: o caso ficará aguardando.'
              : undefined
          }
        >
          <option value="">Selecione</option>
          {especialidades.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </Selecao>
        <div className="flex justify-end">
          <Botao type="submit" carregando={enviando} disabled={!escolhida}>Encaminhar</Botao>
        </div>
      </form>
    </Superficie>
  )
}

const NOMES_PERFIL: Record<Perfil, string> = { ACS: 'Agente de saúde', UBS: 'Equipe da UBS', MEDICO: 'Médico', GESTOR: 'Gestor' }

function Usuarios() {
  const avisar = useAvisar()
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null)
  const [novo, setNovo] = useState(false)
  const [inativando, setInativando] = useState<Usuario | null>(null)

  const carregar = useCallback(() => {
    api<Usuario[]>('/api/usuarios').then(setUsuarios).catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [avisar])
  useEffect(carregar, [carregar])

  async function inativar(u: Usuario) {
    setInativando(null)
    try {
      await api(`/api/usuarios/${u.id}`, 'DELETE')
      avisar('Usuário inativado. As sessões dele foram encerradas.')
      carregar()
    } catch (e) {
      avisar(mensagemDe(e), 'erro')
    }
  }

  return (
    <>
      <CabecalhoPagina titulo="Usuários" descricao="Quem acessa o RuralMed nesta unidade." acao={<Botao onClick={() => setNovo(true)}>Novo usuário</Botao>} />
      {usuarios === null ? (
        <Carregando />
      ) : (
        <Tabela colunas={['Nome', 'E-mail', 'Perfil', 'Situação', '']}>
          {usuarios.map((u) => (
            <Linha key={u.id}>
              <Celula><span className="font-medium">{u.nome}</span></Celula>
              <Celula rotulo="E-mail">{u.email}</Celula>
              <Celula rotulo="Perfil">{NOMES_PERFIL[u.perfil]}</Celula>
              <Celula rotulo="Situação">{u.ativo ? 'Ativo' : <Selo tom="apagado">Inativo</Selo>}</Celula>
              <Celula acoes>{u.ativo && <Botao variante="discreto" pequeno onClick={() => setInativando(u)}>Inativar</Botao>}</Celula>
            </Linha>
          ))}
        </Tabela>
      )}
      <Modal aberto={novo} aoFechar={() => setNovo(false)} titulo="Novo usuário">
        {novo && (
          <FormUsuario
            aoSalvar={() => {
              setNovo(false)
              carregar()
            }}
          />
        )}
      </Modal>
      <Confirmacao
        aberto={inativando !== null}
        titulo="Inativar usuário?"
        texto="A pessoa perde o acesso imediatamente."
        rotuloAcao="Inativar"
        aoFechar={() => setInativando(null)}
        aoConfirmar={() => inativando && inativar(inativando)}
      />
    </>
  )
}

function FormUsuario({ aoSalvar }: { aoSalvar: () => void }) {
  const avisar = useAvisar()
  const [listas, setListas] = useState<{ microareas: Microarea[]; clinicas: Clinica[]; especialidades: Especialidade[] } | null>(null)
  const [f, setF] = useState({
    nome: '', email: '', cpf: '', senha: '', perfil: 'ACS' as Perfil,
    microareaId: '', especialidadeId: '', clinicaId: '', crm: '', ufCrm: 'SP', valorPorLaudo: '100', crmAtivo: false,
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const mudar = (campo: keyof typeof f, valor: string | boolean) => setF((atual) => ({ ...atual, [campo]: valor }))

  useEffect(() => {
    Promise.all([api<Microarea[]>('/api/microareas'), api<Clinica[]>('/api/clinicas'), api<Especialidade[]>('/api/especialidades')])
      .then(([microareas, clinicas, especialidades]) => {
        setListas({ microareas, clinicas, especialidades })
        setF((atual) => ({
          ...atual,
          microareaId: String(microareas[0]?.id ?? ''),
          especialidadeId: String(especialidades[0]?.id ?? ''),
        }))
      })
      .catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [avisar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      await api('/api/usuarios', 'POST', {
        nome: f.nome,
        email: f.email,
        cpf: f.cpf,
        senha: f.senha,
        perfil: f.perfil,
        microareaId: f.perfil === 'ACS' ? Number(f.microareaId) : null,
        especialidadeId: f.perfil === 'MEDICO' ? Number(f.especialidadeId) : null,
        clinicaId: f.perfil === 'MEDICO' && f.clinicaId ? Number(f.clinicaId) : null,
        crm: f.crm,
        ufCrm: f.ufCrm.toUpperCase(),
        crmAtivo: f.crmAtivo,
        valorPorLaudo: Number(f.valorPorLaudo),
      })
      avisar('Usuário cadastrado')
      aoSalvar()
    } catch (falha) {
      setErro(mensagemDe(falha))
    } finally {
      setSalvando(false)
    }
  }

  if (!listas) return <Carregando />
  return (
    <form onSubmit={salvar} className="space-y-4">
      <Campo rotulo="Nome completo" value={f.nome} onChange={(e) => mudar('nome', e.target.value)} minLength={2} maxLength={120} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="E-mail" type="email" value={f.email} onChange={(e) => mudar('email', e.target.value)} maxLength={254} required />
        <Campo rotulo="CPF (só números)" inputMode="numeric" pattern="\d{11}" maxLength={11} value={f.cpf} onChange={(e) => mudar('cpf', e.target.value)} required />
        <Campo rotulo="Senha inicial" type="password" minLength={6} value={f.senha} onChange={(e) => mudar('senha', e.target.value)} autoComplete="new-password" required />
        <Selecao rotulo="Perfil" value={f.perfil} onChange={(e) => mudar('perfil', e.target.value)}>
          {Object.entries(NOMES_PERFIL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </Selecao>
      </div>
      {f.perfil === 'ACS' && (
        <Selecao rotulo="Microárea do agente" value={f.microareaId} onChange={(e) => mudar('microareaId', e.target.value)}>
          {listas.microareas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </Selecao>
      )}
      {f.perfil === 'MEDICO' && (
        <div className="space-y-4 rounded-2xl bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao rotulo="Especialidade" value={f.especialidadeId} onChange={(e) => mudar('especialidadeId', e.target.value)}>
              {listas.especialidades.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </Selecao>
            <Selecao rotulo="Clínica parceira" value={f.clinicaId} onChange={(e) => mudar('clinicaId', e.target.value)}>
              <option value="">Nenhuma</option>
              {listas.clinicas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Selecao>
            <Campo rotulo="CRM" maxLength={10} value={f.crm} onChange={(e) => mudar('crm', e.target.value)} />
            <Campo rotulo="UF do CRM" maxLength={2} value={f.ufCrm} onChange={(e) => mudar('ufCrm', e.target.value)} />
            <Campo rotulo="Valor por laudo (R$)" type="number" step="0.01" min={0} value={f.valorPorLaudo} onChange={(e) => mudar('valorPorLaudo', e.target.value)} />
          </div>
          <Marcador rotulo="CRM validado e ativo" checked={f.crmAtivo} onChange={(e) => mudar('crmAtivo', e.target.checked)} />
        </div>
      )}
      {erro && <p role="alert" className="rounded-xl bg-[#fdeceb] px-3.5 py-2.5 text-[14px] text-[#a3261b]">{erro}</p>}
      <div className="flex justify-end">
        <Botao type="submit" carregando={salvando}>Cadastrar</Botao>
      </div>
    </form>
  )
}

function Especialidades() {
  const avisar = useAvisar()
  const [lista, setLista] = useState<Especialidade[] | null>(null)
  const [editando, setEditando] = useState<Especialidade | 'nova' | null>(null)
  const [nome, setNome] = useState('')
  const [excluindo, setExcluindo] = useState<Especialidade | null>(null)

  const carregar = useCallback(() => {
    api<Especialidade[]>('/api/especialidades').then(setLista).catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [avisar])
  useEffect(carregar, [carregar])

  function abrir(e: Especialidade | 'nova') {
    setNome(e === 'nova' ? '' : e.nome)
    setEditando(e)
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault()
    try {
      if (editando === 'nova') await api('/api/especialidades', 'POST', { nome })
      else if (editando) await api(`/api/especialidades/${editando.id}`, 'PUT', { nome })
      setEditando(null)
      avisar('Especialidade salva')
      carregar()
    } catch (e) {
      avisar(mensagemDe(e), 'erro')
    }
  }

  async function excluir(e: Especialidade) {
    setExcluindo(null)
    try {
      await api(`/api/especialidades/${e.id}`, 'DELETE')
      carregar()
    } catch {
      avisar('Não é possível excluir: a especialidade está em uso', 'erro')
    }
  }

  return (
    <>
      <CabecalhoPagina titulo="Especialidades" acao={<Botao onClick={() => abrir('nova')}>Nova especialidade</Botao>} />
      {lista === null ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Vazio>Nenhuma especialidade cadastrada.</Vazio>
      ) : (
        <Tabela colunas={['Nome', '']}>
          {lista.map((e) => (
            <Linha key={e.id}>
              <Celula><span className="font-medium">{e.nome}</span></Celula>
              <Celula acoes>
                <Botao variante="secundario" pequeno onClick={() => abrir(e)}>Renomear</Botao>
                <Botao variante="discreto" pequeno onClick={() => setExcluindo(e)}>Excluir</Botao>
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}
      <Modal aberto={editando !== null} aoFechar={() => setEditando(null)} titulo={editando === 'nova' ? 'Nova especialidade' : 'Renomear especialidade'}>
        <form onSubmit={salvar} className="space-y-4">
          <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
          <div className="flex justify-end"><Botao type="submit">Salvar</Botao></div>
        </form>
      </Modal>
      <Confirmacao
        aberto={excluindo !== null}
        titulo="Excluir especialidade?"
        texto="Só é possível excluir especialidades que não estão em uso."
        rotuloAcao="Excluir"
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={() => excluindo && excluir(excluindo)}
      />
    </>
  )
}

function Clinicas() {
  const avisar = useAvisar()
  const [lista, setLista] = useState<Clinica[] | null>(null)
  const [editando, setEditando] = useState<Clinica | 'nova' | null>(null)
  const [inativando, setInativando] = useState<Clinica | null>(null)

  const carregar = useCallback(() => {
    api<Clinica[]>('/api/clinicas').then(setLista).catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [avisar])
  useEffect(carregar, [carregar])

  async function inativar(c: Clinica) {
    setInativando(null)
    try {
      await api(`/api/clinicas/${c.id}`, 'DELETE')
      carregar()
    } catch (e) {
      avisar(mensagemDe(e), 'erro')
    }
  }

  return (
    <>
      <CabecalhoPagina titulo="Clínicas parceiras" acao={<Botao onClick={() => setEditando('nova')}>Nova clínica</Botao>} />
      {lista === null ? (
        <Carregando />
      ) : (
        <Tabela colunas={['Nome', 'CNPJ', 'Município', 'Situação', '']}>
          {lista.map((c) => (
            <Linha key={c.id}>
              <Celula><span className="font-medium">{c.nome}</span></Celula>
              <Celula rotulo="CNPJ"><span className="tabular">{c.cnpj}</span></Celula>
              <Celula rotulo="Município">{c.municipio.nome}</Celula>
              <Celula rotulo="Situação">{c.ativo ? 'Ativa' : <Selo tom="apagado">Inativa</Selo>}</Celula>
              <Celula acoes>
                <Botao variante="secundario" pequeno onClick={() => setEditando(c)}>Editar</Botao>
                {c.ativo && <Botao variante="discreto" pequeno onClick={() => setInativando(c)}>Inativar</Botao>}
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}
      <Modal aberto={editando !== null} aoFechar={() => setEditando(null)} titulo={editando === 'nova' ? 'Nova clínica' : 'Editar clínica'}>
        {editando !== null && (
          <FormClinica
            clinica={editando === 'nova' ? null : editando}
            aoSalvar={() => {
              setEditando(null)
              carregar()
            }}
          />
        )}
      </Modal>
      <Confirmacao
        aberto={inativando !== null}
        titulo="Inativar clínica?"
        texto="Ela deixa de aparecer para novos cadastros de médicos."
        rotuloAcao="Inativar"
        aoFechar={() => setInativando(null)}
        aoConfirmar={() => inativando && inativar(inativando)}
      />
    </>
  )
}

function FormClinica({ clinica, aoSalvar }: { clinica: Clinica | null; aoSalvar: () => void }) {
  const avisar = useAvisar()
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [nome, setNome] = useState(clinica?.nome ?? '')
  const [cnpj, setCnpj] = useState(clinica?.cnpj ?? '')
  const [municipioId, setMunicipioId] = useState(String(clinica?.municipio.id ?? ''))
  const [ativo, setAtivo] = useState(clinica?.ativo ?? true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api<Municipio[]>('/api/municipios')
      .then((lista) => {
        setMunicipios(lista)
        setMunicipioId((atual) => atual || String(lista[0]?.id ?? ''))
      })
      .catch((e) => avisar(mensagemDe(e), 'erro'))
  }, [avisar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    try {
      const corpo = { nome, cnpj, municipio: { id: Number(municipioId) }, ativo }
      await api(clinica ? `/api/clinicas/${clinica.id}` : '/api/clinicas', clinica ? 'PUT' : 'POST', corpo)
      avisar('Clínica salva')
      aoSalvar()
    } catch (falha) {
      setErro(mensagemDe(falha))
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="CNPJ (só números)" inputMode="numeric" pattern="\d{14}" maxLength={14} value={cnpj} onChange={(e) => setCnpj(e.target.value)} required />
        <Selecao rotulo="Município" value={municipioId} onChange={(e) => setMunicipioId(e.target.value)}>
          {municipios.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </Selecao>
      </div>
      <Marcador rotulo="Clínica ativa" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
      {erro && <p role="alert" className="rounded-xl bg-[#fdeceb] px-3.5 py-2.5 text-[14px] text-[#a3261b]">{erro}</p>}
      <div className="flex justify-end"><Botao type="submit">Salvar</Botao></div>
    </form>
  )
}
