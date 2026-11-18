import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PAGINA_DO_PERFIL, ProvedorSessao, useSessao } from './app/sessao'
import Landing from './landing/Landing'
import type { Perfil } from './lib/tipos'
import { ProvedorAvisos } from './ui/avisos'
import { Carregando } from './ui/base'

// Cada painel só é baixado quando alguém daquele perfil entra.
const Entrar = lazy(() => import('./telas/Entrar'))
const PainelAcs = lazy(() => import('./telas/acs/PainelAcs'))
const PainelUbs = lazy(() => import('./telas/ubs/PainelUbs'))
const PainelMedico = lazy(() => import('./telas/medico/PainelMedico'))
const PainelGestor = lazy(() => import('./telas/gestor/PainelGestor'))

function Protegida({ perfil, children }: { perfil: Perfil; children: ReactNode }) {
  const { sessao } = useSessao()
  if (!sessao) return <Navigate to="/entrar" replace />
  if (sessao.usuario.perfil !== perfil) return <Navigate to={PAGINA_DO_PERFIL[sessao.usuario.perfil]} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <ProvedorSessao>
        <ProvedorAvisos>
          <Suspense fallback={<Carregando />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/entrar" element={<Entrar />} />
              <Route path="/acs" element={<Protegida perfil="ACS"><PainelAcs /></Protegida>} />
              <Route path="/ubs" element={<Protegida perfil="UBS"><PainelUbs /></Protegida>} />
              <Route path="/medico" element={<Protegida perfil="MEDICO"><PainelMedico /></Protegida>} />
              <Route path="/gestor" element={<Protegida perfil="GESTOR"><PainelGestor /></Protegida>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ProvedorAvisos>
      </ProvedorSessao>
    </BrowserRouter>
  )
}
