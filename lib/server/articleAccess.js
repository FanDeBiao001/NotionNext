import { createHmac, createHash, randomBytes } from 'node:crypto'
import { safeEqual } from './apiSecurity'
import md5 from 'js-md5'

const developmentSecret = randomBytes(32).toString('hex')
const secret = () =>
  process.env.ARTICLE_SESSION_SECRET ||
  process.env.REVALIDATION_TOKEN ||
  (process.env.NODE_ENV !== 'production' ? developmentSecret : '')
export const articleCookieName = id =>
  `nn_article_${createHash('sha256').update(id).digest('hex').slice(0, 16)}`
export const matchesPassword = (post, value) =>
  typeof value === 'string' &&
  value.length <= 1024 &&
  (safeEqual(
    createHash('sha256').update(value).digest('hex'),
    String(post.password).toLowerCase()
  ) ||
    safeEqual(
      md5(String(post.slug || '') + value),
      String(post.password).toLowerCase()
    ))
const signature = (post, expires) =>
  createHmac('sha256', secret())
    .update(`${post.id}:${post.password}:${expires}`)
    .digest('hex')
export function articleSession(post) {
  if (!secret()) return null
  const expires = Date.now() + 86400000
  return `${expires}.${signature(post, expires)}`
}
export function validArticleSession(post, token) {
  if (!secret() || typeof token !== 'string') return false
  const [expires, sig] = token.split('.')
  return (
    Number(expires) > Date.now() &&
    Number(expires) <= Date.now() + 86400000 &&
    safeEqual(sig || '', signature(post, expires))
  )
}
