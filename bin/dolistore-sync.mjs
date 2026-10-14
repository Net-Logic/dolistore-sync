#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { maskSecrets } from '../src/mask.mjs'
import { isDryRun } from '../src/checks.mjs'
import { run, runCreate } from '../src/run.mjs'
import { runPreview } from '../src/preview.mjs'

const { values } = parseArgs({
  options: {
    module: { type: 'string' },
    descriptor: { type: 'string' },
    zip: { type: 'string' },
    out: { type: 'string', default: 'out' },
    // Dry run is the default (fail closed): only --submit sends the form; --dry-run is a no-op alias
    submit: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    // Creates a NEW product (product.yml without id, with a create block); refuses an existing one
    create: { type: 'boolean', default: false },
    // Writes <dir>/<lang>.html (the description in a DoliStore-like page): no zip, no login, no network
    preview: { type: 'string' },
  },
})

for (const key of values.preview ? ['module', 'descriptor'] : ['module', 'descriptor', 'zip']) {
  if (!values[key]) {
    console.error(`Missing --${key}`)
    process.exit(2)
  }
}

if (values.preview) {
  try {
    const { files } = runPreview({ moduleDir: resolve(values.module), descriptor: values.descriptor, outDir: resolve(values.preview) })
    console.log(`Preview written: ${files.join(', ')}`)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
  process.exit(0)
}

try {
  const result = await (values.create ? runCreate : run)({
    moduleDir: resolve(values.module),
    descriptor: values.descriptor,
    zipPath: resolve(values.zip),
    outDir: resolve(values.out),
    dryRun: isDryRun(values),
    login: process.env.DOLISTORE_LOGIN,
    password: process.env.DOLISTORE_PASSWORD,
  })
  console.log(!result.submitted ? 'Dry run done, nothing submitted.' : values.create ? `Product created on DoliStore with id ${result.id}: write it in dolistore/product.yml.` : 'Product updated on DoliStore.')
} catch (error) {
  console.error(maskSecrets(error.message, [process.env.DOLISTORE_PASSWORD, process.env.DOLISTORE_LOGIN]))
  process.exit(1)
}
