import test from 'node:test'
import assert from 'node:assert/strict'
import { toHtml } from '../src/markdown.mjs'

test('converts basic markdown', () => {
  const html = toHtml('# Title\n\nSome **bold** text\n\n- one\n- two')
  assert.match(html, /<h2>Title<\/h2>/)
  assert.doesNotMatch(html, /<h1/)
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

test('headings are clamped to h2..h4', () => {
  const html = toHtml('# One\n\n##### Deep\n\n###### Deeper')
  assert.match(html, /<h2>One<\/h2>/)
  assert.match(html, /<h4>Deep<\/h4>/)
  assert.match(html, /<h4>Deeper<\/h4>/)
  assert.doesNotMatch(html, /<h[156]/)
})

test('image srcs are restricted and only src/alt are emitted', () => {
  const bad = toHtml('![a](javascript:alert(1))')
  assert.doesNotMatch(bad, /javascript:/i)
  assert.match(bad, /<img src="#" alt="a">/)
  const ok = toHtml('![a "q"](https://x.y/i.png "title")')
  assert.match(ok, /<img src="https:\/\/x\.y\/i\.png" alt="a &quot;q&quot;">/)
  assert.doesNotMatch(ok, /title=/)
})

test('raw img with onerror stays escaped', () => {
  const html = toHtml('<img src=x onerror=alert(1)>')
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /&lt;img/)
})

test('protocol-relative links are refused', () => {
  assert.match(toHtml('[x](//evil.com)'), /href="#"/)
  assert.match(toHtml('[x](/ok)'), /href="\/ok"/)
})

test('links emit no title attribute', () => {
  assert.doesNotMatch(toHtml('[x](https://a.b "t")'), /title=/)
})

test('strikethrough emits no del tag', () => {
  const html = toHtml('~~x~~')
  assert.doesNotMatch(html, /<del/)
  assert.match(html, /<p>x<\/p>/)
})
