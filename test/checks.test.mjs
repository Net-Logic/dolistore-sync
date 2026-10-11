import test from 'node:test'
import { maskSecrets } from '../src/mask.mjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import {
  LOGIN_SELECTORS, REFUSED_PREFIX, compareSubmitted, diffCategories, extractRefusal, formatRefusal, isDryRun, isEditorSynced, makeWriteGuard, maskSelectors, productHrefPattern,
} from '../src/checks.mjs'
import { parseLangFile } from '../src/data.mjs'
import { toHtml } from '../src/markdown.mjs'

const fakeRoute = (method, url) => {
  const calls = []
  return {
    calls,
    request: () => ({ method: () => method, url: () => url }),
    continue: () => { calls.push('continue') },
    abort: () => { calls.push('abort') },
  }
}

test('write guard: GET and HEAD continue', () => {
  const aborted = []
  const guard = makeWriteGuard(aborted)
  const get = fakeRoute('GET', 'https://x/a?b=1')
  const head = fakeRoute('HEAD', 'https://x/a')
  guard(get); guard(head)
  assert.deepEqual(get.calls, ['continue'])
  assert.deepEqual(head.calls, ['continue'])
  assert.deepEqual(aborted, [])
})

test('write guard: POST is aborted and recorded without the query string', () => {
  const aborted = []
  const guard = makeWriteGuard(aborted)
  const post = fakeRoute('POST', 'https://x/edit.php?token=secret#f')
  guard(post)
  assert.deepEqual(post.calls, ['abort'])
  assert.deepEqual(aborted, [{ method: 'POST', url: 'https://x/edit.php' }])
})

test('dry run unless --submit is given; --dry-run alias still accepted and wins', () => {
  assert.equal(isDryRun({}), true)
  assert.equal(isDryRun({ 'dry-run': true }), true)
  assert.equal(isDryRun({ submit: true }), false)
  assert.equal(isDryRun({ submit: true, 'dry-run': true }), true)
})

test('product href pattern is anchored: 646 does not match 6460', () => {
  const re = new RegExp(productHrefPattern(646))
  assert.equal(re.test('edit-module-product.php?id=646'), true)
  assert.equal(re.test('edit-module-product.php?id=646&x=1'), true)
  assert.equal(re.test('edit-module-product.php?id=6460'), false)
})

test('category diff names missing and extra ids', () => {
  assert.deepEqual(diffCategories(['1', '2'], ['2', '3']), { missing: ['3'], extra: ['1'] })
  assert.deepEqual(diffCategories(['2'], ['2']), { missing: [], extra: [] })
})

test('editor sync compares text, ignores markup, refuses empty', () => {
  assert.equal(isEditorSynced('<p>Hello <strong>a&amp;b</strong></p>', '<p>Hello&nbsp;<b>a&amp;b</b></p>\n'), true)
  assert.equal(isEditorSynced('<p>Hello</p>', ''), false)
  assert.equal(isEditorSynced('<p>Hello</p>', '<p>Other</p>'), false)
})

test('editor sync decodes the entities CKEditor 4 emits', () => {
  assert.equal(isEditorSynced('<p>café</p>', '<p>caf&eacute;</p>'), true)
  assert.equal(isEditorSynced('<p>l’été</p>', '<p>l&rsquo;&eacute;t&eacute;</p>'), true)
  assert.equal(isEditorSynced('<p>a b</p>', '<p>a&#160;b</p>'), true)
  assert.equal(isEditorSynced('<p>a&nbsp;b</p>', '<p>a b</p>'), true)
})

test('editor sync still detects a real mismatch or an empty editor', () => {
  assert.equal(isEditorSynced('<p>abc</p>', '<p>abd</p>'), false)
  assert.equal(isEditorSynced('<p>abc</p>', ''), false)
  assert.equal(isEditorSynced('<p>abc</p>', '<p></p>'), false)
})

test('editor sync never interprets escaped markup as a tag', () => {
  assert.equal(isEditorSynced('<p>&lt;script&gt;</p>', '<p>&lt;script&gt;</p>'), true)
  assert.equal(isEditorSynced('<p>&lt;b&gt;x</p>', '<p>x</p>'), false)
})

const sampleFr = fileURLToPath(new URL('./fixtures/goodmodule/dolistore/fr.md', import.meta.url))
test('a French long description survives CKEditor-style numeric entity encoding', () => {
  const html = toHtml(parseLangFile(readFileSync(sampleFr, 'utf8')).long)
  const encoded = html.replace(/[^\x00-\x7f]/gu, (c) => `&#${c.codePointAt(0)};`)
  assert.notEqual(encoded, html, 'fixture should contain non-ASCII text')
  assert.equal(isEditorSynced(html, encoded), true)
})

test('mask selectors cover credential inputs but never a bare input', () => {
  const list = maskSelectors('me@example.com')
  assert.equal(list.includes('input'), false)
  assert.ok(list.includes('input[type="password"]'))
  assert.ok(list.some((s) => s.startsWith('input[type="email"]')))
  assert.ok(list.some((s) => s.startsWith('input[name*="login" i]')))
  assert.ok(list.some((s) => s.startsWith('input[name*="mail" i]')))
  assert.ok(list.includes('input[autocomplete="username"]'))
})

test('mask selectors exclude contact_support from the e-mail-like ones', () => {
  const list = maskSelectors('me@example.com')
  assert.ok(list.filter((s) => /mail|email/.test(s)).every((s) => s.includes(':not([name="contact_support"])')))
})

test('mask value selector escapes quotes and backslashes in the e-mail', () => {
  const list = maskSelectors('a"b\\c@x.fr')
  assert.ok(list.includes('input[value="a\\"b\\\\c@x.fr"]'))
})

test('mask value selector is omitted without an e-mail', () => {
  for (const email of [undefined, '']) {
    assert.equal(maskSelectors(email).some((s) => s.startsWith('input[value=')), false)
  }
})

test('login selectors are the ones confirmed on the real page, scoped to #login_form', () => {
  assert.deepEqual(LOGIN_SELECTORS, {
    email: '#login_form #emaillogin',
    password: '#login_form #passwdlogin',
    submit: '#login_form #SubmitLogin',
  })
})

test('the masks cover the real login fields (name=email, type=password)', () => {
  const list = maskSelectors('me@example.com')
  assert.ok(list.includes('input[type="password"]'))
  assert.ok(list.includes('input[name*="mail" i]:not([name="contact_support"])'))
})

test('refusal message keeps the full reasons, collapsed and truncated', () => {
  assert.equal(formatRefusal('There are 1 error\n\n  1. Your   zip file does not respect rules'), `${REFUSED_PREFIX}: There are 1 error 1. Your zip file does not respect rules`)
  const long = formatRefusal('x'.repeat(5000))
  assert.equal(long, `${REFUSED_PREFIX}: ${'x'.repeat(3000)}...`)
})

test('refusal message with no text is generic', () => {
  assert.equal(formatRefusal('  \n '), `${REFUSED_PREFIX}: no detail given`)
  assert.equal(formatRefusal(undefined), `${REFUSED_PREFIX}: no detail given`)
})

test('a secret inside a refusal text is still masked', () => {
  const masked = maskSecrets(formatRefusal('file me@x.fr is bad, pw1'), ['pw1', 'me@x.fr'])
  assert.equal(masked.includes('pw1') || masked.includes('me@x.fr'), false)
  assert.match(masked, /^DoliStore refused the submission/)
})

const reasons = `1. The call of your module class should not be done with DOL_DOCUMENT_ROOT, the file "X.php" of module "m" is wrong, you must correct the line below with "dol_include_once": require_once DOL_DOCUMENT_ROOT.'/custom/m/lib/x.php';

Your zip file does not respect Dolibarr package rules. See Dolibarr wiki developer documentation
If you think this is an error or don't understand this message, send your package by email at dolistore@dolibarr.org`
const page = (head, marker) => `Menu\nHome\n${head}\n${reasons}\n${marker}\nPRODUCT: x`

test('extractRefusal gets the numbered reasons (English page)', () => {
  const out = extractRefusal(page('There are 1 error', 'Before submitting a module, make sure it complies with validation rules'))
  assert.ok(out.startsWith('There are 1 error'))
  assert.ok(out.includes('dol_include_once'))
  assert.ok(out.includes('dolistore@dolibarr.org'))
  assert.equal(out.includes('Before submitting'), false)
  assert.equal(out.includes('Menu'), false)
})

test('extractRefusal gets the reasons on the French page', () => {
  const out = extractRefusal(page('Il y a 2 erreurs', 'Avant de soumettre un module, vérifiez les règles'))
  assert.ok(out.startsWith('Il y a 2 erreurs'))
  assert.ok(out.includes('dol_include_once'))
  assert.equal(out.includes('Avant de soumettre'), false)
})

test('extractRefusal returns an empty string without an error', () => {
  assert.equal(extractRefusal('Menu\nBefore submitting a module, make sure\nPRODUCT: x'), '')
  assert.equal(extractRefusal(undefined), '')
})

test('extractRefusal is limited to 2500 characters when there is no cut marker', () => {
  const out = extractRefusal(`There is 1 error\n${'y'.repeat(6000)}`)
  assert.equal(out.length, 2500)
})

const fields = (o = {}) => ({ sale_price: '365,00', validityduration: '365', phpmin: '7.4', phpmax: '8.5', version: '1.2.3', ...o })

test('compareSubmitted: unchanged price and matching values give no problem', () => {
  assert.deepEqual(compareSubmitted({ before: fields(), after: fields(), sent: fields() }), [])
})

test('compareSubmitted: a changed price is flagged loudly with both values', () => {
  const p = compareSubmitted({ before: fields(), after: fields({ sale_price: '36500,00' }), sent: fields() })
  assert.equal(p.length, 1)
  assert.match(p[0], /^PRICE CHANGED BY THE SUBMISSION \(before: 365,00, after: 36500,00\): fix it by hand on DoliStore NOW/)
})

test('compareSubmitted: price comma or space differences are not normalised', () => {
  assert.equal(compareSubmitted({ before: fields(), after: fields({ sale_price: '365.00' }), sent: fields() }).length, 1)
  assert.equal(compareSubmitted({ before: fields(), after: fields({ sale_price: '365, 00' }), sent: fields() }).length, 1)
})

test('compareSubmitted: version, php and duration mismatches are flagged', () => {
  const p = compareSubmitted({ before: fields(), after: fields({ version: '1.2.2', phpmax: '8.4' }), sent: fields() })
  assert.equal(p.length, 2)
  assert.match(p.join('\n'), /version on DoliStore is "1\.2\.2", expected "1\.2\.3"/)
})
