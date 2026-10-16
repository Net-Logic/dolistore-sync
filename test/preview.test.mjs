import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { asServed, previewPage, runPreview } from '../src/preview.mjs'

const bin = fileURLToPath(new URL('../bin/dolistore-sync.mjs', import.meta.url))
const fixtures = fileURLToPath(new URL('./fixtures', import.meta.url))
// No credentials in the child environment: the preview never reaches the network
const env = { ...process.env, DOLISTORE_LOGIN: '', DOLISTORE_PASSWORD: '' }

test('the preview page wraps the description in a DoliStore-like div.rte.fulldescription, texts escaped', () => {
  const html = previewPage({ lang: 'en', title: 'A <b> - x', short: 'S & co', description: '<p>desc</p>', product: { dolibarr: { min: 'V20', max: 'V24' }, php: { min: '7.4', max: '8.5' } }, version: '1.2.3' })
  assert.match(html, /^<!doctype html>/i)
  assert.match(html, /<html lang="en">/)
  assert.match(html, /<div class="rte fulldescription">\n<p>desc<\/p>\n<\/div>/)
  assert.match(html, /\.fulldescription \{[^}]*width: 870px/)
  assert.match(html, /A &lt;b&gt; - x/)
  assert.match(html, /S &amp; co/)
  assert.doesNotMatch(html, /<script|https?:\/\/(?!www\.dolistore\.com)/)
})

test('runPreview writes one file per language present, with the generated layout', () => {
  const out = mkdtempSync(join(tmpdir(), 'dolistore-preview-'))
  const result = runPreview({ moduleDir: join(fixtures, 'layoutmodule'), descriptor: 'core/modules/modLayoutDemo.class.php', outDir: out })
  assert.deepEqual(result.files.map((f) => f.split('/').pop()), ['en.html', 'fr.html'])
  const en = readFileSync(join(out, 'en.html'), 'utf8')
  assert.match(en, /border-left-color:#324F9B/)
  assert.match(en, /Required Dolibarr modules: Invoices/)
  assert.ok(!existsSync(join(out, 'de.html')))
  // The banner is the local image, embedded: the preview opens offline and holds no jsDelivr URL
  const png = readFileSync(new URL('../assets/netlogic-banner.png', import.meta.url)).toString('base64')
  for (const lang of ['en', 'fr']) {
    const html = readFileSync(join(out, `${lang}.html`), 'utf8')
    assert.ok(html.includes(`<a href="https://www.netlogic.fr"><img src="data:image/png;base64,${png}" alt="Net Logic - Dolibarr Preferred Partner" width="675" height="130"></a>`), lang)
    assert.doesNotMatch(html, /jsdelivr/)
  }
})

test('runPreview refuses invalid data like a real run, and writes nothing', () => {
  const moduleDir = mkdtempSync(join(tmpdir(), 'dolistore-preview-module-'))
  mkdirSync(join(moduleDir, 'dolistore'))
  cpSync(join(fixtures, 'goodmodule', 'dolistore', 'en.md'), join(moduleDir, 'dolistore', 'en.md'))
  writeFileSync(join(moduleDir, 'dolistore', 'product.yml'), `${readFileSync(join(fixtures, 'goodmodule', 'dolistore', 'product.yml'), 'utf8')}layout: fancy\n`)
  writeFileSync(join(moduleDir, 'modX.class.php'), "<?php\n\t$this->version = '1.0.0';\n")
  const out = join(moduleDir, 'out')
  assert.throws(() => runPreview({ moduleDir, descriptor: 'modX.class.php', outDir: out }), /Invalid dolistore data:[\s\S]*"layout" must be one of netlogic/)
  assert.ok(!existsSync(out))
})

test('cli --preview needs no zip and no login, and writes the files', () => {
  const out = mkdtempSync(join(tmpdir(), 'dolistore-preview-'))
  const r = spawnSync('node', [bin, '--module', join(fixtures, 'goodmodule'), '--descriptor', 'core/modules/modGood.class.php', '--preview', out], { encoding: 'utf8', env })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /Preview written/)
  assert.match(readFileSync(join(out, 'en.html'), 'utf8'), /<p>Set of <strong>libraries<\/strong> used by the other Net Logic modules\.<\/p>/)
  assert.ok(existsSync(join(out, 'fr.html')))
})

test('cli --preview still needs --module and --descriptor', () => {
  const r = spawnSync('node', [bin, '--preview', tmpdir()], { encoding: 'utf8', env })
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Missing --module/)
})

test('the preview drops the table attributes like DoliStore\'s server', () => {
  assert.equal(asServed('<table cellpadding="12" cellspacing="0" style="width:100%" border="1"><tr><td>x</td></tr></table><table border="0">'), '<table style="width:100%"><tr><td>x</td></tr></table><table>')
  const html = previewPage({ lang: 'en', title: 'T', short: 'S', description: '<table cellpadding="10" style="width:100%"><tr><td>x</td></tr></table>', product: {}, version: '1' })
  assert.match(html, /<table style="width:100%"><tr>/)
  assert.doesNotMatch(html, /cellpadding/)
})
