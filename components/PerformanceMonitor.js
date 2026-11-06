import { useEffect } from 'react'
import { siteConfig } from '@/lib/config'

export default function PerformanceMonitor() {
  const enabled = siteConfig('ENABLE_WEB_VITALS', true)
  useEffect(() => {
    if (!enabled) return
    let active = true
    const report = ({ name, value, id, rating }) => {
      if (!active) return
      const metric = { name, value, id, rating }
      window.dispatchEvent(new CustomEvent('notionnext:web-vital', { detail: metric }))
      if (typeof window.gtag === 'function') window.gtag('event', name, { value: Math.round(name === 'CLS' ? value * 1000 : value), metric_id: id, metric_value: value, metric_rating: rating, non_interaction: true })
      if (process.env.NODE_ENV === 'development') console.debug('[Performance]', metric)
    }
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      if (active) [onCLS, onINP, onFCP, onLCP, onTTFB].forEach(register => register(report))
    }).catch(() => {})
    return () => { active = false }
  }, [enabled])
  return null
}
