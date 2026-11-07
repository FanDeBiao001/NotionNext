const KEY = 'notionnext:search-history:v1'
const MAX_HISTORY = 6

export function readSearchHistory() {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || '[]')
    return Array.isArray(value)
      ? value
          .filter(
            item =>
              typeof item === 'string' && item.trim() && item.length <= 200
          )
          .slice(0, MAX_HISTORY)
      : []
  } catch {
    return []
  }
}

export function saveSearchHistory(value) {
  const term = typeof value === 'string' ? value.trim().slice(0, 200) : ''
  if (!term) return readSearchHistory()
  const history = [
    term,
    ...readSearchHistory().filter(
      item => item.toLocaleLowerCase() !== term.toLocaleLowerCase()
    )
  ].slice(0, MAX_HISTORY)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(history))
  } catch {}
  return history
}

export function clearSearchHistory() {
  try {
    window.localStorage.removeItem(KEY)
    return true
  } catch {
    return false
  }
}
