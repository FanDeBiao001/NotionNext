export const getServerSideProps = ({ query, res }) => {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  const params = new URLSearchParams()
  for (const key of ['code', 'state', 'error']) if (typeof query[key] === 'string') params.set(key, query[key])
  return Promise.resolve({ redirect: { destination: `/api/auth/callback/notion?${params.toString()}`, permanent: false } })
}
export default function AuthRedirect() { return null }
