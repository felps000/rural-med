import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { textoPrazo } from '../lib/formato'
import { classificar, CLASSIFICACOES } from '../lib/manchester'
import type { DadosTriagem, Prazo } from '../lib/tipos'

/* Botões: um primário por tela; o resto é secundário ou discreto. */
type Variante = 'primario' | 'secundario' | 'discreto' | 'perigo'
const VARIANTES: Record<Variante, string> = {
  primario: 'bg-floresta text-osso hover:bg-floresta-escura shadow-e1',
  secundario: 'bg-white text-tinta ring-1 ring-linha hover:bg-osso',
  discreto: 'text-floresta hover:bg-floresta/8',
  perigo: 'bg-white text-[#a3261b] ring-1 ring-[#a3261b]/30 hover:bg-[#fdeceb]',
}

export function Botao({
  variante = 'primario',
  pequeno = false,
  carregando = false,
  className = '',
  children,
  disabled,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; pequeno?: boolean; carregando?: boolean }) {
  return (
    <button
      type="button"
      {...resto}
      disabled={disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,transform,opacity] duration-150 ease-saida active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${
        pequeno ? 'h-8 px-3.5 text-[13px]' : 'h-11 px-5 text-[15px]'
      } ${VARIANTES[variante]} ${className}`}
    >
      {carregando && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  )
}

const CAMPO_BASE =
  'w-full rounded-xl border border-linha bg-white px-3.5 text-[15px] text-tinta shadow-[inset_0_1px_0_rgb(0_0_0/0.02)] transition-[border-color,box-shadow] duration-150 placeholder:text-tinta-suave/60 focus:border-floresta focus:ring-4 focus:ring-floresta/12 focus:outline-none disabled:bg-osso [&[readonly]]:bg-osso'

interface Rotulado {
  rotulo: ReactNode
  ajuda?: ReactNode
  className?: string
}

function Rotulo({ id, rotulo, ajuda, children, className = '' }: Rotulado & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-tinta-suave">
        {rotulo}
      </label>
      {children}
      {ajuda && <p className="mt-1.5 text-[12px] leading-snug text-tinta-suave">{ajuda}</p>}
    </div>
  )
}

export function Campo({ rotulo, ajuda, className, ...resto }: Rotulado & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Rotulo id={resto.id ?? id} rotulo={rotulo} ajuda={ajuda} className={className}>
      <input id={resto.id ?? id} {...resto} className={`${CAMPO_BASE} h-11`} />
    </Rotulo>
  )
}

export function AreaTexto({ rotulo, ajuda, className, ...resto }: Rotulado & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Rotulo id={resto.id ?? id} rotulo={rotulo} ajuda={ajuda} className={className}>
      <textarea id={resto.id ?? id} rows={4} {...resto} className={`${CAMPO_BASE} py-2.5 leading-relaxed`} />
    </Rotulo>
  )
}

export function Selecao({
  rotulo,
  ajuda,
  className,
  children,
  ...resto
}: Rotulado & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Rotulo id={resto.id ?? id} rotulo={rotulo} ajuda={ajuda} className={className}>
      <select id={resto.id ?? id} {...resto} className={`${CAMPO_BASE} h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234b5b53' stroke-width='1.6' fill='none'/%3E%3C/svg%3E")] bg-[position:right_14px_center] bg-no-repeat pr-10`}>
        {children}
      </select>
    </Rotulo>
  )
}

export function Marcador({ rotulo, ...resto }: { rotulo: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[15px] leading-snug">
      <input type="checkbox" {...resto} className="mt-0.5 size-[18px] shrink-0 accent-floresta" />
      <span>{rotulo}</span>
    </label>
  )
}

/* Selos: pílulas pequenas para estado. */
type TomSelo = 'neutro' | 'verde' | 'alerta' | 'perigo' | 'apagado'
const TONS: Record<TomSelo, string> = {
  neutro: 'bg-osso text-tinta-suave',
  verde: 'bg-musgo/30 text-floresta',
  alerta: 'bg-ambar-fundo text-ambar',
  perigo: 'bg-[#fdeceb] text-[#a3261b]',
  apagado: 'bg-osso text-tinta-suave/70 line-through',
}
export function Selo({ tom = 'neutro', children }: { tom?: TomSelo; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap ${TONS[tom]}`}>{children}</span>
}

/** Um caso classificado: escore e prioridade do servidor, mais os sinais vitais. */
export interface CasoClassificavel {
  escore: number
  prioritario: boolean
  dadosTriagem?: Partial<DadosTriagem> | null
}

/** Selo com a cor e o nome da classificação de Manchester. */
export function SeloRisco({ caso }: { caso: CasoClassificavel }) {
  const c = classificar(caso)
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ${c.classes}`}>{c.rotulo}</span>
}

/** Número do escore num círculo com a cor de Manchester. */
export function Escore({ caso, grande = false }: { caso: CasoClassificavel; grande?: boolean }) {
  const c = classificar(caso)
  return (
    <span
      title={c.rotulo}
      className={`tabular inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${c.classes} ${grande ? 'size-16 text-2xl' : 'size-12 text-lg'}`}
    >
      {Math.round(caso.escore)}
    </span>
  )
}

export function SeloPrazo({ prazo }: { prazo: Prazo | null | undefined }) {
  const p = textoPrazo(prazo)
  if (!p) return null
  return <Selo tom={p.tom === 'perigo' ? 'perigo' : p.tom === 'alerta' ? 'alerta' : 'neutro'}>{p.texto}</Selo>
}

/** Legenda das 5 cores, para as listas de casos. */
export function LegendaManchester() {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Legenda da classificação de risco">
      {Object.values(CLASSIFICACOES).map((c) => (
        <span key={c.cor} className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${c.classes}`}>{c.rotulo}</span>
      ))}
    </div>
  )
}

export function Superficie({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-[22px] bg-white p-5 shadow-e1 ring-1 ring-black/[0.03] sm:p-6 ${className}`}>{children}</div>
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-[22px] border border-dashed border-linha px-6 py-12 text-center text-tinta-suave">{children}</p>
}

export function Carregando() {
  return (
    <div className="flex justify-center py-16" role="status" aria-label="Carregando">
      <span className="size-6 animate-spin rounded-full border-2 border-floresta border-r-transparent" />
    </div>
  )
}

export function CabecalhoPagina({ titulo, descricao, acao }: { titulo: string; descricao?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.05] font-semibold">{titulo}</h1>
        {descricao && <p className="mt-2 max-w-[60ch] text-tinta-suave">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}

/** Janela modal nativa (<dialog>): foco preso, Esc fecha, fundo inerte. */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  largo = false,
  children,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  largo?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberto && !dialogo.open) dialogo.showModal()
    if (!aberto && dialogo.open) dialogo.close()
  }, [aberto])

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      className={`m-auto max-h-[92svh] w-[calc(100vw-24px)] overflow-hidden rounded-[26px] bg-osso p-0 text-tinta shadow-e3 backdrop:bg-tinta/40 backdrop:backdrop-blur-sm open:animate-[entrar_.25s_var(--ease-saida)_both] ${
        largo ? 'max-w-4xl' : 'max-w-xl'
      }`}
    >
      {aberto && (
        <div className="flex max-h-[92svh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-linha/70 bg-osso/90 px-6 py-4 backdrop-blur">
            <h2 className="text-xl font-semibold tracking-tight">{titulo}</h2>
            <button
              type="button"
              onClick={aoFechar}
              className="grid size-8 place-items-center rounded-full bg-black/5 text-tinta-suave transition-colors hover:bg-black/10"
              aria-label="Fechar"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-6">{children}</div>
        </div>
      )}
    </dialog>
  )
}

/** Pergunta de confirmação no lugar do confirm() do navegador. */
export function Confirmacao({
  aberto,
  titulo,
  texto,
  rotuloAcao,
  aoConfirmar,
  aoFechar,
}: {
  aberto: boolean
  titulo: string
  texto: string
  rotuloAcao: string
  aoConfirmar: () => void
  aoFechar: () => void
}) {
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={titulo}>
      <p className="text-tinta-suave">{texto}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Botao variante="secundario" onClick={aoFechar}>
          Cancelar
        </Botao>
        <Botao variante="perigo" onClick={aoConfirmar}>
          {rotuloAcao}
        </Botao>
      </div>
    </Modal>
  )
}

/** Tabela responsiva: no celular cada linha vira um bloco com rótulos. */
export function Tabela({ colunas, children }: { colunas: string[]; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-e1 ring-1 ring-black/[0.03]">
      <table className="w-full text-left text-[14px]">
        <thead className="hidden border-b border-linha/70 text-[12px] text-tinta-suave md:table-header-group">
          <tr>
            {colunas.map((c) => (
              <th key={c} className="px-5 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-linha/60">{children}</tbody>
      </table>
    </div>
  )
}

export function Linha({ children }: { children: ReactNode }) {
  return <tr className="block px-5 py-3 md:table-row md:p-0">{children}</tr>
}

export function Celula({ rotulo, children, acoes = false }: { rotulo?: string; children: ReactNode; acoes?: boolean }) {
  return (
    <td className={`flex gap-3 py-1 md:table-cell md:px-5 md:py-3.5 ${acoes ? 'justify-end md:text-right' : ''}`}>
      {rotulo && <span className="w-28 shrink-0 text-[12px] text-tinta-suave md:hidden">{rotulo}</span>}
      <span className={acoes ? 'flex flex-wrap justify-end gap-1.5' : ''}>{children}</span>
    </td>
  )
}
