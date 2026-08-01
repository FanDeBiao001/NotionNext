import dynamic from 'next/dynamic'

const ParticleNetwork = dynamic(() => import('./ParticleNetwork'), { ssr: false })

export default function HeroBackground() {
  return (
    <>
      <div className='hero-background'>
        <ParticleNetwork />
        <div className='hero-overlay' />
      </div>
      <style jsx>{`
        .hero-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-image: url('/images/hero/noise.png'),
            radial-gradient(circle at center, #172554, #020617 70%);
          z-index: 0;
        }

        .hero-background::after {
          content: '';
          position: absolute;
          width: 350px;
          height: 350px;
          left: 50%;
          top: 65%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(70, 120, 255, 0.35), transparent 70%);
          filter: blur(40px);
          animation: heroPulse 5s ease-in-out infinite;
          pointer-events: none;
        }

        .particle-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(2, 6, 23, 0.2), rgba(2, 6, 23, 0.8));
          pointer-events: none;
        }

        @keyframes heroPulse {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
