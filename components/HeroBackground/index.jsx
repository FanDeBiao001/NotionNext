export default function HeroBackground() {
  return (
    <>
      <div className='hero-overlay' />
      <style jsx>{`
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(2, 6, 23, 0.5) 0%, rgba(2, 6, 23, 0.6) 40%, rgba(2, 6, 23, 0.15) 80%, transparent 100%);
          pointer-events: none;
        }
      `}</style>
    </>
  )
}
