import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, guardarSessao, lerSessao, quandoSessaoExpirar } from '../lib/api'
import type { Perfil, Sessao } from '../lib/tipos'

interface ContextoSessao {
  sessao: Sessao | null
  entrar: (login: string, senha: string) => Promise<Sessao>
  sair: () => Promise<void>
}

const Contexto = createContext<ContextoSessao | null>(null)

export const PAGINA_DO_PERFIL: Record<Perfil, string> = {
  ACS: '/acs',
  UBS: '/ubs',
  MEDICO: '/medico',
  GESTOR: '/gestor',
}

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(lerSessao)

  useEffect(() => quandoSessaoExpirar(() => setSessao(null)), [])

  const entrar = useCallback(async (login: string, senha: string) => {
    const nova = await api<Sessao>('/api/login', 'POST', { login, senha })
    guardarSessao(nova)
    setSessao(nova)
    return nova
  }, [])

  const sair = useCallback(async () => {
    try {
      await api('/api/sair', 'POST')
    } catch {
      /* já estava sem sessão */
    }
    guardarSessao(null)
    setSessao(null)
  }, [])

  const valor = useMemo(() => ({ sessao, entrar, sair }), [sessao, entrar, sair])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSessao() {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useSessao fora do ProvedorSessao')
  return contexto
}

/** Sessão garantida: só use dentro de rotas protegidas. */
export function useSessaoAtiva(): Sessao {
  const { sessao } = useSessao()
  if (!sessao) throw new Error('Rota protegida sem sessão')
  return sessao
}
