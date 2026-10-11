import { decode } from 'he'

// Pure helpers, unit-tested: no browser needed

export const SUBMITTED_PREFIX = 'The form WAS submitted — check DoliStore by hand before re-running (do not re-run blindly)'

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

export const screenshotMaskSelector = 'header, #header, .header, nav'
