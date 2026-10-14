import test from 'node:test'
import assert from 'node:assert/strict'
import { CATALOGUE, catalogueLink, pickRelated } from '../src/catalogue.mjs'
import { CATEGORIES, LANGS } from '../src/constants.mjs'

const ids = (entries) => entries.map((e) => e.id)

test('every entry has a numeric id, known categories, and a name and a tagline of at most 90 characters in every language', () => {
  assert.ok(CATALOGUE.length >= 4)
  assert.equal(new Set(ids(CATALOGUE)).size, CATALOGUE.length)
  for (const entry of CATALOGUE) {
    assert.ok(Number.isInteger(entry.id), `${entry.id}`)
    for (const label of entry.categories) {
      assert.ok(Object.hasOwn(CATEGORIES, label), `${entry.id}: ${label}`)
    }
    for (const lang of LANGS) {
      assert.ok(entry.name[lang], `${entry.id} name ${lang}`)
      assert.ok(entry.tagline[lang], `${entry.id} tagline ${lang}`)
      assert.ok([...entry.tagline[lang]].length <= 90, `${entry.id} tagline ${lang} is ${[...entry.tagline[lang]].length} characters`)
    }
  }
})

test('the related modules share a category other than Modules/Plugins, by number of shared categories then catalogue order', () => {
  const product = { id: 1, categories: ['Modules/Plugins', 'Outils systèmes', 'Interfaçage externes'] }
  assert.deepEqual(ids(pickRelated(product)), [647, 1246, 646, 807])
  assert.deepEqual(ids(pickRelated({ ...product, id: 647 })), [1246, 646, 807, 846])
})

test('fewer than 4 sharing modules: filled up with the other entries in catalogue order, never the product itself', () => {
  assert.deepEqual(ids(pickRelated({ id: 792, categories: ['Modules/Plugins', 'Comptabilité', 'CRM - Gestion relation client'] })), [807, 845, 647, 1029])
  assert.deepEqual(ids(pickRelated({ id: 378, categories: ['Modules/Plugins', 'Produits, services ou stocks'] })), [647, 807, 1029, 1246])
  assert.deepEqual(ids(pickRelated({ id: 1, categories: ['Modules/Plugins'] })), [647, 807, 1029, 1246])
  assert.deepEqual(ids(pickRelated({ id: 647, categories: ['Modules/Plugins'] })), [807, 1029, 1246, 792])
  assert.deepEqual(ids(pickRelated({ id: 1, categories: ['Modules/Plugins', 'Projets ou collaboratif'] })), [378, 647, 807, 1029])
})

test('the catalogue holds the publicly active Net-Logic products only', () => {
  assert.deepEqual(ids(CATALOGUE), [647, 807, 1029, 1246, 792, 846, 845, 378, 646])
  for (const hidden of [659, 1512, 3707, 3710]) {
    assert.equal(ids(CATALOGUE).includes(hidden), false, `${hidden}`)
  }
})

test('at most 4 related modules', () => {
  const all = [...new Set(CATALOGUE.flatMap((e) => e.categories))].slice(0, 3)
  assert.ok(pickRelated({ id: 1, categories: all }).length <= 4)
})

test('related in product.yml overrides the choice and the fill-up, in its order; [] shows nothing', () => {
  assert.deepEqual(ids(pickRelated({ id: 1, categories: ['Modules/Plugins'], related: [1029, '647'] })), [1029, 647])
  assert.deepEqual(ids(pickRelated({ id: 1, categories: ['Modules/Plugins', 'Outils systèmes'], related: [] })), [])
})

test('links point to the DoliStore product page in the language', () => {
  assert.equal(catalogueLink(647, 'fr'), 'https://www.dolistore.com/product.php?id=647&l=fr')
})
