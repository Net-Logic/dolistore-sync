import { styleDiff } from './checks.mjs'

const BASE = 'https://www.dolistore.com'

// Public product page, with a cache buster
export function publicPageUrl(id, lang, now = Date.now()) {
  return `${BASE}/product.php?id=${encodeURIComponent(id)}&l=${encodeURIComponent(lang)}&nc=${now}`
}

// Inner HTML of <div class="rte fulldescription"> (nested divs counted), or null when the page has none
export function extractFullDescription(pageHtml) {
  const html = String(pageHtml ?? '')
  const open = html.match(/<div\b[^>]*\bclass\s*=\s*["'][^"']*\bfulldescription\b[^"']*["'][^>]*>/i)
  if (!open) {
    return null
  }
  const start = open.index + open[0].length
  let depth = 1
  for (const tag of html.slice(start).matchAll(/<div\b[^>]*>|<\/div\s*>/gi)) {
    depth += tag[0][1] === '/' ? -1 : 1
    if (depth === 0) {
      return html.slice(start, start + tag.index)
    }
  }
  return null
}

// Warning lines for one language: what the public page lost compared with the HTML sent (styles and
// table attributes, same normalisation as the editor check), or [] when they match
export function publicPageWarnings(name, sentHtml, pageHtml) {
  const description = extractFullDescription(pageHtml)
  if (description === null) {
    return [`${name}: no description found on the public page (product not public yet, or the page changed)`]
  }
  const diff = styleDiff(sentHtml, description)
  if (diff.missing.length === 0) {
    return []
  }
  const counts = new Map()
  for (const pair of diff.missing) {
    counts.set(pair, (counts.get(pair) ?? 0) + 1)
  }
  const lines = [`${name}: the public page lost ${diff.missing.length} inline styles or table attributes that were sent (stripped by DoliStore's server):`]
  lines.push(...[...counts].map(([pair, count]) => `- ${pair}${count > 1 ? ` (x${count})` : ''}`))
  if (diff.extra.length > 0) {
    lines.push(`found instead: ${[...new Set(diff.extra)].join(', ')}`)
  }
  return [lines.join('\n')]
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.text()
}

// After a real submit only: anonymous GET of the public page of every language sent. Never throws:
// the product is already submitted, problems come back as warnings for the job log.
export async function checkPublicPage({ id, text, fetchPage = fetchText, now = Date.now() }) {
  const warnings = []
  for (const [field, html] of Object.entries(text)) {
    const lang = field.match(/^description_(\w+)$/)?.[1]
    if (!lang) {
      continue
    }
    try {
      warnings.push(...publicPageWarnings(field, html, await fetchPage(publicPageUrl(id, lang, now))))
    } catch (error) {
      warnings.push(`${field}: could not read the public page (${error.message})`)
    }
  }
  return warnings
}
