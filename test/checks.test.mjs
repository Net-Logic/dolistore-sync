import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import {
  diffCategories, isDryRun, isEditorSynced, makeWriteGuard, maskSelectors, productHrefPattern,
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

const pilotFr = '/home/fred/dolibarr/dolibarr_dolidev/prune-dolistore-pilot/dolistore/fr.md'
test('real pilot fr.md survives CKEditor-style numeric entity encoding', { skip: !existsSync(pilotFr) }, () => {
  const html = toHtml(parseLangFile(readFileSync(pilotFr, 'utf8')).long)
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
