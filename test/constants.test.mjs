import test from 'node:test'
import assert from 'node:assert/strict'
import { DOLIBARR_VERSIONS, CATEGORIES, LANGS, dolibarrNumber } from '../src/constants.mjs'

test('Dolibarr versions map to the select values of the DoliStore form', () => {
  assert.equal(DOLIBARR_VERSIONS.V24, '120')
  assert.equal(DOLIBARR_VERSIONS.V10, '89')
  assert.equal(DOLIBARR_VERSIONS.V9, '109')
  assert.equal(Object.keys(DOLIBARR_VERSIONS).length, 19)
})

test('categories use the exact DoliStore labels', () => {
  assert.equal(CATEGORIES['Modules/Plugins'], '67')
  assert.equal(CATEGORIES['Interfaçage externes'], '74')
  assert.equal(CATEGORIES['Autres'], '80')
  assert.equal(Object.keys(CATEGORIES).length, 21)
})

test('languages and version number helper', () => {
  assert.deepEqual(LANGS, ['en', 'fr', 'de', 'it', 'es'])
  assert.equal(dolibarrNumber('V14'), 14)
})
