import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef, useState } from 'react'
import Foto from './Foto'
import TelaTriagem from './TelaTriagem'

gsap.registerPlugin(ScrollTrigger)

/** Rótulo único da ação principal, usado em toda a página. */
const ACAO = 'Acessar a demonstração'
const URL_DEMO = '/entrar'
const URL_CODIGO = 'https://github.com/felps000/rural-med'

const SEM_ANIMACAO = '(prefers-reduced-motion: reduce)'

export default function Landing() {
  return (
    <>
      <Navegacao />
      <main>
        <Abertura />
        <Estrada />
        <TriagemViva />
        <Caminho />
        <Fechamento />
      </main>
    </>
  )
}

function BotaoAcao({ escuro = false, className = '' }: { escuro?: boolean; className?: string }) {
  const cores = escuro
    ? 'bg-musgo text-floresta-escura hover:bg-[#b9da8f]'
    : 'bg-floresta text-osso hover:bg-floresta-escura'
  return (
    <a
      href={URL_DEMO}
      className={`inline-flex h-12 items-center whitespace-nowrap rounded-full px-6 text-[15px] font-medium shadow-e1 transition-[background-color,transform] duration-150 ease-saida active:scale-[0.97] ${cores} ${className}`}
    >
      {ACAO}
    </a>
  )
}

function Navegacao() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5 sm:px-8"
      >
        <a href="/" className="flex items-center gap-2 rounded-full bg-osso/70 py-1.5 pr-3 pl-1.5 font-semibold tracking-tight backdrop-blur-md">
          <img src="/marca.svg" alt="" className="size-7" />
          RuralMed
        </a>
        <a
          href={URL_DEMO}
          className="rounded-full bg-osso/70 px-4 py-2 text-sm font-medium backdrop-blur-md transition-colors duration-150 hover:bg-osso"
        >
          {ACAO}
        </a>
      </nav>
    </header>
  )
}

/* Ato 1: quietude. Paisagem em camadas; o título fica entre o fundo e o primeiro plano. */
function Abertura() {
  const raiz = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: raiz.current, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
        })
        tl.fromTo('[data-camada=fundo]', { scale: 1.04, yPercent: 0 }, { scale: 1.16, yPercent: -3 }, 0)
          .fromTo('[data-camada=frente]', { scale: 1, yPercent: 0 }, { scale: 1.35, yPercent: 12 }, 0)
          .to('[data-titulo]', { y: -90, opacity: 0, duration: 0.45 }, 0.05)
          .fromTo('[data-segunda]', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.3 }, 0.5)
      })
    }, raiz)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={raiz} className="relative h-svh motion-safe:h-[230vh]" aria-labelledby="titulo-abertura">
      <div className="sticky top-0 h-svh overflow-hidden bg-[#e9d6b8]">
        <div data-camada="fundo" className="absolute inset-0 origin-[60%_70%] will-change-transform">
          <Foto nome="hero-paisagem" alt="Casa isolada no sertão ao fim da tarde, no fim de uma estrada de terra" posicao="72% 60%" prioridade />
        </div>

        <div data-titulo className="absolute inset-x-0 top-[15svh] px-6 text-center">
          <h1 id="titulo-abertura" className="mx-auto max-w-[14ch] text-[clamp(2.6rem,7.2vw,6rem)] leading-[0.98] font-semibold">
            Saúde que chega antes da estrada.
          </h1>
          <p className="mx-auto mt-5 max-w-[34ch] text-lg text-tinta-suave sm:text-xl">
            Triagem no campo, mesmo sem internet. Laudo de especialista a distância.
          </p>
          <BotaoAcao className="mt-8" />
        </div>

        <div data-camada="frente" className="pointer-events-none absolute inset-0 origin-bottom will-change-transform">
          <Foto nome="primeiro-plano" alt="" posicao="center bottom" prioridade />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#1b140e]/80 to-transparent" />
        <p
          data-segunda
          className="absolute bottom-[12svh] left-6 max-w-[18ch] text-[clamp(1.8rem,4vw,3.2rem)] leading-[1.05] font-semibold tracking-tight text-osso opacity-0 motion-reduce:opacity-100 sm:left-12"
        >
          A consulta mais próxima pode estar a horas daqui.
        </p>
      </div>
    </section>
  )
}

/*
 * Atos 2 e 3: peso, depois alívio (o pico).
 * A estrada ocupa a tela; as frases chegam uma a uma. Depois a estrada encolhe
 * até caber no celular da agente de saúde, e vira a tela de triagem.
 */
function Estrada() {
  const raiz = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const alvo = raiz.current!.querySelector<HTMLElement>('[data-alvo-celular]')!
        const palco = raiz.current!.querySelector<HTMLElement>('[data-palco]')!

        // Recorte da estrada que coincide com a tela do celular (recalculado ao redimensionar).
        const recorteFinal = () => {
          const p = palco.getBoundingClientRect()
          const a = alvo.getBoundingClientRect()
          return `inset(${a.top - p.top}px ${p.right - a.right}px ${p.bottom - a.bottom}px ${a.left - p.left}px round 44px)`
        }

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: raiz.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        })
        // Ato 2: a estrada se alonga e as frases se acumulam.
        tl.fromTo('[data-estrada-foto]', { scale: 1 }, { scale: 1.22, duration: 0.36 }, 0)
          .fromTo('[data-frase="1"]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.06 }, 0.04)
          .fromTo('[data-frase="2"]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.06 }, 0.12)
          .fromTo('[data-frase="3"]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.06 }, 0.2)
          .to('[data-frases]', { opacity: 0, y: -24, duration: 0.05 }, 0.32)
          // Ato 3: a estrada encolhe até a tela do celular.
          .fromTo(
            '[data-estrada]',
            { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
            { clipPath: recorteFinal, duration: 0.34, ease: 'power2.inOut' },
            0.38,
          )
          .fromTo('[data-agente]', { scale: 1.12 }, { scale: 1, duration: 0.4, ease: 'power1.out' }, 0.38)
          .fromTo('[data-moldura]', { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.68)
          .fromTo('[data-tela]', { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.74)
          .fromTo('[data-virada]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.1 }, 0.82)
      })
    }, raiz)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={raiz} className="relative motion-safe:h-[500vh]" aria-labelledby="titulo-virada">
      <div data-palco className="grao relative h-svh overflow-hidden bg-floresta-escura motion-safe:sticky motion-safe:top-0">
        {/* Fundo do ato 3: a agente de saúde na varanda. */}
        {/* No computador, a foto ocupa a esquerda e o celular fica à direita, sem cobrir ninguém. */}
        <div data-agente className="absolute inset-0 overflow-hidden will-change-transform md:right-[38%]">
          <Foto nome="agente" alt="Agente comunitária de saúde mede a pressão de um senhor na varanda de casa" posicao="40% 38%" />
        </div>
        <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-[#0f1a14]/85 to-transparent md:hidden" />
        <div className="absolute bottom-0 left-0 hidden h-[55%] w-[62%] bg-gradient-to-t from-[#0f1a14]/90 to-transparent md:block" />

        {/* Ato 2: a estrada, que depois encolhe. Some por completo no modo sem animação. */}
        <div
          data-estrada
          className="absolute inset-0 overflow-hidden will-change-[clip-path] motion-reduce:hidden"
        >
          <div data-estrada-foto className="absolute inset-0 origin-[50%_46%] will-change-transform">
            <Foto nome="estrada" alt="Estrada de terra longa e vazia até o horizonte" />
          </div>
          <div className="absolute inset-y-0 left-0 w-[70%] bg-gradient-to-r from-[#1b140e]/70 to-transparent" />
          <div data-frases className="absolute top-1/2 left-6 -translate-y-1/2 space-y-2 sm:left-14">
            {['Para ver um especialista,', 'seu Antônio sai de madrugada', 'e só volta no outro dia.'].map((frase, i) => (
              <p
                key={frase}
                data-frase={i + 1}
                className="text-[clamp(1.9rem,4.6vw,3.8rem)] leading-[1.05] font-semibold tracking-tight text-osso"
              >
                {frase}
              </p>
            ))}
          </div>
        </div>

        {/* O celular: a estrada encolhe exatamente até este retângulo. */}
        <div
          data-alvo-celular
          className="absolute bottom-[7svh] left-1/2 h-[min(54svh,600px)] w-[min(26svh,290px)] -translate-x-1/2 md:top-1/2 md:bottom-auto md:left-[81%] md:h-[min(62svh,600px)] md:w-[min(30svh,290px)] md:-translate-y-1/2"
        >
          <div
            data-moldura
            className="absolute -inset-[7px] rounded-[51px] border-[7px] border-[#1d2522] opacity-0 shadow-e3 motion-reduce:opacity-100"
          />
          <div data-tela className="absolute inset-0 overflow-hidden rounded-[44px] opacity-0 motion-reduce:opacity-100">
            <TelaTriagem progresso={0.3} />
          </div>
        </div>

        <div data-virada className="absolute top-[14svh] left-6 w-[min(88vw,36rem)] text-osso opacity-0 motion-reduce:opacity-100 md:top-auto md:bottom-[12svh] md:left-14">
          <h2 id="titulo-virada" className="max-w-[12ch] text-[clamp(2.2rem,5.4vw,4.6rem)] leading-[1] font-semibold">
            Agora, a consulta começa na varanda.
          </h2>
        </div>
      </div>
    </section>
  )
}

/* Ato 4: confiança. A rolagem preenche uma triagem de verdade; o escore usa a regra do sistema. */
function TriagemViva() {
  const raiz = useRef<HTMLElement>(null)
  // Sem animação, a triagem já aparece completa.
  const [progresso, setProgresso] = useState(() => (window.matchMedia(SEM_ANIMACAO).matches ? 1 : 0))
  const [saturacao, setSaturacao] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (window.matchMedia(SEM_ANIMACAO).matches) return
    let quadro = 0
    const gatilho = ScrollTrigger.create({
      trigger: raiz.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        cancelAnimationFrame(quadro)
        quadro = requestAnimationFrame(() => setProgresso(Math.min(1, self.progress / 0.92)))
      },
    })
    return () => {
      cancelAnimationFrame(quadro)
      gatilho.kill()
    }
  }, [])

  const legendas = [
    { ate: 0.56, titulo: 'Ela registra tudo ali mesmo.', texto: 'Queixa e sinais vitais vão direto para o celular. Sem sinal, a triagem fica guardada no aparelho e sobe sozinha quando a internet volta.' },
    { ate: 0.86, titulo: 'O risco é calculado na hora.', texto: 'Cada alteração soma pontos, e o sistema mostra quais. Nada de caixa-preta: a agente vê o porquê.' },
    { ate: 1.01, titulo: 'Casos graves furam a fila.', texto: 'Falta de ar, dor no peito ou pressão muito alta marcam o caso como prioritário, mesmo com poucos pontos.' },
  ]
  const atual = legendas.find((l) => progresso < l.ate) ?? legendas[legendas.length - 1]
  const concluida = progresso >= 0.999

  return (
    <section ref={raiz} className="relative bg-osso motion-safe:h-[320vh]" aria-labelledby="titulo-triagem">
      <div className="flex min-h-svh items-center motion-safe:sticky motion-safe:top-0 motion-safe:h-svh">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-6 px-6 pt-20 pb-8 sm:gap-10 sm:px-10 sm:py-24 lg:grid-cols-[1fr_auto] lg:gap-24">
          <div className="max-w-[30rem]">
            <h2 id="titulo-triagem" className="sr-only">Como funciona a triagem</h2>
            <div key={atual.titulo} className="animate-[entrar_.35s_var(--ease-saida)_both]">
              <p className="text-[clamp(1.7rem,4vw,3.4rem)] leading-[1.02] font-semibold tracking-tight">{atual.titulo}</p>
              <p className="mt-5 hidden max-w-[42ch] text-lg leading-relaxed text-tinta-suave sm:block">{atual.texto}</p>
            </div>

            <div
              className="mt-6 transition-opacity duration-300 sm:mt-10"
              style={{ opacity: concluida ? 1 : 0, pointerEvents: concluida ? 'auto' : 'none' }}
              aria-hidden={!concluida}
            >
              <label htmlFor="saturacao" className="text-sm font-medium">
                Experimente: mude a saturação de oxigênio
              </label>
              <div className="mt-3 flex items-center gap-4">
                <input
                  id="saturacao"
                  type="range"
                  min={80}
                  max={100}
                  value={saturacao ?? 92}
                  onChange={(e) => setSaturacao(Number(e.target.value))}
                  tabIndex={concluida ? 0 : -1}
                  className="w-56 accent-floresta"
                />
                <span className="tabular w-14 text-lg font-semibold">{saturacao ?? 92}%</span>
              </div>
              <p className="mt-2 text-sm text-tinta-suave">Abaixo de 90%, o caso vira sinal de alerta.</p>
            </div>
          </div>

          <div className="relative mx-auto h-[min(60svh,620px)] w-[min(29svh,300px)] shrink-0 sm:h-[min(68svh,620px)] sm:w-[min(33svh,300px)]">
            <div className="absolute -inset-[7px] rounded-[51px] border-[7px] border-[#1d2522] shadow-e3" />
            <div className="absolute inset-0 overflow-hidden rounded-[44px]">
              <TelaTriagem progresso={progresso} saturacaoManual={saturacao} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* Ato 5: clareza. O caminho do caso, de lado: rolagem vertical, viagem horizontal. */
function Caminho() {
  const raiz = useRef<HTMLElement>(null)
  const trilho = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        const distancia = () => trilho.current!.scrollWidth - window.innerWidth
        gsap.to(trilho.current, {
          x: () => -distancia(),
          ease: 'none',
          scrollTrigger: {
            trigger: raiz.current,
            start: 'top top',
            end: () => `+=${distancia()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        })
      })
    }, raiz)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={raiz} className="relative overflow-hidden bg-superficie" aria-labelledby="titulo-caminho">
      <div
        ref={trilho}
        className="flex flex-col gap-16 px-6 py-24 motion-safe:min-[900px]:h-svh motion-safe:min-[900px]:w-max motion-safe:min-[900px]:flex-row motion-safe:min-[900px]:items-center motion-safe:min-[900px]:gap-[6vw] motion-safe:min-[900px]:px-[8vw] motion-safe:min-[900px]:py-0"
      >
        <div className="motion-safe:min-[900px]:w-[34vw]">
          <h2 id="titulo-caminho" className="text-[clamp(2.4rem,5vw,4.4rem)] leading-[1] font-semibold">
            Do quintal ao laudo.
          </h2>
          <p className="mt-5 max-w-[34ch] text-lg text-tinta-suave">
            Quatro pessoas, um mesmo caso. Ninguém precisou pegar a estrada.
          </p>
        </div>

        <figure className="max-w-[56rem] motion-safe:min-[900px]:w-[46vw] motion-safe:min-[900px]:max-w-none">
          <div className="aspect-[4/3] overflow-hidden rounded-[28px] shadow-e2 motion-safe:min-[900px]:aspect-auto motion-safe:min-[900px]:h-[56svh]">
            <Foto nome="agente" alt="Agente de saúde registra a triagem no celular" posicao="35% 45%" />
          </div>
          <figcaption className="mt-5 max-w-[40ch]">
            <span className="font-semibold">No campo.</span>{' '}
            <span className="text-tinta-suave">A agente comunitária faz a triagem e o sistema calcula o risco.</span>
          </figcaption>
        </figure>

        <div className="flex flex-col justify-end rounded-[28px] bg-floresta p-8 text-osso shadow-e2 motion-safe:min-[900px]:h-[56svh] motion-safe:min-[900px]:w-[30vw] motion-safe:min-[900px]:p-10">
          <p className="text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.05] font-semibold tracking-tight">Na UBS.</p>
          <p className="mt-4 max-w-[30ch] text-lg text-osso/80">
            A equipe vê os casos em ordem de prioridade e encaminha cada um para a especialidade certa.
          </p>
        </div>

        <figure className="max-w-[56rem] motion-safe:min-[900px]:max-w-none motion-safe:min-[900px]:w-[40vw] motion-safe:min-[900px]:self-end motion-safe:min-[900px]:pb-[10svh]">
          <div className="aspect-[3/2] overflow-hidden rounded-[28px] shadow-e2">
            <Foto nome="medica" alt="Médica analisa o caso no computador do consultório" posicao="60% 40%" />
          </div>
          <figcaption className="mt-5 max-w-[40ch]">
            <span className="font-semibold">Com a especialista.</span>{' '}
            <span className="text-tinta-suave">Laudo com CID e receita estruturada, assinados a distância.</span>
          </figcaption>
        </figure>

        <div className="motion-safe:min-[900px]:w-[32vw]">
          <p className="text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.05] font-semibold tracking-tight">Na gestão.</p>
          <p className="mt-4 max-w-[34ch] text-lg text-tinta-suave">
            Cada laudo emitido é uma viagem que não precisou acontecer. O painel do gestor mostra quantas foram, e quanto
            custariam ao município.
          </p>
        </div>
      </div>
    </section>
  )
}

/* Ato 6: convite. Fundo escuro, uma frase firme e uma única ação. Não some: fica. */
function Fechamento() {
  return (
    <section className="grao relative flex min-h-svh flex-col bg-floresta-escura text-osso" aria-labelledby="titulo-fechamento">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-6 py-28 sm:px-10">
        <h2 id="titulo-fechamento" className="text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.96] font-semibold">
          A distância continua.
          <br />
          <span className="text-musgo">A espera, não.</span>
        </h2>
        <div className="mt-12 flex flex-wrap items-center gap-6">
          <BotaoAcao escuro />
          <span className="text-osso/70">Contas de teste prontas, sem cadastro.</span>
        </div>
      </div>
      <footer className="mx-auto flex w-full max-w-[1200px] flex-wrap justify-between gap-4 border-t border-osso/15 px-6 py-8 text-sm text-osso/65 sm:px-10">
        <p>Projeto acadêmico · Universidade Presbiteriana Mackenzie</p>
        <a href={URL_CODIGO} className="underline hover:text-osso">
          Código no GitHub
        </a>
      </footer>
    </section>
  )
}
