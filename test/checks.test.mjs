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

import { screenshotsMismatch, shouldApplyScreenshots } from '../src/checks.mjs'

test('screenshotsMismatch: identical sequences give null', () => {
  assert.equal(screenshotsMismatch([{ id: '1', hash: 'aa' }, { id: '2', hash: 'bb' }], ['aa', 'bb']), null)
})

test('screenshotsMismatch: different order or length names both sequences abbreviated', () => {
  const h1 = '1234567890abcdef'
  const h2 = 'fedcba0987654321'
  const order = screenshotsMismatch([{ id: '1', hash: h1 }, { id: '2', hash: h2 }], [h2, h1])
  assert.match(order, /\[12345678, fedcba09\].*\[fedcba09, 12345678\]/)
  const len = screenshotsMismatch([{ id: '1', hash: h1 }], [h1, h2])
  assert.match(len, /has 1 \[12345678\].*expected 2 \[12345678, fedcba09\]/)
  assert.ok(!len.includes('1234567890'))
})

test('shouldApplyScreenshots: only a real run with something to do', () => {
  const some = { del: ['1'], add: [] }
  const none = { del: [], add: [] }
  assert.equal(shouldApplyScreenshots({ dryRun: true, plan: some }), false)
  assert.equal(shouldApplyScreenshots({ dryRun: true, plan: none }), false)
  assert.equal(shouldApplyScreenshots({ dryRun: false, plan: some }), true)
  assert.equal(shouldApplyScreenshots({ dryRun: false, plan: none }), false)
})

import { isImageBody } from '../src/checks.mjs'

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)])
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)])
const html = Buffer.from('<!DOCTYPE html><html><body>Login</body></html>')

test('isImageBody: png and jpeg accepted', () => {
  assert.equal(isImageBody('image/png', png), true)
  assert.equal(isImageBody('image/jpeg; charset=x', jpeg), true)
})

test('isImageBody: html with 200, wrong body, wrong type and empty rejected', () => {
  assert.equal(isImageBody('text/html', html), false)
  assert.equal(isImageBody('image/png', html), false)
  assert.equal(isImageBody('text/html', png), false)
  assert.equal(isImageBody('image/png', Buffer.alloc(0)), false)
  assert.equal(isImageBody(undefined, png), false)
})

import { parseProductState } from '../src/checks.mjs'

test('product state from the manage-products row', () => {
  assert.equal(parseProductState('Prix actuel: 180,00 € État: A approuver Fichier: module_x-0.1.0.zip'), 'pending')
  assert.equal(parseProductState('Réf.: c9883 État: Actif Fichier: module_x.zip'), 'active')
  assert.equal(parseProductState('État: Désactivé - Fichier: module_x.zip'), 'disabled')
  assert.equal(parseProductState('État: Désactivé - The module has been deactivated by the developer Fichier: m.zip'), 'disabled')
  assert.equal(parseProductState('no state here'), 'unknown')
})

import { formatStyleLoss, normalizeStyle, styleDiff } from '../src/checks.mjs'

// The first CI dry run on DoliStore (2026-10-14): what the old layout sent and what CKEditor gave back
const realRun = readFileSync(new URL('./fixtures/ckeditor-dolistore-2026-10-14.txt', import.meta.url), 'utf8')
const realGot = realRun.match(/^got instead: (.*)$/m)[1].split(/(?<=\}), /).map((pair) => pair.match(/^(\w+) \{(.*)\}$/))
const realSent = realRun.split('\n').filter((line) => line.startsWith('- ')).map((line) => line.slice(2))

// CKEditor's Advanced Content Filter on DoliStore as seen in that run: styles only on td and table,
// border shorthand split into longhands, colours written as rgb(), <br />, &nbsp; in empty cells.
// The border side longhands and the cellpadding/cellspacing attributes are assumed kept (next dry run).
const KEPT = {
  td: /^(background-color|border(-(top|right|bottom|left))?(-(color|style|width))?|border-radius|vertical-align|width)$/,
  table: /^(border-collapse|width)$/,
}
const rgb = (value) => value.replace(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/gi, (all, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`)
function simulateDoliStoreEditor(html) {
  return html
    .replace(/<(\w+)([^>]*?)\sstyle="([^"]*)"([^>]*)>/g, (all, tag, before, style, after) => {
      const keep = KEPT[tag.toLowerCase()]
      const decls = !keep ? [] : style.split(';').map((d) => d.trim()).filter(Boolean).flatMap((d) => {
        const [prop, value] = d.split(/:(.*)/).map((x) => x.trim())
        if (prop === 'border') {
          const [width, kind, color] = value.split(' ')
          return [`border-color:${color}`, `border-style:${kind}`, `border-width:${width}`]
        }
        return [`${prop}:${value}`]
      }).filter((d) => keep.test(d.split(':')[0]))
      return decls.length ? `<${tag}${before}${after} style="${rgb(decls.reverse().join('; '))};">` : `<${tag}${before}${after}>`
    })
    .replace(/<br>/g, '<br />')
    .replace(/<td([^>]*)><\/td>/g, '<td$1>&nbsp;</td>')
}

test('normalizeStyle: case, spacing, order, rgb() and short hex colours, 0px, border shorthands', () => {
  assert.equal(normalizeStyle('Color: RGB(50, 79, 155);  padding:0px 14px'), normalizeStyle('padding:0 14px; color:#324F9B'))
  assert.equal(normalizeStyle('color: rgba(255, 73, 57, 1)'), 'color:#ff4939')
  assert.equal(normalizeStyle('border:8px solid #FFF'), 'border-color:#ffffff; border-style:solid; border-width:8px')
  assert.equal(normalizeStyle('border-left:6px solid rgb(50, 79, 155)'), normalizeStyle('border-left-color:#324F9B; border-left-style:solid; border-left-width:6px'))
  assert.equal(normalizeStyle('border-left:0px'), 'border-left-width:0')
  assert.equal(normalizeStyle(''), '')
})

test('real DoliStore output: the border shorthand rewrite is harmless, only the stripped declarations remain lost', () => {
  const td = realGot.find(([, tag, style]) => tag === 'td' && style.includes('border-left:0'))
  assert.ok(td)
  // What the old layout sent for that cell, minus the padding the editor stripped
  assert.equal(normalizeStyle(td[2]), normalizeStyle('width:50%; background-color:#F1F5FF; vertical-align:top; border:8px solid #ffffff; border-left:0'))
  const table = realGot.find(([, tag]) => tag === 'table')
  assert.equal(normalizeStyle(table[2]), normalizeStyle('width:100%; border-collapse:separate'))
  // Every h2, strong, ol, ul and a style of the old layout was lost
  for (const tag of ['h2', 'strong', 'ol', 'ul', 'a']) {
    assert.ok(realSent.some((pair) => pair.startsWith(`${tag} {`)), tag)
    assert.ok(!realGot.some(([, got]) => got === tag), tag)
  }
})

test('the old layout through the simulated editor loses what the real run lost', () => {
  const old = '<h2 style="background-color:#324F9B; color:#ffffff; padding:8px 14px">F</h2>\n<table style="width:100%; border-collapse:separate; border-spacing:0"><tbody><tr><td style="width:50%; background-color:#F1F5FF; vertical-align:top; padding:12px 14px; border:8px solid #ffffff; border-left:0"><strong style="color:#324F9B">L</strong><br>t</td></tr></tbody></table>'
  const diff = styleDiff(old, simulateDoliStoreEditor(old))
  assert.deepEqual(diff.missing, [
    'h2 {background-color:#324f9b; color:#ffffff; padding:8px 14px}',
    'table {border-collapse:separate; border-spacing:0; width:100%}',
    'td {background-color:#f1f5ff; border-color:#ffffff; border-left-width:0; border-style:solid; border-width:8px; padding:12px 14px; vertical-align:top; width:50%}',
    'strong {color:#324f9b}',
  ])
  assert.deepEqual(diff.extra, [
    'table {border-collapse:separate; width:100%}',
    'td {background-color:#f1f5ff; border-color:#ffffff; border-left-width:0; border-style:solid; border-width:8px; vertical-align:top; width:50%}',
  ])
})

const sent = [
  '<table cellpadding="10" style="width:100%; border-collapse:collapse">',
  '<tbody>',
  '<tr>',
  '<td style="background-color:#F1F5FF; border-top-color:#ffffff; border-top-style:solid; border-top-width:8px; border-left-color:#324F9B; border-left-style:solid; border-left-width:6px">',
  '<h2>Features</h2>',
  '</td>',
  '</tr>',
  '</tbody>',
  '</table>',
  '<table cellpadding="12" style="width:100%; border-collapse:collapse">',
  '<tbody>',
  '<tr>',
  '<td style="background-color:#F1F5FF; border:8px solid #ffffff; border-left:0; vertical-align:top; width:50%"><strong>Lead</strong><br>text</td>',
  '<td style="border:8px solid #ffffff; border-right:0; vertical-align:top; width:50%"></td>',
  '</tr>',
  '</tbody>',
  '</table>',
].join('\n')

test('styleDiff: the netlogic layout survives the simulated DoliStore editor', () => {
  const got = simulateDoliStoreEditor(sent)
  assert.match(got, /rgb\(241, 245, 255\)/)
  assert.deepEqual(styleDiff(sent, got), { missing: [], extra: [] })
  assert.equal(formatStyleLoss('description_en', styleDiff(sent, got)), null)
  // Also when CKEditor writes the side border as one shorthand and reorders the attributes
  const shorthand = got.replace('border-left-width:6px; border-left-style:solid; border-left-color:rgb(50, 79, 155)', 'border-left: 6px solid rgb(50, 79, 155)')
    .replace('<table cellpadding="10" style="border-collapse:collapse; width:100%;">', '<table style="width: 100%; border-collapse: collapse" cellpadding="10">')
  assert.match(shorthand, /border-left: 6px solid/)
  assert.match(shorthand, /<table style="width: 100%; border-collapse: collapse" cellpadding="10">/)
  assert.deepEqual(styleDiff(sent, shorthand), { missing: [], extra: [] })
})

test('styleDiff: a stripped style or table attribute is listed', () => {
  const stripped = simulateDoliStoreEditor(sent)
    .replace(' cellpadding="12"', '')
    .replace(/<td style="[^"]*rgb\(50, 79, 155\)[^"]*">/, '<td style="background-color: rgb(241, 245, 255);">')
  const diff = styleDiff(sent, stripped)
  assert.deepEqual(diff.missing, [
    'td {background-color:#f1f5ff; border-left-color:#324f9b; border-left-style:solid; border-left-width:6px; border-top-color:#ffffff; border-top-style:solid; border-top-width:8px}',
    'table[cellpadding="12"] {border-collapse:collapse; width:100%}',
  ])
  assert.deepEqual(diff.extra, ['td {background-color:#f1f5ff}', 'table {border-collapse:collapse; width:100%}'])
  const message = formatStyleLoss('description_fr', diff)
  assert.match(message, /description_fr: DoliStore's editor stripped or changed 2 inline styles or table attributes of the layout/)
  assert.match(message, /- table\[cellpadding="12"\] \{border-collapse:collapse; width:100%\}/)
  assert.match(message, /got instead: td \{background-color:#f1f5ff\}/)
})

test('styleDiff: plain HTML without styles has nothing to check', () => {
  assert.deepEqual(styleDiff('<p><strong>x</strong></p>', '<p><b>x</b></p>'), { missing: [], extra: [] })
})
