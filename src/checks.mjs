import { decode } from 'he'

// Pure helpers, unit-tested: no browser needed

export const SUBMITTED_PREFIX = 'The form WAS submitted — check DoliStore by hand before re-running (do not re-run blindly)'

export const REFUSED_PREFIX = 'DoliStore refused the submission (the product is normally left unchanged, check it on DoliStore before re-running)'

// Message for an error box shown by DoliStore's package validator: the full reasons, whitespace collapsed
export function formatRefusal(text) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!clean) {
    return `${REFUSED_PREFIX}: no detail given`
  }
  return `${REFUSED_PREFIX}: ${clean.length > 3000 ? `${clean.slice(0, 3000)}...` : clean}`
}

// The validator's reasons sit in the page text but not always in a matched CSS element:
// take the body text from "There are N errors" up to the form that follows
export function extractRefusal(bodyText) {
  const text = String(bodyText ?? '')
  const start = text.search(/There (?:is|are) \d+ errors?|Il y a \d+ erreurs?/i)
  if (start === -1) {
    return ''
  }
  const rest = text.slice(start)
  const cut = rest.search(/Before submitting a module|Avant de soumettre/i)
  return (cut === -1 ? rest.slice(0, 2500) : rest.slice(0, cut)).trim()
}

// Dry run is the default: only an explicit --submit does a real run (--dry-run wins if both are given)
export function isDryRun(values) {
  return !values.submit || Boolean(values['dry-run'])
}

// Route handler for a dry run: reads go through, every write is aborted and recorded
// (method and URL without query string or body, which may hold secrets)
export function makeWriteGuard(aborted) {
  return (route) => {
    const request = route.request()
    const method = request.method()
    if (method === 'GET' || method === 'HEAD') {
      return route.continue()
    }
    aborted.push({ method, url: request.url().split(/[?#]/)[0] })
    return route.abort()
  }
}

export async function installReadOnlyGuard(page) {
  const aborted = []
  await page.route('**/*', makeWriteGuard(aborted))
  return aborted
}

// Anchored id: 646 must not match 6460
export function productHrefPattern(id) {
  return `edit-module-product\\.php\\?id=${String(id).replace(/\D/g, '')}(?!\\d)`
}

export function diffCategories(actual, wanted) {
  const a = new Set(actual)
  const w = new Set(wanted)
  return {
    missing: [...w].filter((x) => !a.has(x)),
    extra: [...a].filter((x) => !w.has(x)),
  }
}

// Tags first, then entities (so a literal &lt;b&gt; stays text), then whitespace (U+00A0 included)
export function plainText(html) {
  return decode(String(html).replace(/<[^>]*>/g, '')).replace(/[\s\u00a0]+/g, '')
}

// CKEditor reformats the HTML, so compare the text only
export function isEditorSynced(expectedHtml, gotHtml) {
  const got = plainText(gotHtml ?? '')
  return got.length > 0 && got === plainText(expectedHtml)
}

// CSS selectors masked in every screenshot: credentials-like inputs, the header/nav, and any input
// carrying the login e-mail. contact_support is a public e-mail shown on the product: never masked.
// (The text containing the e-mail is masked in browser.mjs with getByText.)
export function maskSelectors(email) {
  const selectors = [
    'input[type="password"]',
    'input[type="email"]:not([name="contact_support"])',
    'input[autocomplete="username"]',
    'input[name*="mail" i]:not([name="contact_support"])',
    'input[name*="login" i]',
    'header, #header, .header, nav',
  ]
  if (email) {
    const escaped = String(email).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    selectors.push(`input[value="${escaped}"]`)
  }
  return selectors
}

// Confirmed on the real login page (2026-10-11); the registration form on the same page has
// ambiguous email/passwd fields, so always scope to #login_form
export const LOGIN_SELECTORS = {
  email: '#login_form #emaillogin',
  password: '#login_form #passwdlogin',
  submit: '#login_form #SubmitLogin',
}

export const FORM_FIELDS = ['sale_price', 'validityduration', 'phpmin', 'phpmax', 'version']

// Compares the form fields read just before the click (before) and after re-opening the edit page (after).
// The price is compared raw (no normalisation) and must be identical. Returns a list of problems.
export function compareSubmitted({ before, after, sent }) {
  const problems = []
  if (after.sale_price !== before.sale_price) {
    problems.push(`PRICE CHANGED BY THE SUBMISSION (before: ${before.sale_price}, after: ${after.sale_price}): fix it by hand on DoliStore NOW`)
  }
  for (const name of ['version', 'phpmin', 'phpmax', 'validityduration']) {
    if (after[name] !== sent[name]) {
      problems.push(`${name} on DoliStore is "${after[name]}", expected "${sent[name]}"`)
    }
  }
  return problems
}

const abbreviate = (hashes) => hashes.map((h) => String(h).slice(0, 8)).join(', ')

// null when the page holds exactly the wanted hash sequence, else a message naming both (8 hex chars each)
export function screenshotsMismatch(current, desiredHashes) {
  const got = current.map((c) => c.hash)
  if (got.length === desiredHashes.length && got.every((h, i) => h === desiredHashes[i])) {
    return null
  }
  return `DoliStore has ${got.length} [${abbreviate(got)}], expected ${desiredHashes.length} [${abbreviate(desiredHashes)}]`
}

// The only gate to applyScreenshotPlan: a dry run never writes
export function shouldApplyScreenshots({ dryRun, plan }) {
  return !dryRun && plan.del.length + plan.add.length > 0
}

// True only for a real png/jpeg/gif/webp: right content-type AND matching magic bytes
// (a login redirect or an HTML error page served with HTTP 200 must never be hashed as an image)
export function isImageBody(contentType, buf) {
  if (!String(contentType ?? '').trim().toLowerCase().startsWith('image/') || !buf || buf.length < 12) {
    return false
  }
  const at = (offset, bytes) => bytes.every((b, i) => buf[offset + i] === b)
  const ascii = (offset, text) => at(offset, [...text].map((ch) => ch.charCodeAt(0)))
  return at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    || at(0, [0xff, 0xd8, 0xff])
    || ascii(0, 'GIF87a') || ascii(0, 'GIF89a')
    || (ascii(0, 'RIFF') && ascii(8, 'WEBP'))
}

// State of a product as shown in the "État :" line of its row in manage-products.php
// (the edit form shows a product waiting for approval with the "Désactivé" radio checked: submitting it would withdraw the request)
export function parseProductState(rowText) {
  const text = String(rowText ?? '').replace(/\s+/g, ' ')
  const match = text.match(/(?:État|Etat|State|Status)\s*:\s*(.*?)(?:\s+-\s|\s+Fichier|\s+File|$)/i)
  const label = (match ? match[1] : '').trim().toLowerCase()
  if (/^(a|à) approuver/.test(label) || /^(to approve|waiting)/.test(label)) {
    return 'pending'
  }
  if (/^(actif|active|enabled)/.test(label)) {
    return 'active'
  }
  if (/^(désactivé|desactive|deactivated|disabled)/.test(label)) {
    return 'disabled'
  }
  return 'unknown'
}

const hex2 = (n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0')

const BORDER_WIDTH = /^(?:0|\d*\.?\d+(?:px|em|rem|pt)|thin|medium|thick)$/
const BORDER_STYLE = /^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/

// CKEditor writes "border:8px solid #fff" as border-width/border-style/border-color and may do the same
// for one side: expand every border shorthand so both forms compare equal
function expandBorder(prop, value) {
  const match = prop.match(/^border(-(?:top|right|bottom|left))?$/)
  if (!match) {
    return [`${prop}:${value}`]
  }
  const side = match[1] || ''
  return value.split(' ').map((token) => {
    if (BORDER_WIDTH.test(token)) {
      return `border${side}-width:${token}`
    }
    return BORDER_STYLE.test(token) ? `border${side}-style:${token}` : `border${side}-color:${token}`
  })
}

// One CSS declaration list in a comparable form: lower case, single spaces, colours as #rrggbb,
// 0px as 0, border shorthands expanded, declarations sorted (CKEditor reorders and respaces them,
// writes rgb() colours and splits the border shorthand)
export function normalizeStyle(style) {
  return String(style ?? '')
    .split(';')
    .flatMap((decl) => {
      const at = decl.indexOf(':')
      if (at === -1) {
        return []
      }
      const prop = decl.slice(0, at).trim().toLowerCase()
      const value = decl.slice(at + 1).trim().toLowerCase()
        .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*1(?:\.0*)?\s*)?\)/g, (all, r, g, b) => `#${hex2(r)}${hex2(g)}${hex2(b)}`)
        .replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/g, '#$1$1$2$2$3$3')
        .replace(/(^|[\s(,])0px\b/g, '$10')
        .replace(/\s+/g, ' ')
      return prop && value ? expandBorder(prop, value) : []
    })
    .sort()
    .join('; ')
}

// Table attributes the layout uses for spacing (CKEditor's table dialog exposes them): checked like styles
const CHECKED_ATTRIBUTES = ['border', 'cellpadding', 'cellspacing']

const attribute = (attrs, name) => {
  const match = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'))
  return match ? decode(match[1] ?? match[2] ?? match[3]).trim().toLowerCase() : null
}

// tag[attributes] {normalised style} of every element carrying a style or a checked attribute, in document order
function styledTags(html) {
  const pairs = []
  for (const match of String(html ?? '').matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const attrs = CHECKED_ATTRIBUTES.map((name) => [name, attribute(match[2], name)]).filter(([, value]) => value !== null)
    const style = normalizeStyle(attribute(match[2], 'style') ?? '')
    if (style || attrs.length > 0) {
      pairs.push(`${match[1].toLowerCase()}${attrs.map(([name, value]) => `[${name}="${value}"]`).join('')} {${style}}`)
    }
  }
  return pairs
}

// Styles and table attributes of the sent HTML that the editor's HTML no longer holds (missing), and the
// styled elements of the editor's HTML that match nothing sent (extra, shown as context). Text is checked elsewhere.
export function styleDiff(expectedHtml, gotHtml) {
  const got = styledTags(gotHtml)
  const missing = []
  for (const pair of styledTags(expectedHtml)) {
    const at = got.indexOf(pair)
    if (at === -1) {
      missing.push(pair)
    } else {
      got.splice(at, 1)
    }
  }
  return { missing, extra: missing.length > 0 ? got : [] }
}

// null when nothing is lost, else a message listing every stripped or changed style or attribute
export function formatStyleLoss(name, diff) {
  if (diff.missing.length === 0) {
    return null
  }
  const lines = [`${name}: DoliStore's editor stripped or changed ${diff.missing.length} inline styles or table attributes of the layout:`]
  lines.push(...diff.missing.map((pair) => `- ${pair}`))
  if (diff.extra.length > 0) {
    lines.push(`got instead: ${diff.extra.join(', ')}`)
  }
  return lines.join('\n')
}
