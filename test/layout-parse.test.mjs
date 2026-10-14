import test from 'node:test'
import assert from 'node:assert/strict'
import { moduleName, normalizeHeading, parseLayoutBody } from '../src/layout/parse.mjs'

const body = [
  '**Demo** sends one email.',
  '',
  'Second paragraph.',
  '',
  '## Features',
  '',
  '- **One**: first text.',
  '- **Two** - second text',
  '  on two lines.',
  '- **Three:** third text.',
  '',
  '## How it works',
  '',
  '1. Open.',
  '2. Click.',
  '3. Send.',
].join('\n')

test('parses the intro paragraphs, the features and the steps', () => {
  const p = parseLayoutBody(body, 'en')
  assert.deepEqual(p.errors, [])
  assert.deepEqual(p.intro, ['**Demo** sends one email.', 'Second paragraph.'])
  assert.deepEqual(p.introBold, ['Demo'])
  assert.deepEqual(p.features, [
    { lead: 'One', text: 'first text.' },
    { lead: 'Two', text: 'second text\non two lines.' },
    { lead: 'Three', text: 'third text.' },
  ])
  assert.deepEqual(p.how, ['Open.', 'Click.', 'Send.'])
})

test('How it works is optional', () => {
  const p = parseLayoutBody('**Demo** x.\n\n## Features\n\n- **A**: a\n', 'en')
  assert.deepEqual(p.errors, [])
  assert.equal(p.how, null)
})

test('headings are matched per language, without case or accents; English is accepted everywhere', () => {
  const fr = parseLayoutBody('**D** x.\n\n## FONCTIONNALITES\n\n- **A** : a\n\n## Fonctionnement\n\n1. un\n', 'fr')
  assert.deepEqual(fr.errors, [])
  assert.deepEqual(fr.features, [{ lead: 'A', text: 'a' }])
  assert.deepEqual(fr.how, ['un'])
  assert.deepEqual(parseLayoutBody('**D** x.\n\n## Funzionalita\n\n- **A**: a\n', 'it').errors, [])
  assert.deepEqual(parseLayoutBody('**D** x.\n\n## Cómo funciona\n\n1. a\n\n', 'es').features, [])
  assert.deepEqual(parseLayoutBody('**D** x.\n\n## Features\n\n- **A**: a\n', 'de').errors, [])
  // The German heading is not a French one
  assert.match(parseLayoutBody('**D** x.\n\n## Funktionen\n\n- **A**: a\n', 'fr').errors.join('\n'), /unexpected section "Funktionen"/)
})

test('a bullet without a bold lead-in, or with no text after it, is reported with its number', () => {
  const p = parseLayoutBody('**D** x.\n\n## Features\n\n- **A**: a\n- plain text\n- **C**\n', 'en')
  const errors = p.errors.join('\n')
  assert.match(errors, /feature 2 .*bold lead-in/)
  assert.match(errors, /feature 3 .*no text after/)
})

test('hand-written Requirements, Installation or Support sections are refused', () => {
  const p = parseLayoutBody('**D** x.\n\n## Features\n\n- **A**: a\n\n## Requirements\n\nDolibarr\n\n## Installation\n\nx\n\n## Support and updates\n\ny\n', 'en')
  const errors = p.errors.join('\n')
  assert.match(errors, /"Requirements".*generated/)
  assert.match(errors, /"Installation".*generated/)
  assert.match(errors, /"Support and updates".*generated/)
  const de = parseLayoutBody('**D** x.\n\n## Funktionen\n\n- **A**: a\n\n## Voraussetzungen\n\nx\n', 'de')
  assert.match(de.errors.join('\n'), /"Voraussetzungen".*generated/)
  const fr = parseLayoutBody('**D** x.\n\n## Fonctionnalités\n\n- **A** : a\n\n## Prérequis\n\nx\n', 'fr')
  assert.match(fr.errors.join('\n'), /"Prérequis".*generated/)
})

test('other sections, other heading levels and other blocks are refused', () => {
  const unknown = parseLayoutBody('**D** x.\n\n## Features\n\n- **A**: a\n\n## Pricing\n\nx\n', 'en')
  assert.match(unknown.errors.join('\n'), /unexpected section "Pricing"/)
  const h3 = parseLayoutBody('**D** x.\n\n### Features\n\n- **A**: a\n', 'en')
  assert.match(h3.errors.join('\n'), /only ## headings/)
  const extra = parseLayoutBody('**D** x.\n\n## Features\n\n- **A**: a\n\nA paragraph after the list.\n', 'en')
  assert.match(extra.errors.join('\n'), /Features: only one bullet list/)
})

test('the body must start with one or two intro paragraphs', () => {
  assert.match(parseLayoutBody('## Features\n\n- **A**: a\n', 'en').errors.join('\n'), /must start with an intro/)
  assert.match(parseLayoutBody('a\n\nb\n\nc\n\n## Features\n\n- **A**: a\n', 'en').errors.join('\n'), /1 or 2 paragraphs, got 3/)
})

test('a missing Features section, a numbered feature list or a bullet How it works are refused', () => {
  assert.match(parseLayoutBody('**D** x.\n', 'en').errors.join('\n'), /Features section is missing/)
  assert.match(parseLayoutBody('**D** x.\n\n## Features\n\n1. **A**: a\n', 'en').errors.join('\n'), /Features: only one bullet list/)
  assert.match(parseLayoutBody('**D** x.\n\n## Features\n\n- **A**: a\n\n## How it works\n\n- a\n', 'en').errors.join('\n'), /How it works: only one numbered list/)
  assert.match(parseLayoutBody('**D** x.\n\n## Features\n\n', 'en').errors.join('\n'), /Features: a bullet list is required/)
})

test('module name is the part of the title before " - "', () => {
  assert.equal(moduleName('Global Invoice Reminder - one reminder email'), 'Global Invoice Reminder')
  assert.equal(moduleName('Google reCAPTCHA v3 for Dolibarr'), 'Google reCAPTCHA v3 for Dolibarr')
})

test('normalizeHeading drops case, accents, extra spaces and a trailing colon', () => {
  assert.equal(normalizeHeading('  Fonctionnalités : '), 'fonctionnalites')
  assert.equal(normalizeHeading('CÓMO   funciona'), 'como funciona')
})
