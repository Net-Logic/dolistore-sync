import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const bin = fileURLToPath(new URL('../bin/dolistore-sync.mjs', import.meta.url))
// No credentials in the child environment: these tests must never reach the network
const env = { ...process.env, DOLISTORE_LOGIN: '', DOLISTORE_PASSWORD: '' }

test('cli without arguments exits 2 with Missing --module', () => {
  const r = spawnSync('node', [bin], { encoding: 'utf8', env })
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Missing --module/)
})

test('cli with a non-existent module dir fails before any browser use', () => {
  const missing = join(tmpdir(), 'dolistore-sync-no-such-module')
  const r = spawnSync('node', [bin, '--module', missing, '--descriptor', 'x.php', '--zip', 'x.zip'], { encoding: 'utf8', env })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /dolistore\/product\.yml/)
})

test('cli with a missing zip fails with "zip not found" before any browser use', () => {
  const module = fileURLToPath(new URL('./fixtures/goodmodule', import.meta.url))
  const r = spawnSync('node', [bin, '--module', module, '--descriptor', 'core/modules/modGood.class.php', '--zip', join(tmpdir(), 'dolistore-sync-no-such.zip')], { encoding: 'utf8', env })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /zip not found/)
})
