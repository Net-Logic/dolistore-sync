import test from 'node:test'
import assert from 'node:assert/strict'
import { toHtml } from '../src/markdown.mjs'

test('converts basic markdown', () => {
  const html = toHtml('# Title\n\nSome **bold** text\n\n- one\n- two')
  assert.match(html, /<h1>Title<\/h1>|<h2>Title<\/h2>/)
  assert.match(html, /<strong>bold<\/strong>/)
  assert.match(html, /<li>one<\/li>/)
})

test('raw html in the source is escaped, never executed', () => {
  const html = toHtml('Hello <script>alert(1)</script> world')
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
})

test('javascript: links are neutralised', () => {
  const html = toHtml('[x](javascript:alert(1))')
  assert.doesNotMatch(html, /href="javascript:/i)
})
