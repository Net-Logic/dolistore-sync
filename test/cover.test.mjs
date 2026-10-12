import test from 'node:test'
import assert from 'node:assert/strict'
import { coverMode, planCover } from '../src/cover.mjs'

test('default mode is keep and never uploads', () => {
  assert.equal(coverMode({}), 'keep')
  assert.deepEqual(planCover({ mode: 'keep', currentHash: 'a', desiredHash: 'b' }), { upload: false, reason: 'cover not managed (cover: keep)' })
})

test('sync: identical bytes is a no-op, different or missing uploads', () => {
  assert.equal(planCover({ mode: 'sync', currentHash: 'a', desiredHash: 'a' }).upload, false)
  assert.equal(planCover({ mode: 'sync', currentHash: 'a', desiredHash: 'b' }).reason, 'cover differs')
  assert.equal(planCover({ mode: 'sync', currentHash: null, desiredHash: 'b' }).reason, 'product has no cover')
})

test('sync without a repository cover and unknown mode throw', () => {
  assert.throws(() => planCover({ mode: 'sync', currentHash: 'a', desiredHash: null }), /cover: sync needs/)
  assert.throws(() => planCover({ mode: 'x', currentHash: 'a', desiredHash: 'a' }), /unknown cover mode/)
})
