import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadModuleData } from '../src/data.mjs'
import { validate } from '../src/validate.mjs'
import { LAYOUTS } from '../src/layout/checks.mjs'

const fixture = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'layoutmodule')
const ctx = { version: '1.2.3', zipBytes: 1000 }
const data = () => loadModuleData(fixture)
const errorsOf = (d) => validate(d, ctx).join('\n')

const swapBody = (d, lang, from, to) => {
  d.langs[lang].long = d.langs[lang].long.replace(from, to)
  return d
}

test('the layout fixture is valid', () => {
  assert.deepEqual(LAYOUTS, ['netlogic'])
  assert.deepEqual(validate(data(), ctx), [])
})

test('an unknown layout value is a validation error', () => {
  const d = data(); d.product.layout = 'fancy'
  assert.match(errorsOf(d), /"layout" must be one of netlogic, got "fancy"/)
})

test('check 1: every language has the same number of features and the same How it works', () => {
  const d = swapBody(data(), 'fr', /- \*\*Troisième[^\n]*\n/, '')
  assert.match(errorsOf(d), /same number of features \(en: 3, fr: 2\)/)
  const e = swapBody(data(), 'fr', /## Fonctionnement[\s\S]*$/, '')
  assert.match(errorsOf(e), /How it works: present in en, missing in fr/)
  const f = swapBody(data(), 'fr', '3. Envoyez.', '')
  assert.match(errorsOf(f), /same number of How it works steps \(en: 3, fr: 2\)/)
})

test('check 2: the body starts with the intro, the module name in bold; every language is reported at once', () => {
  const d = data()
  swapBody(d, 'en', '**Layout Demo**', 'Layout Demo')
  swapBody(d, 'fr', '**Démo mise en page**', '**Demo**')
  const errors = errorsOf(d)
  assert.match(errors, /dolistore\/en\.md: the first intro paragraph must contain the module name in bold \(\*\*Layout Demo\*\*\)/)
  assert.match(errors, /dolistore\/fr\.md: the first intro paragraph must contain the module name in bold \(\*\*Démo mise en page\*\*\)/)
  // Case and accents do not matter
  const ok = swapBody(data(), 'fr', '**Démo mise en page**', '**DEMO MISE EN PAGE**')
  assert.deepEqual(validate(ok, ctx), [])
  const noIntro = swapBody(data(), 'en', /^[\s\S]*?## Features/, '## Features')
  assert.match(errorsOf(noIntro), /dolistore\/en\.md: the body must start with an intro paragraph/)
})

test('check 3: the Features heading is present and every bullet has a bold lead-in', () => {
  const d = swapBody(data(), 'en', '## Features', '## Highlights')
  assert.match(errorsOf(d), /dolistore\/en\.md: the Features section is missing/)
  const e = swapBody(data(), 'fr', '**Deuxième fonctionnalité** : ', '')
  assert.match(errorsOf(e), /dolistore\/fr\.md: feature 2 must start with a bold lead-in/)
})

test('check 4: no hand-written Requirements, Installation or Support section', () => {
  const d = data()
  d.langs.en.long += '\n\n## Installation\n\nDeploy it.\n'
  d.langs.fr.long += '\n\n## Support\n\nPar e-mail.\n'
  const errors = errorsOf(d)
  assert.match(errors, /dolistore\/en\.md: remove the hand-written "Installation" section/)
  assert.match(errors, /dolistore\/fr\.md: remove the hand-written "Support" section/)
})

test('check 5: no Dolibarr or PHP version in the body, start or needs', () => {
  for (const mention of ['V20', 'v24', 'Dolibarr 20', 'Dolibarr >= 21', 'PHP 7.4', 'php 8']) {
    const d = swapBody(data(), 'en', 'the first text.', `works with ${mention}.`)
    assert.match(errorsOf(d), new RegExp(`dolistore/en\\.md: remove the version mention "${mention.replace(/[.>=]/g, '\\$&')}"`), mention)
  }
  const needs = data(); needs.langs.fr.needs = ['PHP 8.1 minimum']
  assert.match(errorsOf(needs), /dolistore\/fr\.md: remove the version mention "PHP 8\.1"/)
  const fine = swapBody(data(), 'en', 'the first text.', 'protected by reCAPTCHA v3 in 2 clicks.')
  assert.deepEqual(validate(fine, ctx), [])
})

test('check 6: short at most 125 characters, only when the layout is on', () => {
  const d = data(); d.langs.fr.short = 'é'.repeat(126)
  assert.match(errorsOf(d), /dolistore\/fr\.md: the short description has 126 characters, at most 125/)
  const ok = data(); ok.langs.fr.short = 'é'.repeat(125)
  assert.deepEqual(validate(ok, ctx), [])
  const off = data(); delete off.product.layout; off.langs.fr.short = 'x'.repeat(200)
  assert.deepEqual(validate(off, ctx), [])
})

test('start is one line, needs is a list of lines', () => {
  const d = data(); d.langs.en.start = 'one\ntwo'; d.langs.fr.needs = 'not a list'
  const errors = errorsOf(d)
  assert.match(errors, /dolistore\/en\.md: "start" must be one line/)
  assert.match(errors, /dolistore\/fr\.md: "needs" must be a list of lines/)
  const e = data(); e.langs.fr.needs = ['ok', '']
  assert.match(errorsOf(e), /"needs" must be a list of lines/)
})

test('related: catalogue ids only, at most 4, not the product itself', () => {
  const d = data(); d.product.related = [807, 999]
  assert.match(errorsOf(d), /product\.yml: related id 999 is not in the Net-Logic catalogue/)
  const self = data(); self.product.related = [792]; self.product.id = 792
  assert.match(errorsOf(self), /related id 792 is the product itself/)
  const many = data(); many.product.related = [647, 807, 1029, 1246, 792]
  assert.match(errorsOf(many), /at most 4 related ids, got 5/)
  const scalar = data(); scalar.product.related = 807
  assert.match(errorsOf(scalar), /"related" must be a list of DoliStore ids/)
  const ok = data(); ok.product.related = [1029, '647']
  assert.deepEqual(validate(ok, ctx), [])
})

test('without the layout key, a body in the old format stays valid', () => {
  const d = data()
  delete d.product.layout
  d.langs.en.long = 'Just text with Dolibarr 20 and PHP 8.\n\n## Requirements\n\nV20'
  assert.deepEqual(validate(d, ctx), [])
})
