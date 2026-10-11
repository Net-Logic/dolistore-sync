import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { chromium } from 'playwright'
import { loadModuleData } from './data.mjs'
import { validate } from './validate.mjs'
import { buildFormValues } from './form.mjs'
import { assertZipMatchesVersion, readModuleVersion, toStoreVersion } from './version.mjs'
import {
  assertRealRunElements, fillForm, login, openProduct, planScreenshots, screenshotOptions, submit, uploadScreenshots, uploadZip,
} from './browser.mjs'
import { installReadOnlyGuard } from './checks.mjs'

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
    // Dry run is strictly read-only: every non-GET/HEAD request is aborted and recorded
    const abortedWrites = dryRun ? await installReadOnlyGuard(page) : []
    await fillForm(page, values)
    // A dry run never sets the zip input nor adds screenshots: it only reports them
    let screenshots
    if (dryRun) {
      screenshots = await planScreenshots(page, data.screenshots)
      await assertRealRunElements(page, { screenshots: screenshots.wouldAdd > 0 })
    } else {
      await uploadZip(page, zipPath)
      screenshots = await uploadScreenshots(page, data.screenshots)
    }
    // Never write the credentials: only the values sent to the form
    writeFileSync(join(outDir, 'dolistore-values.json'), JSON.stringify({ values, screenshots, zip: basename(zipPath), dryRun, abortedWrites }, null, 2))
    await page.screenshot(screenshotOptions(page, join(outDir, 'dolistore-form.png')))
    if (dryRun) {
      return { submitted: false, values }
    }
    await submit(page, data.product.id, basename(zipPath), toStoreVersion(version))
    return { submitted: true, values }
  } catch (error) {
    if (loggedIn) {
      await page.screenshot(screenshotOptions(page, join(outDir, 'dolistore-error.png'))).catch(() => {})
    }
    throw error
  } finally {
    await browser.close()
  }
}
