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
