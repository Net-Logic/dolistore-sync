import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SCREENSHOT_MODES, hashBuffer, hashFile, planScreenshots } from '../src/screenshots.mjs'

const cur = (...hashes) => hashes.map((hash, i) => ({ id: String(100 + i), hash }))
const des = (...hashes) => hashes.map((hash) => ({ file: `/r/${hash}.png`, hash }))

test('modes list', () => {
  assert.deepEqual(SCREENSHOT_MODES, ['if-empty', 'sync'])
})

test('if-empty with existing images does nothing', () => {
  assert.deepEqual(
    planScreenshots({ mode: 'if-empty', current: cur('a'), desired: des('b') }),
    { del: [], add: [], keep: 1, reason: 'product already has screenshots' },
  )
})

test('if-empty with none adds all desired in order', () => {
  assert.deepEqual(
    planScreenshots({ mode: 'if-empty', current: [], desired: des('a', 'b', 'c') }),
    { del: [], add: ['/r/a.png', '/r/b.png', '/r/c.png'], keep: 0, reason: 'product has none yet' },
  )
})

test('if-empty with no desired image does nothing', () => {
  assert.deepEqual(
    planScreenshots({ mode: 'if-empty', current: [], desired: [] }),
    { del: [], add: [], keep: 0, reason: 'no screenshots in the repository' },
  )
})

test('sync identical is a no-op', () => {
  assert.deepEqual(
    planScreenshots({ mode: 'sync', current: cur('a', 'b'), desired: des('a', 'b') }),
    { del: [], add: [], keep: 2, reason: 'screenshots already identical' },
  )
})

test('sync with a changed middle image deletes and adds from that index', () => {
  assert.deepEqual(
    planScreenshots({ mode: 'sync', current: cur('a', 'b', 'c'), desired: des('a', 'x', 'c') }),
    { del: ['101', '102'], add: ['/r/x.png', '/r/c.png'], keep: 1, reason: 'screenshots differ' },
  )
})

test('sync with a different order replaces everything', () => {
  assert.deepEqual(
    planScreenshots({ mode: 'sync', current: cur('a', 'b', 'c'), desired: des('b', 'a', 'c') }),
    { del: ['100', '101', '102'], add: ['/r/b.png', '/r/a.png', '/r/c.png'], keep: 0, reason: 'screenshots differ' },
  )
})

test('sync with fewer desired deletes the tail only', () => {
  assert.deepEqual(
    planScreenshots({ mode: 'sync', current: cur('a', 'b', 'c'), desired: des('a') }),
    { del: ['101', '102'], add: [], keep: 1, reason: 'screenshots differ' },
  )
})

test('sync with more desired adds the tail only', () => {
  assert.deepEqual(
    planScreenshots({ mode: 'sync', current: cur('a'), desired: des('a', 'b', 'c') }),
    { del: [], add: ['/r/b.png', '/r/c.png'], keep: 1, reason: 'screenshots differ' },
  )
})

test('sync with no desired image throws', () => {
  assert.throws(
    () => planScreenshots({ mode: 'sync', current: cur('a'), desired: [] }),
    { message: 'screenshots: sync needs at least one image in dolistore/screenshots (nothing is deleted)' },
  )
})

test('unknown mode throws', () => {
  assert.throws(
    () => planScreenshots({ mode: 'nope', current: [], desired: [] }),
    { message: 'unknown screenshots mode "nope"' },
  )
})

test('hashBuffer is sha256 hex', () => {
  assert.equal(hashBuffer(Buffer.from('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('hashFile matches hashBuffer of the content', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'shots-')), 'a.png')
  const content = Buffer.from([1, 2, 3, 250, 251])
  writeFileSync(file, content)
  assert.equal(hashFile(file), hashBuffer(content))
})

import { screenshotMode } from '../src/screenshots.mjs'

test('screenshotMode: absent, null and empty default to if-empty', () => {
  assert.equal(screenshotMode({}), 'if-empty')
  assert.equal(screenshotMode({ screenshots: null }), 'if-empty')
  assert.equal(screenshotMode({ screenshots: '' }), 'if-empty')
  assert.equal(screenshotMode({ screenshots: 'sync' }), 'sync')
})
