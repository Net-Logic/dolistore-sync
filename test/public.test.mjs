import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadModuleData } from '../src/data.mjs'
import { loadLayoutContext } from '../src/layout/module.mjs'
import { renderLayout } from '../src/layout/render.mjs'
import { checkPublicPage, extractFullDescription, publicPageUrl, publicPageWarnings } from '../src/public.mjs'

// Product 792 (relancefactureglobale 1.5.3): what dolistore-sync v0.4.1 sent, and the description
// block of the live public page the same day (the server dropped cellpadding/cellspacing and tbody,
// sorted the declarations and lowered the colours)
const sent041 = readFileSync(new URL('./fixtures/dolistore-sent-792-en-v0.4.1.html', import.meta.url), 'utf8')
const public792 = readFileSync(new URL('./fixtures/dolistore-public-792-en-2026-10-14.html', import.meta.url), 'utf8')
const page = (description) => `<html><body><div id="page"><div class="rte fulldescription">${description}</div><div class="footer">x</div></div></body></html>`

const fixtureDir = fileURLToPath(new URL('./fixtures/layoutmodule/', import.meta.url))
const sentNow = () => {
  const data = loadModuleData(fixtureDir)
  const context = loadLayoutContext(fixtureDir, readFileSync(new URL('./fixtures/layoutmodule/core/modules/modLayoutDemo.class.php', import.meta.url), 'utf8'))
  return renderLayout({ lang: 'fr', text: data.langs.fr, product: data.product, context })
}

// What DoliStore's server keeps, as seen on the live page: no table attribute, no tbody,
// declarations sorted, colours lower case
function simulateServer(html) {
  return html
    .replace(/<table\b[^>]*?(\sstyle="[^"]*")[^>]*>/g, '<table$1>')
    .replace(/<\/?tbody>\n?/g, '')
    .replace(/style="([^"]*)"/g, (all, style) => `style="${style.split(';').map((d) => d.trim()).filter(Boolean).sort().join('; ').toLowerCase()}"`)
}

test('public page url: product, language and a cache buster', () => {
  assert.equal(publicPageUrl(792, 'fr', 1700000000000), 'https://www.dolistore.com/product.php?id=792&l=fr&nc=1700000000000')
})

test('extractFullDescription takes the whole description block, nested divs included', () => {
  assert.equal(extractFullDescription(page('<p>a</p><div><div>b</div></div><p>c</p>')), '<p>a</p><div><div>b</div></div><p>c</p>')
  assert.ok(extractFullDescription(public792).includes('<h2>Features</h2>'))
  assert.equal(extractFullDescription('<html><body>404</body></html>'), null)
})

test('real live page of 792: the server stripped only the cellpadding/cellspacing table attributes of v0.4.1', () => {
  const warnings = publicPageWarnings('description_en', sent041, public792)
  assert.equal(warnings.length, 1)
  const lines = warnings[0].split('\n')
  assert.match(lines[0], /^description_en: the public page lost 7 inline styles or attributes that were sent \(stripped by DoliStore's server\):$/)
  assert.deepEqual(lines.slice(1), [
    '- table[cellpadding="10"][cellspacing="0"] {border-collapse:collapse; width:100%} (x5)',
    '- table[cellpadding="12"][cellspacing="0"] {border-collapse:collapse; width:100%} (x2)',
    'found instead: table {border-collapse:collapse; width:100%}',
  ])
})

test('the current layout matches its public page once the server rewrites it', () => {
  const html = sentNow()
  const served = simulateServer(html)
  assert.doesNotMatch(served, /<tbody>|cellpadding/)
  assert.match(served, /<td style="background-color:#f1f5ff; border-bottom-color:#f1f5ff; border-bottom-style:solid; border-bottom-width:12px;/)
  assert.deepEqual(publicPageWarnings('description_fr', html, page(served)), [])
})

test('a page without description, a style the server dropped and a failed fetch are warnings, never errors', async () => {
  const html = sentNow()
  const pages = {
    fr: page(simulateServer(html).replace(/; border-left-color:#324f9b; border-left-style:solid; border-left-width:6px/g, '')),
    de: '<html>This module or version is no more available</html>',
  }
  const asked = []
  const warnings = await checkPublicPage({
    id: 792,
    now: 1,
    text: { name_fr: 'x', description_fr: html, description_de: html, description_it: html },
    fetchPage: async (url) => {
      asked.push(url)
      const lang = new URL(url).searchParams.get('l')
      if (!pages[lang]) {
        throw new Error('HTTP 503')
      }
      return pages[lang]
    },
  })
  assert.deepEqual(asked, [publicPageUrl(792, 'fr', 1), publicPageUrl(792, 'de', 1), publicPageUrl(792, 'it', 1)])
  assert.equal(warnings.length, 3)
  assert.match(warnings[0], /^description_fr: the public page lost 5 inline styles/)
  assert.match(warnings[0], /border-left-color:#324f9b; border-left-style:solid; border-left-width:6px; .*\} \(x5\)\n/)
  assert.match(warnings[1], /^description_de: no description found on the public page/)
  assert.equal(warnings[2], 'description_it: could not read the public page (HTTP 503)')
})
