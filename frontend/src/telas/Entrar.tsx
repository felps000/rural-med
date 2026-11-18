import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PAGINA_DO_PERFIL, useSessao } from '../app/sessao'
import { mensagemDe } from '../lib/api'
import Foto from '../landing/Foto'
import { Botao, Campo } from '../ui/base'

const SENHA_DEMO = 'ruralmed123'
const CONTAS_DEMO = [
  { rotulo: 'Agente de saúde', email: 'acs@ruralmed.dev' },
  { rotulo: 'Equipe da UBS', email: 'ubs@ruralmed.dev' },
  { rotulo: 'Clínico geral', email: 'clinico@ruralmed.dev' },
  { rotulo: 'Cardiologista', email: 'cardio@ruralmed.dev' },
  { rotulo: 'Dermatologista', email: 'dermato@ruralmed.dev' },
  { rotulo: 'Gestor', email: 'gestor@ruralmed.dev' },
]

export default function Entrar() {
  const { sessao, entrar } = useSessao()
  const navegar = useNavigate()
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (sessao) return <Navigate to={PAGINA_DO_PERFIL[sessao.usuario.perfil]} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const nova = await entrar(login, senha)
      navegar(PAGINA_DO_PERFIL[nova.usuario.perfil])
    } catch (falha) {
      setErro(mensagemDe(falha))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-svh bg-osso lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <Foto nome="agente" alt="" posicao="38% 40%" prioridade />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0f1a14]/85 to-transparent" />
        <p className="absolute bottom-12 left-12 max-w-[16ch] text-[2.6rem] leading-[1.02] font-semibold tracking-tight text-osso">
          A consulta começa na varanda.
        </p>
      </div>

      <div className="flex flex-col px-6 py-8 sm:px-12">
        <a href="/" className="flex items-center gap-2 self-start font-semibold tracking-tight">
          <img src="/marca.svg" alt="" className="size-7" /> RuralMed
        </a>

        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="text-[2.4rem] leading-[1.02] font-semibold">Entrar</h1>
          <p className="mt-2 text-tinta-suave">Use seu e-mail ou CPF.</p>

          <form onSubmit={enviar} className="mt-8 space-y-4" noValidate>
            <Campo rotulo="E-mail ou CPF" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" required autoFocus />
            <Campo rotulo="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
            {erro && (
              <p role="alert" className="rounded-xl bg-[#fdeceb] px-3.5 py-2.5 text-[14px] text-[#a3261b]">
                {erro}
              </p>
            )}
            <Botao type="submit" carregando={enviando} className="w-full">
              Entrar
            </Botao>
          </form>

          <div className="mt-10">
            <p className="text-[13px] font-medium text-tinta-suave">
              Contas de demonstração · senha <code className="rounded bg-black/5 px-1">{SENHA_DEMO}</code>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CONTAS_DEMO.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => {
                    setLogin(c.email)
                    setSenha(SENHA_DEMO)
                    setErro('')
                  }}
                  className="rounded-full bg-white px-3 py-1.5 text-[13px] ring-1 ring-linha transition-colors hover:bg-floresta hover:text-osso hover:ring-floresta"
                >
                  {c.rotulo}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[12px] text-tinta-suave">Ambiente de demonstração. Não insira dados reais de pacientes.</p>
      </div>
    </div>
  )
}
