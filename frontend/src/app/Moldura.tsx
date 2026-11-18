import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Modal } from '../ui/base'
import { useSessaoAtiva, useSessao } from './sessao'

export interface Aba {
  id: string
  rotulo: string
}

const NOMES_PERFIL = {
  ACS: 'Agente comunitário de saúde',
  UBS: 'Equipe da UBS',
  MEDICO: 'Médico',
  GESTOR: 'Gestor',
} as const

const CHAVE_CONTRASTE = 'ruralmed.contraste'

/** Aba atual guardada na URL (?aba=...), para o voltar do navegador funcionar. */
export function useAba(abas: Aba[]) {
  const [parametros, setParametros] = useSearchParams()
  const atual = abas.find((a) => a.id === parametros.get('aba'))?.id ?? abas[0].id
  const ir = (id: string) => setParametros({ aba: id })
  return [atual, ir] as const
}

export function Moldura({ abas, atual, aoTrocar, children }: { abas: Aba[]; atual: string; aoTrocar: (id: string) => void; children: ReactNode }) {
  return (
    <div className="min-h-svh bg-osso">
      <header className="sticky top-0 z-40 border-b border-linha/60 bg-osso/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-8">
          <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <img src="/marca.svg" alt="" className="size-7" />
            <span className="hidden sm:inline">RuralMed</span>
          </a>
          {abas.length > 1 && (
            <nav aria-label="Seções" className="mx-auto hidden md:block">
              <Abas abas={abas} atual={atual} aoTrocar={aoTrocar} />
            </nav>
          )}
          <MenuUsuario />
        </div>
        {abas.length > 1 && (
          <nav aria-label="Seções" className="overflow-x-auto px-4 pb-3 md:hidden">
            <Abas abas={abas} atual={atual} aoTrocar={aoTrocar} />
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-[1200px] px-4 pt-10 pb-24 sm:px-8">{children}</main>
    </div>
  )
}

/** Controle segmentado, no estilo dos apps da Apple. */
function Abas({ abas, atual, aoTrocar }: { abas: Aba[]; atual: string; aoTrocar: (id: string) => void }) {
  return (
    <div className="inline-flex rounded-full bg-black/[0.05] p-1">
      {abas.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => aoTrocar(a.id)}
          aria-current={a.id === atual ? 'page' : undefined}
          className={`rounded-full px-4 py-1.5 text-[14px] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 ${
            a.id === atual ? 'bg-white text-tinta shadow-e1' : 'text-tinta-suave hover:text-tinta'
          }`}
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  )
}

function MenuUsuario() {
  const sessao = useSessaoAtiva()
  const { sair } = useSessao()
  const [aberto, setAberto] = useState(false)
  const [perfilAberto, setPerfilAberto] = useState(false)
  const [contraste, setContraste] = useState(() => localStorage.getItem(CHAVE_CONTRASTE) === 'alto')
  const ref = useRef<HTMLDivElement>(null)
  const { usuario } = sessao

  useEffect(() => {
    document.documentElement.dataset.contraste = contraste ? 'alto' : ''
    localStorage.setItem(CHAVE_CONTRASTE, contraste ? 'alto' : '')
  }, [contraste])

  useEffect(() => {
    if (!aberto) return
    const fechar = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAberto(false)
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fechar)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fechar)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  const item = 'block w-full rounded-xl px-3 py-2 text-left text-[14px] transition-colors hover:bg-osso'
  return (
    <div ref={ref} className="relative ml-auto md:ml-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition-colors hover:bg-black/5"
      >
        <span className="grid size-8 place-items-center rounded-full bg-floresta text-[13px] font-semibold text-osso" aria-hidden>
          {usuario.nome.trim().charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[12ch] truncate text-[14px] font-medium">{usuario.nome.split(' ')[0]}</span>
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 mt-2 w-60 animate-[entrar_.18s_var(--ease-saida)_both] rounded-2xl bg-white p-1.5 shadow-e3 ring-1 ring-black/5">
          <p className="px-3 pt-2 pb-1 text-[12px] text-tinta-suave">{NOMES_PERFIL[usuario.perfil]}</p>
          <button role="menuitem" type="button" className={item} onClick={() => { setPerfilAberto(true); setAberto(false) }}>
            Meu perfil
          </button>
          <button role="menuitemcheckbox" aria-checked={contraste} type="button" className={`${item} flex justify-between`} onClick={() => setContraste((v) => !v)}>
            Alto contraste <span className="text-tinta-suave">{contraste ? 'Ligado' : 'Desligado'}</span>
          </button>
          <div className="my-1 h-px bg-linha/70" />
          <button role="menuitem" type="button" className={`${item} text-[#a3261b]`} onClick={sair}>
            Sair
          </button>
        </div>
      )}
      <Modal aberto={perfilAberto} aoFechar={() => setPerfilAberto(false)} titulo="Meu perfil">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-floresta text-xl font-semibold text-osso" aria-hidden>
            {usuario.nome.trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-semibold">{usuario.nome}</p>
            <p className="text-tinta-suave">{NOMES_PERFIL[usuario.perfil]}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-3 text-[15px]">
          <div className="flex justify-between gap-4 border-b border-linha/60 pb-3">
            <dt className="text-tinta-suave">E-mail</dt>
            <dd>{usuario.email || 'Não informado'}</dd>
          </div>
        </dl>
      </Modal>
    </div>
  )
}
