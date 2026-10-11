import test from 'node:test'
import assert from 'node:assert/strict'
import {
  diffCategories, isDryRun, isEditorSynced, makeWriteGuard, productHrefPattern,
} from '../src/checks.mjs'

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
