const boolean = (value, fallback) => value == null || value === '' ? fallback : value === 'true' || value === '1'

// Only settings consumed by the runtime are exposed here. Next.js handles
// splitting, image formats and CDN compression through next.config.js.
module.exports = {
  LAZY_LOAD_IMAGES: boolean(process.env.NEXT_PUBLIC_LAZY_LOAD_IMAGES, true),
  LAZY_LOAD_THRESHOLD: process.env.NEXT_PUBLIC_LAZY_LOAD_THRESHOLD || '200px',
  ENABLE_GZIP: boolean(process.env.NEXT_PUBLIC_ENABLE_GZIP, true),
  PREFETCH_LINKS: boolean(process.env.NEXT_PUBLIC_PREFETCH_LINKS, true),
  ENABLE_WEB_VITALS: boolean(process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS, true),
  PERFORMANCE_BUDGET: { FCP: 1800, LCP: 2500, INP: 200, CLS: 0.1 }
}
