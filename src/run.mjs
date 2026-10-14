import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { chromium } from 'playwright'
import { loadModuleData } from './data.mjs'
import { validate } from './validate.mjs'
import { buildCreateValues, buildFormValues } from './form.mjs'
import { assertZipMatchesVersion, readModuleVersion } from './version.mjs'
import {
  assertCreateElements, assertRealRunElements, keepPendingStatus, readCover, readProductState, fillCreateExtras, fillForm, openNewProduct, submitCreate, uploadCover, applyScreenshotPlan, login, openProduct, readFormFields, readScreenshots, submit, takeScreenshot, uploadZip,
} from './browser.mjs'
import { SUBMITTED_PREFIX, installReadOnlyGuard, shouldApplyScreenshots } from './checks.mjs'
import { hashFile, planScreenshots, screenshotMode } from './screenshots.mjs'
import { coverMode, planCover } from './cover.mjs'
import { loadLayoutContext } from './layout/module.mjs'

export async function run({ moduleDir, descriptor, zipPath, dryRun, outDir, login: email, password }) {
  const data = loadModuleData(moduleDir)
  const descriptorSource = readFileSync(join(moduleDir, descriptor), 'utf8')
  const version = readModuleVersion(descriptorSource)
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
  if (data.product.layout) {
    data.layout = loadLayoutContext(moduleDir, descriptorSource)
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
    // Dry run is strictly read-only from the first page load: every non-GET/HEAD request is aborted and
    // recorded (installed once; the real run installs no guard). Image downloads use page.request, not routed.
    const abortedWrites = dryRun ? await installReadOnlyGuard(page) : []
    // State before anything else (GET only): a product waiting for approval must stay so
    const stateBefore = await readProductState(page, data.product.id)
    await openProduct(page, data.product.id)
    // Screenshots phase, BEFORE the form: adding/deleting is an immediate AJAX call and the upload reloads the page
    const mode = screenshotMode(data.product)
    const current = await readScreenshots(page)
    const desired = data.screenshots.map((file) => ({ file, hash: hashFile(file) }))
    const plan = planScreenshots({ mode, current, desired })
    const screenshots = { mode, current: current.map((c) => c.id), plan: { del: plan.del, add: plan.add.map((f) => basename(f)), keep: plan.keep, reason: plan.reason } }
    if (shouldApplyScreenshots({ dryRun, plan })) {
      // Plan on disk before any write, so a partial failure leaves a trace
      screenshots.applied = 'pending'
      writeFileSync(join(outDir, 'dolistore-values.json'), JSON.stringify({ values, screenshots, zip: basename(zipPath), dryRun }, null, 2))
      screenshots.applied = await applyScreenshotPlan(page, plan, { desiredHashes: desired.map((d) => d.hash), mode })
      // Uploads reload the page: re-open it so the form (not filled yet) starts from a fresh page
      await openProduct(page, data.product.id)
    }
    await fillForm(page, values, { checkStyles: Boolean(data.product.layout) })
    if (stateBefore === 'pending') {
      await keepPendingStatus(page)
    }
    // Cover: part of the form (sent with the zip), compared by content so that a second run changes nothing
    const coverPlan = planCover({ mode: coverMode(data.product), currentHash: coverMode(data.product) === 'sync' ? await readCover(page) : null, desiredHash: data.cover ? hashFile(data.cover) : null })
    screenshots.state = stateBefore
    screenshots.cover = { mode: coverMode(data.product), upload: coverPlan.upload, reason: coverPlan.reason }
    // A dry run never sets the zip input: it only reports
    if (dryRun) {
      await assertRealRunElements(page, { screenshots: plan.add.length > 0, cover: coverPlan.upload })
    } else {
      await uploadZip(page, zipPath)
      if (coverPlan.upload) {
        await uploadCover(page, data.cover)
      }
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
    const stateAfter = await readProductState(page, data.product.id)
    if (stateAfter !== stateBefore) {
      throw new Error(`${SUBMITTED_PREFIX}: the state of the product changed from "${stateBefore}" to "${stateAfter}": fix it by hand on DoliStore`)
    }
    if (coverPlan.upload) {
      await openProduct(page, data.product.id)
      if (await readCover(page) !== hashFile(data.cover)) {
        throw new Error(`${SUBMITTED_PREFIX}: the cover on DoliStore is not the one of the repository after the submission`)
      }
    }
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

// Creates a NEW product (no id yet). Dry run by default: fills the form and stops. Never touches an existing product.
export async function runCreate({ moduleDir, descriptor, zipPath, dryRun, outDir, login: email, password }) {
  const data = loadModuleData(moduleDir)
  const descriptorSource = readFileSync(join(moduleDir, descriptor), 'utf8')
  const version = readModuleVersion(descriptorSource)
  if (!existsSync(zipPath)) {
    throw new Error(`zip not found: ${zipPath}`)
  }
  assertZipMatchesVersion(zipPath, version)
  const errors = validate(data, { version, zipBytes: statSync(zipPath).size, create: true })
  if (errors.length > 0) {
    throw new Error(`Invalid dolistore data:\n- ${errors.join('\n- ')}`)
  }
  if (!email || !password) {
    throw new Error('DOLISTORE_LOGIN and DOLISTORE_PASSWORD are required')
  }
  if (data.product.layout) {
    data.layout = loadLayoutContext(moduleDir, descriptorSource)
  }
  const values = buildFormValues(data, version)
  const create = buildCreateValues(data)
  mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  let loggedIn = false
  try {
    await login(page, { login: email, password })
    loggedIn = true
    const abortedWrites = dryRun ? await installReadOnlyGuard(page) : []
    await openNewProduct(page)
    await fillForm(page, values, { creating: true, checkStyles: Boolean(data.product.layout) })
    await fillCreateExtras(page, create)
    await assertCreateElements(page)
    if (!dryRun) {
      await uploadZip(page, zipPath)
      await uploadCover(page, data.cover)
    }
    writeFileSync(join(outDir, 'dolistore-values.json'), JSON.stringify({ values, create, zip: basename(zipPath), cover: basename(data.cover), dryRun, abortedWrites }, null, 2))
    await takeScreenshot(page, join(outDir, 'dolistore-form.png'), email)
    if (dryRun) {
      return { submitted: false, values }
    }
    const id = await submitCreate(page, { name: values.text.name_en, zipName: basename(zipPath) })
    writeFileSync(join(outDir, 'dolistore-created-id.txt'), `${id}\n`)
    return { submitted: true, values, id }
  } catch (error) {
    if (loggedIn) {
      await takeScreenshot(page, join(outDir, 'dolistore-error.png'), email).catch(() => {})
    }
    throw error
  } finally {
    await browser.close()
  }
}
