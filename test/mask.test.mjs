import { test } from 'node:test'
import assert from 'node:assert/strict'
import { maskSecrets } from '../src/mask.mjs'

test('masks every occurrence of several secrets', () => {
  assert.equal(maskSecrets('a pw1 b me@x.fr c pw1', ['pw1', 'me@x.fr']), 'a *** b *** c ***')
})
test('ignores empty and undefined secrets', () => {
  assert.equal(maskSecrets('hello', ['', undefined, null]), 'hello')
})
test('regex-special characters are treated literally', () => {
  assert.equal(maskSecrets('x p.*(a)+[b]$ y pXXa', ['p.*(a)+[b]$']), 'x *** y pXXa')
})
