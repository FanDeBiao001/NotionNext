import { buildCommentTree, countReplies } from '@/lib/plugins/notionComments'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const ROOT_PAGE_SIZE = 10
const REPLY_PAGE_SIZE = 2

const formatTime = value => {
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  if (Number.isNaN(diff)) return ''
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / 3600000)} 小时前`
  }
  return date.toLocaleDateString()
}

const getInitial = name => (name || '?').trim().slice(0, 1).toUpperCase()

const readErrorDetail = async response => {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json()
      return {
        detail: data?.detail || '',
        hint: data?.hint || '',
        error: data?.error || ''
      }
    } catch {
      return { detail: '', hint: '', error: '' }
    }
  }

  try {
    return { detail: (await response.text()).trim(), hint: '', error: '' }
  } catch {
    return { detail: '', hint: '', error: '' }
  }
}

const getRequestErrorMessage = async (response, fallback) => {
  const payload = await readErrorDetail(response)
  const internalMessage = [payload.error, payload.detail, payload.hint]
    .filter(Boolean)
    .join(' ')

  if (/invalid author email/i.test(internalMessage)) {
    return '请输入有效的邮箱地址。'
  }

  if (response.status === 429) return '操作过于频繁，请稍后再试。'
  if (response.status === 400) return '提交信息有误，请检查后重试。'
  return fallback
}

const NotionComments = ({ postId }) => {
  const [comments, setComments] = useState([])
  const [content, setContent] = useState('')
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [website, setWebsite] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [rememberProfile, setRememberProfile] = useState(true)
  const [replyTo, setReplyTo] = useState('')
  const [expandedReplies, setExpandedReplies] = useState({})
  const [visibleReplyCounts, setVisibleReplyCounts] = useState({})
  const [visibleRootCount, setVisibleRootCount] = useState(ROOT_PAGE_SIZE)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const contentRef = useRef(null)

  const loadComments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        `/api/notion-comments?postId=${encodeURIComponent(postId)}`
      )
      if (!response.ok) {
        throw new Error(
          await getRequestErrorMessage(response, '评论加载失败，请稍后重试。')
        )
      }
      setComments(await response.json())
    } catch {
      setError('评论加载失败，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (!postId) return
    void loadComments()
  }, [loadComments, postId])

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('notion-comment-profile'))
      if (profile?.email) setEmail(profile.email)
      if (profile?.nickname) setNickname(profile.nickname)
      if (profile?.website) setWebsite(profile.website)
    } catch {
      // A malformed browser cache should never block commenting.
    }
  }, [])

  const commentTree = useMemo(() => buildCommentTree(comments), [comments])
  const visibleRoots = commentTree.slice(0, visibleRootCount)
  const replyTarget = comments.find(comment => comment.id === replyTo)

  const submitComment = async event => {
    event.preventDefault()
    if (!content.trim() || !nickname.trim() || !email.trim() || submitting) {
      return
    }

    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/notion-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content,
          author: email,
          nickname,
          parentId: replyTo,
          website,
          honeypot
        })
      })
      if (!response.ok) {
        throw new Error(
          await getRequestErrorMessage(response, '评论提交失败，请稍后重试。')
        )
      }
      const result = await response.json()
      setContent('')
      setReplyTo('')
      if (rememberProfile) {
        localStorage.setItem(
          'notion-comment-profile',
          JSON.stringify({ email, nickname, website })
        )
      } else {
        localStorage.removeItem('notion-comment-profile')
      }
      setNotice(
        result.pending ? '评论已提交，审核通过后显示。' : '评论已发布。'
      )
      if (replyTo) {
        setExpandedReplies(current => ({ ...current, [replyTo]: true }))
      }
      await loadComments()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : '评论提交失败，请稍后重试。'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const startReply = comment => {
    setReplyTo(comment.id)
    setExpandedReplies(current => ({ ...current, [comment.id]: true }))
    setVisibleReplyCounts(current => ({
      ...current,
      [comment.id]: current[comment.id] || REPLY_PAGE_SIZE
    }))
    contentRef.current?.focus()
  }

  const toggleReplies = commentId => {
    setExpandedReplies(current => ({
      ...current,
      [commentId]: !current[commentId]
    }))
    setVisibleReplyCounts(current => ({
      ...current,
      [commentId]: current[commentId] || REPLY_PAGE_SIZE
    }))
  }

  const showMoreReplies = commentId => {
    setVisibleReplyCounts(current => ({
      ...current,
      [commentId]: (current[commentId] || REPLY_PAGE_SIZE) + REPLY_PAGE_SIZE
    }))
  }

  const renderComment = (comment, level = 0) => {
    const replies = comment.children || []
    const hasReplies = replies.length > 0
    const repliesOpen = expandedReplies[comment.id] || level > 0
    const replyCount = countReplies(comment)
    const visibleReplyCount = visibleReplyCounts[comment.id] || REPLY_PAGE_SIZE
    const visibleReplies =
      level === 0 ? replies.slice(0, visibleReplyCount) : replies

    return (
      <article
        key={comment.id}
        className={`flex gap-3 border-gray-200 py-4 dark:border-gray-700 ${
          level === 0 ? 'border-b' : 'border-l pl-3 sm:pl-4'
        }`}
      >
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white dark:bg-gray-100 dark:text-gray-900'>
          {getInitial(comment.author)}
        </div>
        <div className='min-w-0 flex-1'>
          <header className='flex flex-wrap items-center gap-2 text-sm'>
            <span className='font-medium text-gray-900 dark:text-gray-100'>
              {comment.author}
            </span>
            <time className='text-gray-500 dark:text-gray-400'>
              {formatTime(comment.createdTime)}
            </time>
          </header>

          <p className='mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-800 dark:text-gray-200'>
            {comment.content}
          </p>

          <div className='mt-2 flex flex-wrap items-center gap-3 text-sm'>
            <button
              type='button'
              className='text-blue-600 hover:underline dark:text-blue-400'
              onClick={() => startReply(comment)}
            >
              回复
            </button>

            {hasReplies && level === 0 && (
              <button
                type='button'
                className='text-gray-600 hover:underline dark:text-gray-300'
                onClick={() => toggleReplies(comment.id)}
              >
                {repliesOpen ? '收起回复' : `查看 ${replyCount} 条回复`}
              </button>
            )}
          </div>

          {hasReplies && repliesOpen && (
            <div className='mt-3 space-y-1'>
              {visibleReplies.map(child => renderComment(child, level + 1))}
              {level === 0 && visibleReplyCount < replies.length && (
                <button
                  type='button'
                  className='ml-12 text-sm text-gray-600 hover:underline dark:text-gray-300'
                  onClick={() => showMoreReplies(comment.id)}
                >
                  展开更多回复
                </button>
              )}
            </div>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className='space-y-12'>
      <section>
        <h3 className='mb-8 text-2xl font-semibold text-gray-900 dark:text-gray-100'>
          {comments.length} 条评论
        </h3>
        {loading ? (
          <div className='space-y-3'>
            {[0, 1, 2].map(item => (
              <div
                key={item}
                className='h-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800'
              />
            ))}
          </div>
        ) : visibleRoots.length ? (
          <>
            <div>{visibleRoots.map(comment => renderComment(comment))}</div>
            {visibleRootCount < commentTree.length && (
              <button
                type='button'
                className='mt-4 w-full rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                onClick={() =>
                  setVisibleRootCount(count => count + ROOT_PAGE_SIZE)
                }
              >
                加载更多评论
              </button>
            )}
          </>
        ) : (
          <p className='border-y border-dashed border-gray-300 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400'>
            还没有评论，来写第一条吧。
          </p>
        )}
      </section>

      <section className='pt-10'>
        <h3 className='text-2xl font-semibold text-gray-900 dark:text-gray-100'>
          {replyTarget ? `回复 @${replyTarget.author}` : '发表回复'}
        </h3>
        <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
          邮箱地址不会公开。显示名称、邮箱和评论内容为必填项。
        </p>
        {replyTarget && (
          <button
            type='button'
            className='mt-3 text-sm text-gray-600 underline dark:text-gray-300'
            onClick={() => setReplyTo('')}
          >
            取消回复
          </button>
        )}
        <form
          className='mt-7 space-y-5'
          onSubmit={event => void submitComment(event)}
        >
          <label className='block text-sm font-medium text-gray-800 dark:text-gray-200'>
            评论 <span aria-hidden='true'>*</span>
            <textarea
              ref={contentRef}
              className='mt-3 min-h-48 w-full rounded-none border border-gray-300 bg-gray-50 p-4 text-base outline-none focus:border-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-gray-300'
              maxLength={2000}
              onChange={event => setContent(event.target.value)}
              placeholder={replyTarget ? '写下回复...' : '写下你的评论...'}
              required
              rows={8}
              value={content}
            />
          </label>
          <input
            aria-hidden='true'
            autoComplete='off'
            className='hidden'
            onChange={event => setHoneypot(event.target.value)}
            tabIndex={-1}
            value={honeypot}
          />
          <div className='grid gap-5 sm:grid-cols-2'>
            <label className='block text-sm font-medium text-gray-800 dark:text-gray-200'>
              显示名称 <span aria-hidden='true'>*</span>
              <input
                className='mt-3 w-full rounded-none border border-gray-300 bg-gray-50 p-3 text-base outline-none focus:border-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-gray-300'
                maxLength={40}
                onChange={event => setNickname(event.target.value)}
                required
                value={nickname}
              />
            </label>
            <label className='block text-sm font-medium text-gray-800 dark:text-gray-200'>
              邮箱 <span aria-hidden='true'>*</span>
              <input
                className='mt-3 w-full rounded-none border border-gray-300 bg-gray-50 p-3 text-base outline-none focus:border-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-gray-300'
                maxLength={254}
                onChange={event => setEmail(event.target.value)}
                required
                type='email'
                value={email}
              />
            </label>
          </div>
          <label className='block text-sm font-medium text-gray-800 dark:text-gray-200'>
            网站（可选）
            <input
              className='mt-3 w-full rounded-none border border-gray-300 bg-gray-50 p-3 text-base outline-none focus:border-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-gray-300'
              maxLength={200}
              onChange={event => setWebsite(event.target.value)}
              placeholder='https://example.com'
              type='url'
              value={website}
            />
          </label>
          <label className='flex cursor-pointer items-center gap-3 text-sm text-gray-600 dark:text-gray-300'>
            <input
              checked={rememberProfile}
              className='h-4 w-4'
              onChange={event => setRememberProfile(event.target.checked)}
              type='checkbox'
            />
            在此浏览器中保存我的显示名称、邮箱地址和网站地址，以便下次评论时使用。
          </label>
          <div className='flex justify-end'>
            <button
              type='submit'
              className='rounded-full bg-slate-900 px-8 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:hover:bg-slate-700'
              disabled={submitting}
            >
              {submitting ? '提交中...' : replyTarget ? '发表回复' : '发表评论'}
            </button>
          </div>
        </form>
      </section>

      {notice && (
        <div className='border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200'>
          {notice}
        </div>
      )}
      {error && (
        <div className='flex items-center justify-between gap-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200'>
          <span>{error}</span>
          <button
            type='button'
            className='underline'
            onClick={() => void loadComments()}
          >
            重试
          </button>
        </div>
      )}
    </div>
  )
}

export default NotionComments
