import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tom = 'ok' | 'alerta' | 'erro'
interface Aviso {
  id: number
  texto: string
  tom: Tom
}

const Contexto = createContext<(texto: string, tom?: Tom) => void>(() => {})

/** Avisos curtos no canto da tela, lidos também por leitores de tela. */
export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const avisar = useCallback((texto: string, tom: Tom = 'ok') => {
    const id = Date.now() + Math.random()
    setAvisos((lista) => [...lista, { id, texto, tom }])
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), 4500)
  }, [])

  const cores: Record<Tom, string> = {
    ok: 'bg-tinta text-osso',
    alerta: 'bg-ambar-fundo text-ambar ring-1 ring-ambar/25',
    erro: 'bg-[#fdeceb] text-[#a3261b] ring-1 ring-[#a3261b]/25',
  }

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tom === 'erro' ? 'alert' : 'status'}
            className={`animate-[entrar_.25s_var(--ease-saida)_both] rounded-2xl px-4 py-3 text-sm font-medium shadow-e2 ${cores[a.tom]}`}
          >
            {a.texto}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}

export const useAvisar = () => useContext(Contexto)
