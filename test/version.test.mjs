import test from 'node:test'
import assert from 'node:assert/strict'
import { readModuleVersion, toStoreVersion } from '../src/version.mjs'

test('reads the version from a Dolibarr module descriptor', () => {
  assert.equal(readModuleVersion("\t\t$this->version = '2.0.2';\n"), '2.0.2')
  assert.equal(readModuleVersion("$this->version = '2026-09-15';"), '2026-09-15')
})

test('refuses a descriptor without a numeric version', () => {
  assert.throws(() => readModuleVersion("$this->version = 'development';"), /version/i)
})

test('dashes become dots and only digits and dots are accepted', () => {
  assert.equal(toStoreVersion('2026-09-15'), '2026.09.15')
  assert.equal(toStoreVersion('1.2'), '1.2')
  assert.equal(toStoreVersion('3'), '3')
  assert.throws(() => toStoreVersion('1.2.3-beta'), /digits and dots/)
  assert.throws(() => toStoreVersion('1.2.3.4'), /digits and dots/)
})
