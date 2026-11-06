export function searchDocuments(documents, query, category = '') {
  const terms = String(query || '')
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10)
  if (!terms.length) return []
  return documents
    .filter(doc => !category || doc.categories.includes(category))
    .map(doc => {
      const title = doc.title.toLocaleLowerCase()
      const text =
        `${doc.title} ${doc.summary} ${doc.tags.join(' ')} ${doc.categories.join(' ')} ${doc.text}`.toLocaleLowerCase()
      if (!terms.every(term => text.includes(term))) return null
      const at = doc.text.toLocaleLowerCase().indexOf(terms[0])
      return {
        ...doc,
        score: terms.reduce(
          (score, term) => score + (title.includes(term) ? 10 : 1),
          0
        ),
        excerpt:
          at < 0
            ? doc.summary
            : `${at > 50 ? '…' : ''}${doc.text.slice(Math.max(0, at - 50), at + 150)}…`
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
}
