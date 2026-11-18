import type { Sessao } from './tipos'

const CHAVE_SESSAO = 'ruralmed.sessao'

export function lerSessao(): Sessao | null {
  try {
    const texto = localStorage.getItem(CHAVE_SESSAO)
    return texto ? (JSON.parse(texto) as Sessao) : null
  } catch {
    return null
  }
}

export function guardarSessao(sessao: Sessao | null) {
  if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao))
  else localStorage.removeItem(CHAVE_SESSAO)
}

/** Erro da API com a mensagem que o servidor devolveu em {"mensagem": "..."}. */
export class ErroApi extends Error {
  readonly status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

/** Avisado quando a sessão expira, para a interface voltar ao login. */
let aoExpirar: () => void = () => {}
export function quandoSessaoExpirar(acao: () => void) {
  aoExpirar = acao
}

async function lerErro(resposta: Response): Promise<ErroApi> {
  let mensagem = `Erro ${resposta.status}`
  try {
    const corpo = await resposta.json()
    if (corpo?.mensagem) mensagem = corpo.mensagem
  } catch {
    /* corpo vazio ou não JSON */
  }
  if (resposta.status === 403 && mensagem === 'Faça login para continuar') {
    guardarSessao(null)
    aoExpirar()
  }
  return new ErroApi(resposta.status, mensagem)
}

function cabecalhos(extra: Record<string, string> = {}) {
  const sessao = lerSessao()
  return sessao ? { ...extra, Authorization: sessao.token } : extra
}

export async function api<T>(url: string, metodo = 'GET', corpo?: unknown): Promise<T> {
  const resposta = await fetch(url, {
    method: metodo,
    headers: cabecalhos(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  if (!resposta.ok) throw await lerErro(resposta)
  const texto = await resposta.text()
  return (texto ? JSON.parse(texto) : null) as T
}

export async function enviarArquivo<T>(url: string, arquivo: File): Promise<T> {
  const dados = new FormData()
  dados.append('arquivo', arquivo)
  const resposta = await fetch(url, { method: 'POST', headers: cabecalhos(), body: dados })
  if (!resposta.ok) throw await lerErro(resposta)
  return (await resposta.json()) as T
}

/** Baixa um arquivo protegido por login e entrega ao navegador com o nome original. */
export async function baixarArquivo(url: string) {
  const resposta = await fetch(url, { headers: cabecalhos() })
  if (!resposta.ok) throw await lerErro(resposta)
  const disposicao = resposta.headers.get('Content-Disposition') ?? ''
  const utf8 = disposicao.match(/filename\*=UTF-8''([^;]+)/i)
  const simples = disposicao.match(/filename="?([^";]+)"?/i)
  const nome = utf8 ? decodeURIComponent(utf8[1]) : simples ? simples[1] : 'arquivo'
  const endereco = URL.createObjectURL(await resposta.blob())
  const link = document.createElement('a')
  link.href = endereco
  link.download = nome
  link.click()
  setTimeout(() => URL.revokeObjectURL(endereco), 1000)
}

export const mensagemDe = (erro: unknown) => (erro instanceof Error ? erro.message : 'Algo deu errado')
