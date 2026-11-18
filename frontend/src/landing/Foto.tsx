import { useState } from 'react'

export type NomeFoto = 'hero-paisagem' | 'primeiro-plano' | 'estrada' | 'agente' | 'medica'

interface Props {
  nome: NomeFoto
  alt: string
  className?: string
  /** Posição do recorte (object-position), útil para recompor no celular. */
  posicao?: string
  prioridade?: boolean
}

/**
 * Foto da landing page. Enquanto a imagem definitiva não existe em /public/landing,
 * mostra uma composição provisória no mesmo enquadramento, para a página nunca quebrar.
 */
export default function Foto({ nome, alt, className = '', posicao = 'center', prioridade = false }: Props) {
  const [falhou, setFalhou] = useState(false)

  if (falhou) {
    return <Provisoria nome={nome} className={className} rotulo={alt} />
  }
  return (
    <img
      src={`/landing/${nome}.webp`}
      alt={alt}
      className={`h-full w-full object-cover ${className}`}
      style={{ objectPosition: posicao }}
      loading={prioridade ? 'eager' : 'lazy'}
      fetchPriority={prioridade ? 'high' : 'auto'}
      decoding="async"
      draggable={false}
      onError={() => setFalhou(true)}
    />
  )
}

function Provisoria({ nome, className, rotulo }: { nome: NomeFoto; className: string; rotulo: string }) {
  const comum = `h-full w-full ${className}`
  switch (nome) {
    case 'hero-paisagem':
      return (
        <svg className={comum} viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" role="img" aria-label={rotulo}>
          <defs>
            <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9d9e2" />
              <stop offset=".55" stopColor="#f1dfc0" />
              <stop offset="1" stopColor="#e9b98a" />
            </linearGradient>
            <linearGradient id="chao" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b8794c" />
              <stop offset="1" stopColor="#7a4a2c" />
            </linearGradient>
          </defs>
          <rect width="1536" height="1024" fill="url(#ceu)" />
          <path d="M0 560 C220 520 380 540 560 515 S900 470 1100 500 1400 520 1536 505 V640 H0Z" fill="#a98b74" opacity=".55" />
          <path d="M0 610 C300 590 520 600 760 585 S1250 575 1536 590 V1024 H0Z" fill="url(#chao)" />
          <path d="M210 1024 C420 850 700 700 975 602 L995 604 C800 700 640 860 560 1024Z" fill="#c98f5f" opacity=".8" />
          <g transform="translate(960 545)">
            <rect x="0" y="22" width="64" height="38" fill="#f4efe6" />
            <path d="M-8 24 L32 0 L72 24Z" fill="#a4542f" />
            <rect x="26" y="38" width="12" height="22" fill="#5d4636" />
          </g>
        </svg>
      )
    case 'primeiro-plano':
      return (
        <svg className={comum} viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMax slice" role="img" aria-label={rotulo}>
          <g fill="#2a2018" opacity=".92">
            <path d="M0 1024 V760 C60 800 90 700 140 720 C170 640 230 690 250 610 C300 700 330 760 420 820 C470 860 520 930 560 1024Z" />
            <path d="M1536 1024 V700 C1480 760 1440 660 1390 700 C1350 610 1300 660 1270 590 C1230 690 1180 760 1100 830 C1050 880 1000 950 980 1024Z" />
            <path d="M120 1024 L210 560 L222 562 L150 1024Z M1390 1024 L1300 520 L1312 518 L1415 1024Z" />
          </g>
        </svg>
      )
    case 'estrada':
      return (
        <svg className={comum} viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" role="img" aria-label={rotulo}>
          <defs>
            <linearGradient id="ceu2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d6e0e4" />
              <stop offset="1" stopColor="#f0d8b4" />
            </linearGradient>
          </defs>
          <rect width="1536" height="1024" fill="url(#ceu2)" />
          <rect y="470" width="1536" height="554" fill="#a8744d" />
          <path d="M520 1024 L762 470 L774 470 L1016 1024Z" fill="#c4875a" />
          <path d="M766 470 L768 470 L770 1024 L764 1024Z" fill="#e2b48b" opacity=".6" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={1060 + i * 70 - i * i * 6} y={520 - i * 8} width="6" height={140 - i * 18} fill="#5b4332" opacity=".7" />
          ))}
        </svg>
      )
    case 'agente':
      return (
        <div className={`${comum} bg-[radial-gradient(120%_90%_at_30%_40%,#e9c9a4_0%,#b98a63_45%,#5e4635_100%)]`} role="img" aria-label={rotulo} />
      )
    case 'medica':
      return (
        <div className={`${comum} bg-[radial-gradient(110%_90%_at_70%_30%,#f6f7f4_0%,#d9e2de_50%,#9fb3ab_100%)]`} role="img" aria-label={rotulo} />
      )
  }
}
