#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')

function verify(backup) {
  const { sha256, ...payload } = backup
  if (
    payload.version !== 1 ||
    !Array.isArray(payload.pages) ||
    !Array.isArray(payload.failures) ||
    !Array.isArray(payload.images)
  )
    throw new Error('Unsupported backup format')
  if (
    createHash('sha256').update(JSON.stringify(payload)).digest('hex') !==
    sha256
  )
    throw new Error('Backup checksum mismatch')
  if (
    payload.pages.some(
      page =>
        !/^[a-f0-9-]{32,36}$/i.test(page.id) ||
        page.password ||
        !page.blockMap?.block
    )
  )
    throw new Error('Invalid or protected page in backup')
  if (payload.failures.length)
    throw new Error(
      `Incomplete backup: ${payload.failures.length} failed pages`
    )
  return payload
}
async function main() {
  const [command, input, output] = process.argv.slice(2)
  if (command === 'backup') {
    const url = new URL('/api/admin/content?action=backup', input)
    if (
      url.protocol !== 'https:' &&
      !['localhost', '127.0.0.1'].includes(url.hostname)
    )
      throw new Error('HTTPS is required')
    if (!process.env.ADMIN_API_TOKEN)
      throw new Error('ADMIN_API_TOKEN is required')
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` },
      redirect: 'error',
      signal: AbortSignal.timeout(300000)
    })
    if (!response.ok) throw new Error(`Backup failed: HTTP ${response.status}`)
    const backup = await response.json()
    fs.writeFileSync(
      output || 'notionnext-backup.json',
      JSON.stringify(backup, null, 2),
      { mode: 0o600 }
    )
    verify(backup)
    console.log(
      `Backup saved: ${backup.pages.length} pages, ${backup.images.length} image URLs`
    )
  } else if (command === 'verify' || command === 'restore') {
    const data = verify(JSON.parse(fs.readFileSync(input, 'utf8')))
    if (command === 'restore') {
      if (!output || fs.existsSync(output))
        throw new Error('Provide a new, empty destination directory')
      fs.mkdirSync(output, { recursive: true })
      for (const page of data.pages)
        fs.writeFileSync(
          path.join(output, `${page.id}.json`),
          JSON.stringify(page, null, 2),
          { mode: 0o600 }
        )
      fs.writeFileSync(
        path.join(output, 'images.json'),
        JSON.stringify(data.images, null, 2)
      )
    }
    console.log(
      `Verified ${data.pages.length} pages${command === 'restore' ? `; restored to ${output}` : ''}`
    )
  } else {
    throw new Error(
      'Usage: content-ops.js backup <site-url> <file> | verify <file> | restore <file> <new-directory>'
    )
  }
}
if (require.main === module)
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
module.exports = { verify }
