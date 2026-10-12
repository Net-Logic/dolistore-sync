import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFormValues } from '../src/form.mjs'

const data = {
  product: {
    id: 646,
    dolibarr: { min: 'V10', max: 'V24' },
    php: { min: '7.4', max: '8.5' },
    access_days: 365,
    price: '0,00',
    support: 'dolibarr@netlogic.fr',
    categories: ['Modules/Plugins', 'Outils systèmes'],
    keywords: ['prune', 'autoload'],
  },
  langs: { en: { title: 'T', short: 'S', long: 'Some **bold**' } },
  screenshots: [],
}

test('maps the data to the real field names of the DoliStore form', () => {
  const v = buildFormValues(data, '2026-09-15')
  assert.equal(v.text.version, '2026.09.15')
  assert.equal(v.text.name_en, 'T')
  assert.equal(v.text.short_description_en, 'S')
  assert.match(v.text.description_en, /<strong>bold<\/strong>/)
  assert.equal(v.text.phpmin, '7.4')
  assert.equal(v.text.phpmax, '8.5')
  assert.equal(v.text.validityduration, '365')
  assert.equal('sale_price' in v.text, false)
  assert.equal(v.text.contact_support, 'dolibarr@netlogic.fr')
  assert.equal(v.text.keywords, 'prune, autoload')
  assert.deepEqual(v.selects, { version_min: '89', version_max: '120' })
  assert.deepEqual(v.categories, ['67', '79'])
})

test('languages without a file are not touched', () => {
  const v = buildFormValues(data, '1.0.0')
  assert.equal('name_fr' in v.text, false)
  assert.equal('description_de' in v.text, false)
})

test('never produces a status key (the status is never changed)', () => {
  const v = buildFormValues(data, '1.0.0')
  for (const part of [v, v.text, v.selects]) {
    assert.equal(Object.keys(part).includes('status'), false)
  }
})

import { buildCreateValues } from '../src/form.mjs'

test('create values: price with a dot, explicit booleans, core inclusion off by default', () => {
  const v = buildCreateValues({ product: { create: { price: 180, status: 'submitted', accept_terms: true, accept_wiki_notice: true } } })
  assert.deepEqual(v, { price: '180.00', status: 'submitted', acceptTerms: true, wikiNotice: true, coreInclude: false })
})
