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
