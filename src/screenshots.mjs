import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export const SCREENSHOT_MODES = ['if-empty', 'sync']

export const hashBuffer = (buf) => createHash('sha256').update(buf).digest('hex')
export const hashFile = (path) => hashBuffer(readFileSync(path))

// Pure plan: what to delete from and add to the product page so that its
// "other images" match the repository. current: page order, desired: sorted by name.
export function planScreenshots({ mode, current, desired }) {
  if (mode === 'if-empty') {
    if (current.length > 0) {
      return { del: [], add: [], keep: current.length, reason: 'product already has screenshots' }
    }
    if (desired.length === 0) {
      return { del: [], add: [], keep: 0, reason: 'no screenshots in the repository' }
    }
    return { del: [], add: desired.map((d) => d.file), keep: 0, reason: 'product has none yet' }
  }
  if (mode === 'sync') {
    if (desired.length === 0) {
      throw new Error('screenshots: sync needs at least one image in dolistore/screenshots (nothing is deleted)')
    }
    let k = 0
    while (k < current.length && k < desired.length && current[k].hash === desired[k].hash) {
      k++
    }
    if (k === current.length && k === desired.length) {
      return { del: [], add: [], keep: k, reason: 'screenshots already identical' }
    }
    return {
      del: current.slice(k).map((c) => c.id),
      add: desired.slice(k).map((d) => d.file),
      keep: k,
      reason: 'screenshots differ',
    }
  }
  throw new Error(`unknown screenshots mode "${mode}"`)
}
