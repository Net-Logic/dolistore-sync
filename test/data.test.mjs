import test from 'node:test'
import assert from 'node:assert/strict'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLangFile, loadModuleData } from '../src/data.mjs'

const fixture = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'goodmodule')

test('parses the front matter and the body of a language file', () => {
  const lang = parseLangFile('---\ntitle: T\nshort: S\n---\nBody **x**\n')
  assert.deepEqual(lang, { title: 'T', short: 'S', long: 'Body **x**' })
})

test('a language file without front matter is refused', () => {
  assert.throws(() => parseLangFile('Just text'), /front matter/i)
})

test('loads product.yml, the languages present and the sorted screenshots', () => {
  const data = loadModuleData(fixture)
  assert.equal(data.product.id, 646)
  assert.deepEqual(Object.keys(data.langs), ['en', 'fr'])
  assert.equal(data.langs.fr.title, 'Librairies Prune pour modules Net Logic')
  assert.deepEqual(data.screenshots.map((p) => basename(p)), ['a.png', 'b.png'])
})

test('a module without a dolistore folder gives a clear error', () => {
  assert.throws(() => loadModuleData(join(fixture, 'nothing')), /dolistore/)
})
