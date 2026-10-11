#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { maskSecrets } from '../src/mask.mjs'
import { isDryRun } from '../src/checks.mjs'
import { run } from '../src/run.mjs'

const { values } = parseArgs({
  options: {
    module: { type: 'string' },
    descriptor: { type: 'string' },
    zip: { type: 'string' },
    out: { type: 'string', default: 'out' },
    // Dry run is the default (fail closed): only --submit sends the form; --dry-run is a no-op alias
    submit: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
})

for (const key of ['module', 'descriptor', 'zip']) {
  if (!values[key]) {
    console.error(`Missing --${key}`)
    process.exit(2)
  }
}

try {
  const result = await run({
    moduleDir: resolve(values.module),
    descriptor: values.descriptor,
    zipPath: resolve(values.zip),
    outDir: resolve(values.out),
    dryRun: isDryRun(values),
    login: process.env.DOLISTORE_LOGIN,
    password: process.env.DOLISTORE_PASSWORD,
  })
  console.log(result.submitted ? 'Product updated on DoliStore.' : 'Dry run done, nothing submitted.')
} catch (error) {
  console.error(maskSecrets(error.message, [process.env.DOLISTORE_PASSWORD, process.env.DOLISTORE_LOGIN]))
  process.exit(1)
}
