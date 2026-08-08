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
          background:
            url('/images/hero/noise.png'),
            linear-gradient(180deg, #0f1d3a 0%, #020617 100%);
          z-index: 0;
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
      `}</style>
    </>
  )
}
