import subscribeToMailchimpApi from '@/lib/plugins/mailchimp'
import { privateResponse, rateLimit } from '@/lib/server/apiSecurity'

export default async function handler(req, res) {
  privateResponse(res)
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' })
  const { email, firstName = '', lastName = '' } = req.body || {}
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || [firstName, lastName].some(v => typeof v !== 'string' || v.length > 100)) return res.status(400).json({ status: 'error', message: '请输入有效的邮箱和姓名。' })
  if (!await rateLimit(req, res, 'subscribe', 5)) return
  try {
    const response = await subscribeToMailchimpApi({ email: email.trim(), first_name: firstName, last_name: lastName })
    const data = await response.json()
    if (!response.ok && data.title !== 'Member Exists') return res.status(502).json({ status: 'error', message: '订阅服务暂时不可用，请稍后重试。' })
    return res.status(200).json({ status: 'success', message: data.title === 'Member Exists' ? '此邮箱已订阅。' : '请查看邮箱确认订阅。' })
  } catch {
    return res.status(503).json({ status: 'error', message: '订阅服务尚未配置或暂时不可用。' })
  }
}
