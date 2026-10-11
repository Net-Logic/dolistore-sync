import test from 'node:test'
import assert from 'node:assert/strict'
import { assertZipMatchesVersion, readModuleVersion, toStoreVersion } from '../src/version.mjs'

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

test('a commented version line earlier in the file cannot win', () => {
  const src = "// $this->version = '9.9.9';\n\t$this->version = '1.2.3';\n"
  assert.equal(readModuleVersion(src), '1.2.3')
})

test('zip name must end with the store version', () => {
  assert.doesNotThrow(() => assertZipMatchesVersion('/tmp/module_prune-2026.09.15.zip', '2026-09-15'))
  assert.doesNotThrow(() => assertZipMatchesVersion('/tmp/module_prune-1.2.3.zip', '1.2.3'))
  assert.throws(() => assertZipMatchesVersion('/tmp/module_prune-1.2.2.zip', '1.2.3'), /does not match/)
  assert.throws(() => assertZipMatchesVersion('/tmp/module_prune-11.2.3.zip', '1.2.3'), /does not match/)
})
