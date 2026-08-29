import { Client } from '@notionhq/client'
import { createHash } from 'node:crypto'
import {
  formatNotionComment,
  getPlainText,
  isPublicComment,
  PUBLIC_COMMENT_STATUS,
  validateCommentPayload
} from '@/lib/plugins/notionComments'

const databaseId = process.env.NOTION_COMMENT_DATABASE_ID
const token = process.env.NOTION_TOKEN
const requireApproval = process.env.NOTION_COMMENT_REQUIRE_APPROVAL === 'true'
const rateWindowMs = 60 * 1000
const rateLimit = Number(process.env.NOTION_COMMENT_RATE_LIMIT || 5)
const ipHits = new Map()

const getErrorDetail = error =>
  (typeof error?.body === 'string' ? error.body : '') ||
  error?.body?.message ||
  error?.body?.error ||
  (error?.body ? JSON.stringify(error.body) : '') ||
  error?.message ||
  String(error)

const getErrorStatus = error =>
  error?.status ||
  error?.statusCode ||
  error?.response?.status ||
  error?.body?.status ||
  500

const getErrorHint = error => {
  if (error?.code === 'EMAIL_FIELD_MISSING') {
    return '请在评论数据库中添加 Author(email) 或 EmailHash(rich_text) 字段。'
  }
  const status = error?.status || error?.statusCode || error?.response?.status
  if (status === 401 || status === 403) {
    return '检查 NOTION_TOKEN 是否正确，以及评论数据库是否已共享给对应 integration。'
  }
  if (status === 404) {
    return '检查 NOTION_COMMENT_DATABASE_ID 是否正确，且该数据库已经共享给 integration。'
  }
  if (status === 400) {
    return '检查评论数据库字段名称和类型，尤其是 PostId、Content、Nickname、Level。'
  }
  if (status === 429) {
    return 'Notion API 触发了频率限制，稍后重试。'
  }
  return ''
}

const replyWithError = (res, { error, message }) => {
  const status = getErrorStatus(error)
  return res.status(status).json({
    status,
    error: message,
    detail: getErrorDetail(error),
    hint: getErrorHint(error),
    details: error?.details || null,
    body: error?.body || null
  })
}

const getClient = () => {
  if (!databaseId || !token) {
    throw new Error('Missing NOTION_COMMENT_DATABASE_ID or NOTION_TOKEN')
  }
  return new Client({ auth: token })
}

const getClientIp = req => {
  const forwardedFor = req.headers['x-forwarded-for']
  return String(
    Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || ''
  )
    .split(',')[0]
    .trim()
}

const isRateLimited = ip => {
  const now = Date.now()
  const hits = (ipHits.get(ip) || []).filter(time => now - time < rateWindowMs)
  if (hits.length >= rateLimit) {
    ipHits.set(ip, hits)
    return true
  }
  hits.push(now)
  ipHits.set(ip, hits)
  return false
}

const hasProperty = (properties, name, type) =>
  properties[name] && (!type || properties[name].type === type)

const getDatabaseProperties = async notion => {
  const database = await notion.databases.retrieve({ database_id: databaseId })
  return database.properties || {}
}

export const validateCommentDatabaseSchema = properties => {
  const requiredTypes = {
    PostId: 'title',
    Content: 'rich_text',
    Nickname: 'rich_text',
    Level: 'number'
  }
  const optionalTypes = {
    ParentId: 'rich_text',
    IpAddress: 'rich_text'
  }

  const mismatches = [
    ...Object.entries(requiredTypes)
      .filter(([name, type]) => {
        const prop = properties?.[name]
        return !prop || prop.type !== type
      })
      .map(([name, type]) => {
        const actual = properties?.[name]?.type || 'missing'
        return `${name} should be ${type}, got ${actual}`
      }),
    ...Object.entries(optionalTypes)
      .filter(([name, type]) => {
        const prop = properties?.[name]
        return prop && prop.type !== type
      })
      .map(([name, type]) => {
        const actual = properties?.[name]?.type || 'missing'
        return `${name} should be ${type}, got ${actual}`
      })
  ]

  if (mismatches.length > 0) {
    const error = new Error(
      `Comment database schema mismatch: ${mismatches.join('; ')}`
    )
    error.statusCode = 400
    error.code = 'SCHEMA_MISMATCH'
    error.details = {
      expectedTypes,
      actualTypes: Object.fromEntries(
        Object.entries(properties || {}).map(([name, prop]) => [
          name,
          prop?.type || 'missing'
        ])
      ),
      mismatches
    }
    throw error
  }
}

export const validateCommentEmailStorageSchema = properties => {
  const canStoreEmail =
    hasProperty(properties, 'Author', 'email') ||
    hasProperty(properties, 'EmailHash', 'rich_text')

  if (!canStoreEmail) {
    const error = new Error(
      'Comment database needs Author(email) or EmailHash(rich_text) to store the submitted email'
    )
    error.statusCode = 400
    error.code = 'EMAIL_FIELD_MISSING'
    error.details = {
      requiredTypes: {
        Author: 'email',
        EmailHash: 'rich_text'
      }
    }
    throw error
  }
}

export const buildEmailProperties = (properties, author) => {
  const emailProperties = {}
  const hasAuthorField = hasProperty(properties, 'Author', 'email')
  const hasEmailHashField = hasProperty(properties, 'EmailHash', 'rich_text')

  if (hasAuthorField) {
    emailProperties.Author = { email: author }
  }

  if (hasEmailHashField) {
    emailProperties.EmailHash = {
      rich_text: [
        {
          text: {
            content: hasAuthorField ? hashEmail(author) : author
          }
        }
      ]
    }
  }

  return emailProperties
}

const hashEmail = email =>
  createHash('sha256').update(email).digest('hex').slice(0, 32)

const fetchComments = async postId => {
  const notion = getClient()
  const properties = await getDatabaseProperties(notion)
  validateCommentDatabaseSchema(properties)
  const comments = []
  let startCursor

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: startCursor,
      page_size: 100,
      filter: {
        property: 'PostId',
        title: { equals: postId }
      },
      sorts: [{ timestamp: 'created_time', direction: 'ascending' }]
    })
    comments.push(
      ...response.results
        .filter(page => 'properties' in page)
        .map(formatNotionComment)
        .filter(isPublicComment)
    )
    startCursor = response.has_more ? response.next_cursor : undefined
  } while (startCursor)

  return comments
}

const getParentLevel = async (notion, parentId, postId) => {
  if (!parentId) return 0
  const parent = await notion.pages.retrieve({ page_id: parentId })
  if (
    !('properties' in parent) ||
    getPlainText(parent.properties.PostId) !== postId
  ) {
    throw new Error('Invalid parent comment')
  }
  return parent.properties.Level?.type === 'number'
    ? parent.properties.Level.number || 1
    : 1
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const postId = String(req.query.postId || '').trim()
    if (!postId) {
      return res.status(400).json({ error: 'Missing postId' })
    }
    try {
      return res.status(200).json(await fetchComments(postId))
    } catch (error) {
      return replyWithError(res, {
        error,
        message: 'Failed to fetch comments'
      })
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const validation = validateCommentPayload(req.body)
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error })
  }

  try {
    const notion = getClient()
    if (validation.spam) {
      return res.status(200).json({ ok: true })
    }

    const ip = getClientIp(req) || 'unknown'
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many comments' })
    }

    const properties = await getDatabaseProperties(notion)
    validateCommentDatabaseSchema(properties)
    validateCommentEmailStorageSchema(properties)
    const { postId, content, author, nickname, parentId, website } =
      validation.value
    const level = (await getParentLevel(notion, parentId, postId)) + 1
    const status = requireApproval ? 'Pending' : PUBLIC_COMMENT_STATUS
    const pageProperties = {
      PostId: { title: [{ text: { content: postId } }] },
      ParentId: {
        rich_text: parentId ? [{ text: { content: parentId } }] : []
      },
      Content: { rich_text: [{ text: { content } }] },
      Level: { number: level },
      IpAddress: {
        rich_text: [{ text: { content: ip } }]
      }
    }

    if (hasProperty(properties, 'Nickname', 'rich_text')) {
      pageProperties.Nickname = {
        rich_text: [{ text: { content: nickname || author || 'anonymous' } }]
      }
    }
    if (author) {
      Object.assign(pageProperties, buildEmailProperties(properties, author))
    }
    if (website && hasProperty(properties, 'Website', 'url')) {
      pageProperties.Website = { url: website }
    }
    if (hasProperty(properties, 'Status', 'select')) {
      pageProperties.Status = { select: { name: status } }
    }
    if (hasProperty(properties, 'CreatedAt', 'date')) {
      pageProperties.CreatedAt = { date: { start: new Date().toISOString() } }
    }
    if (hasProperty(properties, 'UserAgent', 'rich_text')) {
      pageProperties.UserAgent = {
        rich_text: [
          { text: { content: String(req.headers['user-agent'] || '') } }
        ]
      }
    }

    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: pageProperties
    })

    return res.status(200).json({
      comment: formatNotionComment(response),
      pending: requireApproval
    })
  } catch (error) {
    return replyWithError(res, {
      error,
      message: 'Failed to create comment'
    })
  }
}
