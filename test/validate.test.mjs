import test from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../src/validate.mjs'

const good = () => ({
  product: {
    id: 646,
    dolibarr: { min: 'V10', max: 'V24' },
    php: { min: '7.4', max: '8.5' },
    access_days: 365,
    price: '0,00',
    support: 'dolibarr@netlogic.fr',
    categories: ['Modules/Plugins', 'Outils systèmes'],
    keywords: ['prune'],
  },
  langs: { en: { title: 'T', short: 'S', long: 'L' }, fr: { title: 'T', short: 'S', long: 'L' } },
  screenshots: [],
})
const ctx = { version: '2.0.2', zipBytes: 1000 }

test('valid data gives no error', () => {
  assert.deepEqual(validate(good(), ctx), [])
})

test('English is mandatory', () => {
  const d = good(); delete d.langs.en
  assert.match(validate(d, ctx).join('\n'), /en\.md/)
})

test('a language with an empty long description fails', () => {
  const d = good(); d.langs.fr.long = ''
  assert.match(validate(d, ctx).join('\n'), /fr.*long/i)
})

test('more than 3 categories and unknown labels fail', () => {
  const d = good()
  d.product.categories = ['Modules/Plugins', 'Autres', 'Documentation', 'Thèmes']
  assert.match(validate(d, ctx).join('\n'), /3 categories/)
  d.product.categories = ['Interfacage externes']
  assert.match(validate(d, ctx).join('\n'), /Interfacage externes/)
})

test('Dolibarr min greater than max fails', () => {
  const d = good(); d.product.dolibarr = { min: 'V21', max: 'V14' }
  assert.match(validate(d, ctx).join('\n'), /min.*max/i)
})

test('unknown Dolibarr version and bad php version fail', () => {
  const d = good(); d.product.dolibarr = { min: 'V99', max: 'V24' }; d.product.php = { min: '7', max: '8.5' }
  const errors = validate(d, ctx).join('\n')
  assert.match(errors, /V99/)
  assert.match(errors, /php/i)
})

test('bad module version, zip too large and too many screenshots fail', () => {
  const d = good(); d.screenshots = ['1', '2', '3', '4', '5', '6']
  const errors = validate(d, { version: '1.2.3-beta', zipBytes: 81 * 1024 * 1024 }).join('\n')
  assert.match(errors, /1\.2\.3-beta/)
  assert.match(errors, /80 MB/)
  assert.match(errors, /5 screenshots/)
})

test('missing product keys are reported', () => {
  const d = good(); delete d.product.id; delete d.product.support
  const errors = validate(d, ctx).join('\n')
  assert.match(errors, /id/)
  assert.match(errors, /support/)
})

test('a product that is not a mapping gives a single error and does not crash', () => {
  for (const product of ['just a string', ['a', 'list']]) {
    const d = good(); d.product = product
    assert.deepEqual(validate(d, ctx), ['product.yml: must be a mapping of keys'])
  }
})

test('a language entry that is null or whitespace-only fails', () => {
  const d = good(); d.langs.fr = null
  assert.match(validate(d, ctx).join('\n'), /dolistore\/fr\.md: invalid content/)
  const e = good(); e.langs.fr.title = '   \n '
  assert.match(validate(e, ctx).join('\n'), /fr.*title/i)
})

test('dolibarr and php must be mappings with min and max', () => {
  const scalar = good(); scalar.product.dolibarr = 'V10'
  assert.match(validate(scalar, ctx).join('\n'), /"dolibarr" must be a mapping with min and max/)
  const empty = good(); empty.product.dolibarr = {}
  const emptyErrors = validate(empty, ctx).join('\n')
  assert.match(emptyErrors, /"dolibarr\.min" is missing/)
  assert.match(emptyErrors, /"dolibarr\.max" is missing/)
  const onlyMin = good(); onlyMin.product.php = { min: '7.4' }
  assert.match(validate(onlyMin, ctx).join('\n'), /"php\.max" is missing/)
  const phpScalar = good(); phpScalar.product.php = '8.5'
  assert.match(validate(phpScalar, ctx).join('\n'), /"php" must be a mapping with min and max/)
})

test('php min greater than php max fails, compared as numbers', () => {
  const d = good(); d.product.php = { min: '8.5', max: '7.4' }
  assert.match(validate(d, ctx).join('\n'), /php min \(8\.5\) is greater than max \(7\.4\)/)
  const e = good(); e.product.php = { min: '7.10', max: '7.9' }
  assert.match(validate(e, ctx).join('\n'), /is greater than max/)
})

test('categories must be a non-empty list', () => {
  const d = good(); d.product.categories = 'Modules/Plugins'
  assert.match(validate(d, ctx).join('\n'), /"categories" must be a list/)
  const e = good(); e.product.categories = []
  assert.match(validate(e, ctx).join('\n'), /product\.yml: at least one category is required/)
})

test('prototype property names are not accepted as categories or Dolibarr versions', () => {
  const d = good(); d.product.categories = ['toString']
  assert.match(validate(d, ctx).join('\n'), /Unknown category "toString"/)
  const e = good(); e.product.dolibarr = { min: 'constructor', max: 'V24' }
  assert.match(validate(e, ctx).join('\n'), /Unknown Dolibarr version "constructor" for min/)
})

test('the zip size error is a plain message', () => {
  const errors = validate(good(), { version: '2.0.2', zipBytes: 81 * 1024 * 1024 })
  assert.deepEqual(errors, ['The zip is larger than 80 MB (DoliStore limit)'])
})

test('a date-style version is accepted and 1.2.3-beta still fails', () => {
  assert.deepEqual(validate(good(), { version: '2026-09-15', zipBytes: 1000 }), [])
  assert.match(validate(good(), { version: '1.2.3-beta', zipBytes: 1000 }).join('\n'), /1\.2\.3-beta/)
})
