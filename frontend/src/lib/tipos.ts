/** Formatos das respostas da API (backend Spring Boot). */

export type Perfil = 'ACS' | 'UBS' | 'MEDICO' | 'GESTOR'

export interface Usuario {
  id: number
  nome: string
  email: string
  cpf: string
  perfil: Perfil
  ativo: boolean
}

export interface Sessao {
  token: string
  usuario: Usuario
  microareaId: number | null
  especialidadeId: number | null
}

export interface Municipio {
  id: number
  nome: string
  uf: string
}

export interface Microarea {
  id: number
  nome: string
}

export interface Especialidade {
  id: number
  nome: string
}

export interface Clinica {
  id: number
  nome: string
  cnpj: string
  ativo: boolean
  municipio: Municipio
}

export interface Medico {
  usuarioId: number
  usuario: Usuario
  crm: string
  ufCrm: string
  especialidade: Especialidade
}

export interface Paciente {
  id: number
  identificadorUnico: string
  nome: string
  cpf: string | null
  cns: string | null
  /** CPF (Lei 14.534/2023) ou, sem CPF, o CNS antigo. */
  cartaoSus: string | null
  dataNascimento: string
  telefone: string | null
  consentimentoEm: string | null
  ativo: boolean
  idade: number
  microarea: Microarea
}

export interface PacienteResumo {
  id: number
  identificadorUnico: string
  nome: string
  idade: number
}

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

export type StatusDossie = 'SINCRONIZADO' | 'AGUARDANDO_ENCAMINHAMENTO' | 'ENCAMINHADO' | 'LAUDO_EMITIDO'

export interface Prazo {
  situacao: 'SEM_PRAZO' | 'NO_PRAZO' | 'ALERTA' | 'ATRASADO'
  minutosRestantes: number | null
}

export interface Cid {
  codigo: string
  descricao: string
}

export interface Receita {
  prescricao: string
  farmaciaPopular: boolean
}

export interface Laudo {
  id: number
  parecer: string
  cid: Cid | null
  assinaturaDigital: string
  emitidoEm: string
  medico: Medico
  receitas: Receita[]
  dossie?: Dossie
}

export interface Dossie {
  id: number
  paciente: Paciente
  acs: { usuario: Usuario }
  especialidade: Especialidade | null
  dadosTriagem: DadosTriagem
  relato: string | null
  escore: number
  prioritario: boolean
  fatoresEscore: string[]
  status: StatusDossie
  coletadoEm: string
  prazo: Prazo
  laudo: Laudo | null
}

export interface AtendimentoHistorico {
  id: number
  coletadoEm: string
  dadosTriagem: DadosTriagem
  relato: string | null
  escore: number
  prioritario: boolean
  fatoresEscore: string[]
  status: StatusDossie
  prazo: Prazo
  especialidade: string | null
  medicoNome: string | null
  laudo: { cid: Cid | null; parecer: string; receitas: Receita[] } | null
}

export interface Anexo {
  id: number
  nomeArquivo: string
  tipoConteudo: string
  tamanho: number
  criadoEm: string
}

export interface Prescricao {
  id: number
  medicamento: string | null
  apresentacao: string | null
  descricao: string
  dose: string | null
  viaAdministracao: string | null
  frequencia: string | null
  duracao: string | null
  orientacoes: string | null
  farmaciaPopular: boolean
  assinadaEm: string
  assinaturaDigital: string
}

export interface Medicamento {
  nome: string
  principioAtivo: string
  apresentacao: string
}

export interface ResultadoSincronizacao {
  idLocal: string
  situacao: 'CRIADO' | 'JA_EXISTIA' | 'REJEITADO'
  mensagem: string
}

export interface Relatorio {
  triagens: number
  prioritarias: number
  laudosEmitidos: number
  viagensTfdEvitadas: number
  economiaEstimada: number
}

export interface LinhaExtrato {
  medico: string
  especialidade: string
  laudos: number
  valorPorLaudo: number
  total: number
}
