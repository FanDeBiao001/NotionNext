const key = 'notionnext:reading:v1'
const validPath = path =>
  typeof path === 'string' &&
  path.length <= 1000 &&
  /^\/(?!\/)/.test(path) &&
  !/[\\\s?#\u0000-\u001f]/.test(path)
export function readLibrary() {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value)
      ? value
          .filter(v => v && validPath(v.path))
          .slice(0, 200)
          .map(v => ({
            path: v.path,
            title:
              typeof v.title === 'string'
                ? v.title.slice(0, 500)
                : '未命名文章',
            saved: v.saved === true,
            progress: Number.isFinite(v.progress)
              ? Math.min(1, Math.max(0, v.progress))
              : 0,
            updatedAt: Number.isFinite(v.updatedAt) ? v.updatedAt : 0
          }))
      : []
  } catch {
    return []
  }
}
export function saveReading(entry) {
  if (!validPath(entry?.path)) return false
  const entries = readLibrary()
  const old = entries.find(item => item.path === entry.path) || {}
  const next = [
    { ...old, ...entry, updatedAt: Date.now() },
    ...entries.filter(item => item.path !== entry.path)
  ].slice(0, 200)
  try {
    localStorage.setItem(key, JSON.stringify(next))
    window.dispatchEvent(new Event('notionnext:reading'))
  } catch {
    return false
  }
  return true
}
export function clearLibrary() {
  try {
    localStorage.removeItem(key)
    window.dispatchEvent(new Event('notionnext:reading'))
    return true
  } catch {
    return false
  }
}
