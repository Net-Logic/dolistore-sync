import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { chromium } from 'playwright'
import { loadModuleData } from './data.mjs'
import { validate } from './validate.mjs'
import { buildFormValues } from './form.mjs'
import { assertZipMatchesVersion, readModuleVersion } from './version.mjs'
import {
  assertRealRunElements, fillForm, applyScreenshotPlan, login, openProduct, readFormFields, readScreenshots, submit, takeScreenshot, uploadZip,
} from './browser.mjs'
import { installReadOnlyGuard, shouldApplyScreenshots } from './checks.mjs'
import { hashFile, planScreenshots } from './screenshots.mjs'

export async function run({ moduleDir, descriptor, zipPath, dryRun, outDir, login: email, password }) {
  const data = loadModuleData(moduleDir)
  const version = readModuleVersion(readFileSync(join(moduleDir, descriptor), 'utf8'))
  if (!existsSync(zipPath)) {
    throw new Error(`zip not found: ${zipPath}`)
  }
  assertZipMatchesVersion(zipPath, version)
  const errors = validate(data, { version, zipBytes: statSync(zipPath).size })
  if (errors.length > 0) {
    throw new Error(`Invalid dolistore data:\n- ${errors.join('\n- ')}`)
  }
  if (!email || !password) {
    throw new Error('DOLISTORE_LOGIN and DOLISTORE_PASSWORD are required')
  }
  const values = buildFormValues(data, version)
  mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  // Set only once login() has returned: its failures never get a screenshot (the login may be typed in)
  let loggedIn = false
  try {
    await login(page, { login: email, password })
    loggedIn = true
    await openProduct(page, data.product.id)
    // Screenshots phase, BEFORE the form: adding/deleting is an immediate AJAX call and the upload reloads the page
    const mode = data.product.screenshots ?? 'if-empty'
    const current = await readScreenshots(page)
    const desired = data.screenshots.map((file) => ({ file, hash: hashFile(file) }))
    const plan = planScreenshots({ mode, current, desired })
    const screenshots = { mode, current: current.map((c) => c.id), plan: { del: plan.del, add: plan.add.map((f) => basename(f)), keep: plan.keep, reason: plan.reason } }
    if (shouldApplyScreenshots({ dryRun, plan })) {
      screenshots.applied = await applyScreenshotPlan(page, plan, { desiredHashes: desired.map((d) => d.hash), mode })
      // The reload erased nothing yet, but start the form from a fresh page
      await openProduct(page, data.product.id)
    }
    // Dry run is strictly read-only: every non-GET/HEAD request is aborted and recorded
    // (installed after the read-only screenshots phase)
    const abortedWrites = dryRun ? await installReadOnlyGuard(page) : []
    await fillForm(page, values)
    // A dry run never sets the zip input: it only reports
    if (dryRun) {
      await assertRealRunElements(page, { screenshots: plan.add.length > 0 })
    } else {
      await uploadZip(page, zipPath)
    }
    // Read-only: what the form currently holds as price (never sent by this tool)
    const currentPrice = (await readFormFields(page)).sale_price
    // Never write the credentials: only the values sent to the form
    writeFileSync(join(outDir, 'dolistore-values.json'), JSON.stringify({ values, screenshots, zip: basename(zipPath), dryRun, abortedWrites, currentPrice }, null, 2))
    await takeScreenshot(page, join(outDir, 'dolistore-form.png'), email)
    if (dryRun) {
      return { submitted: false, values }
    }
    await submit(page, data.product.id, basename(zipPath), values.text)
    return { submitted: true, values }
  } catch (error) {
    if (loggedIn) {
      await takeScreenshot(page, join(outDir, 'dolistore-error.png'), email).catch(() => {})
    }
    throw error
  } finally {
    await browser.close()
  }
}
