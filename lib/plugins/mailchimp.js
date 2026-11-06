import BLOG from '@/blog.config'

/**
 * 订阅邮件-服务端接口
 * @param {*} email
 * @returns
 */
export default function subscribeToMailchimpApi({
  email,
  first_name = '',
  last_name = ''
}) {
  const listId = BLOG.MAILCHIMP_LIST_ID // 替换为你的邮件列表 ID
  const apiKey = BLOG.MAILCHIMP_API_KEY // 替换为你的 API KEY
  if (!email || !listId || !apiKey) {
    throw new Error('Newsletter is not configured')
  }
  const data = {
    email_address: email,
    status: 'pending',
    merge_fields: {
      FNAME: first_name,
      LNAME: last_name
    }
  }
  const server = apiKey.match(/-([a-z]+\d+)$/)?.[1]
  if (!server || !/^[a-zA-Z0-9]+$/.test(listId)) throw new Error('Invalid newsletter configuration')
  return fetch(`https://${server}.api.mailchimp.com/3.0/lists/${listId}/members`, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `apikey ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
}

/**
 * 客户端接口
 * @param {*} email
 * @param {*} firstName
 * @param {*} lastName
 * @returns
 */
export async function subscribeToNewsletter(email, firstName, lastName) {
  const response = await fetch('/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, firstName, lastName })
  })
  const data = await response.json()
  return data
}
