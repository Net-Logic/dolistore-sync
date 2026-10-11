import {
  LOGIN_SELECTORS, SUBMITTED_PREFIX, extractRefusal, formatRefusal, diffCategories, isEditorSynced, maskSelectors, productHrefPattern,
} from './checks.mjs'

const BASE = 'https://www.dolistore.com'

// Selectors confirmed on the real page (2026-10-11): #login_form #emaillogin / #passwdlogin / #SubmitLogin
export async function login(page, { login: email, password }) {
  await page.goto(`${BASE}/login-register.php`)
  // The registration form on the same page has its own e-mail/password fields: stay inside #login_form
  // Playwright errors can echo the filled value: never rethrow the original error
  try {
    await page.locator(LOGIN_SELECTORS.email).fill(email)
    await page.locator(LOGIN_SELECTORS.password).fill(password)
    await page.locator(LOGIN_SELECTORS.submit).click()
  } catch {
    throw new Error('DoliStore login form not usable (selectors changed?)')
  }
  // A wrong password stays on login-register.php: the timeout is not an error by itself
  await page.waitForURL((url) => !url.pathname.includes('login-register.php'), { timeout: 15000 }).catch(() => {})
  if (page.url().includes('login-register.php')) {
    throw new Error('DoliStore login failed: check DOLISTORE_LOGIN / DOLISTORE_PASSWORD (not retrying, to avoid locking the account)')
  }
}

export async function openProduct(page, id) {
  await page.goto(`${BASE}/edit-module-product.php?id=${id}`)
  await page.locator('#product-creation-form').waitFor({ state: 'attached' })
}

async function setText(page, name, value) {
  const field = page.locator(`#product-creation-form [name="${name}"]`)
  if (await field.count() === 0) {
    throw new Error(`DoliStore form changed: field "${name}" not found`)
  }
  // Long descriptions are CKEditor instances backed by a textarea: found by id, then by name
  const result = await page.evaluate(async ({ name: n, value: v }) => {
    const el = document.querySelector(`#product-creation-form [name="${n}"]`)
    const instances = (window.CKEDITOR && window.CKEDITOR.instances) || {}
    const editor = (el.id && instances[el.id]) || instances[n]
    const isDescription = n.startsWith('description_')
    if (isDescription && !editor) {
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null) {
        return { error: 'no-instance' }
      }
    }
    let got = null
    if (editor) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 5000)
        editor.setData(v, { callback: () => { clearTimeout(timer); resolve() } })
      })
      got = editor.getData()
      if (typeof editor.updateElement === 'function') {
        editor.updateElement()
      }
    }
    el.value = editor ? got : v
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return { editor: Boolean(editor), got }
  }, { name, value })
  if (result.error === 'no-instance') {
    throw new Error(`DoliStore form changed: no editor instance for ${name}`)
  }
  if (name.startsWith('description_') && !isEditorSynced(value, result.got)) {
    throw new Error(`description editor not synchronised (${name})`)
  }
}

export async function fillForm(page, values) {
  for (const [name, value] of Object.entries(values.text)) {
    await setText(page, name, value)
  }
  for (const [name, value] of Object.entries(values.selects)) {
    await page.locator(`#product-creation-form select[name="${name}"]`).selectOption(value)
  }
  // Categories: uncheck everything first, then check the wanted ones, then verify the result
  const state = await page.evaluate((wanted) => {
    const boxes = [...document.querySelectorAll('#product-creation-form input[name="categories[]"]')]
    for (const box of boxes) {
      if (box.checked) {
        box.click()
      }
    }
    const absent = []
    for (const id of wanted) {
      const box = boxes.find((b) => b.value === id)
      if (!box) {
        absent.push(id)
      } else if (!box.checked) {
        box.click()
      }
    }
    return { absent, checked: boxes.filter((b) => b.checked).map((b) => b.value) }
  }, values.categories)
  if (state.absent.length > 0) {
    throw new Error(`DoliStore form changed: no checkbox for category id(s) ${state.absent.join(', ')}`)
  }
  const diff = diffCategories(state.checked, values.categories)
  if (diff.missing.length > 0 || diff.extra.length > 0) {
    throw new Error(`Categories not as wanted: missing [${diff.missing.join(', ')}], unexpected [${diff.extra.join(', ')}]`)
  }
  const terms = page.locator('#dolibarr_terms')
  if (!(await terms.isChecked())) {
    throw new Error('The seller terms checkbox is not accepted on this product: accept it once by hand')
  }
}

export async function uploadZip(page, zipPath) {
  await page.locator('#virtual_product_file').setInputFiles(zipPath)
}

// Read-only: what uploadScreenshots would do (safe in a dry run)
export async function planScreenshots(page, files) {
  if (await page.locator('#table-body-edit').count() === 0) {
    throw new Error('DoliStore form changed: #table-body-edit not found')
  }
  const existing = await page.locator('#table-body-edit tr[data-id]').count()
  if (existing > 0) {
    return { wouldAdd: 0, reason: 'product already has screenshots' }
  }
  if (files.length === 0) {
    return { wouldAdd: 0, reason: 'no screenshots in the repository' }
  }
  return { wouldAdd: files.length, reason: 'product has none yet' }
}

const screenshotRows = (page) => page.locator('#table-body-edit tr[data-id]').count()

async function waitForRows(page, expected) {
  try {
    await page.waitForFunction(
      (n) => document.querySelectorAll('#table-body-edit tr[data-id]').length >= n,
      expected,
      { timeout: 30000 },
    )
  } catch {
    throw new Error('screenshots not accepted')
  }
}

// Selectors to be confirmed by the first dry run (see plan task 7 steps 5-6)
// Real submission only (a dry run uses planScreenshots, which changes nothing).
// Adds screenshots only when the product has none yet; never touches existing images
export async function uploadScreenshots(page, files) {
  const plan = await planScreenshots(page, files)
  if (plan.wouldAdd === 0) {
    return { added: 0, skipped: plan.reason }
  }
  const input = page.locator('#fileInput2')
  const before = await screenshotRows(page)
  if (await input.getAttribute('multiple') !== null) {
    await input.setInputFiles(files)
    await waitForRows(page, before + files.length)
  } else {
    for (let i = 0; i < files.length; i++) {
      await input.setInputFiles(files[i])
      await waitForRows(page, before + i + 1)
    }
  }
  if (await screenshotRows(page) < before + files.length) {
    throw new Error('screenshots not accepted')
  }
  return { added: files.length }
}

// Read-only check (no click) that the elements only a real run uses are still there
export async function assertRealRunElements(page, { screenshots }) {
  const selectors = ['#virtual_product_file', '#sub', '#dolibarr_terms']
  if (screenshots) {
    selectors.push('#fileInput2')
  }
  for (const selector of selectors) {
    if (await page.locator(selector).count() === 0) {
      throw new Error(`DoliStore form changed: ${selector} not found`)
    }
  }
}

// Masks credential-like inputs, the account header/nav and any text/input holding the login e-mail
// (best effort). Only the login is passed here, never the password.
// A failure is rethrown generically: a locator description could echo the e-mail.
export async function takeScreenshot(page, path, email) {
  const mask = maskSelectors(email).map((selector) => page.locator(selector))
  if (email) {
    mask.push(page.getByText(email, { exact: false }))
  }
  try {
    await page.screenshot({ path, fullPage: true, mask })
  } catch {
    throw new Error('screenshot failed')
  }
}

export async function submit(page, id, zipName, expectedVersion) {
  if (await page.locator('#sub').count() === 0) {
    throw new Error('DoliStore form changed: #sub not found')
  }
  // From the click on, the submission may have gone through whatever happens next
  try {
    await Promise.all([page.waitForLoadState('domcontentloaded'), page.locator('#sub').click({ timeout: 300000 })])
    const notices = await page.locator('.alert-danger, .alert-error, .error, .errors').allInnerTexts().catch(() => [])
    const selectorText = notices.join(' ').trim()
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')
    const extracted = extractRefusal(bodyText)
    const notice = extracted.length > selectorText.length ? extracted : selectorText
    if (notice) {
      const refusal = new Error(formatRefusal(notice))
      refusal.refused = true
      throw refusal
    }
    await openProduct(page, id)
    const version = await page.locator('#product-creation-form [name="version"]').inputValue()
    if (version !== expectedVersion) {
      throw new Error(`version on DoliStore is "${version}", expected "${expectedVersion}"`)
    }
    await page.goto(`${BASE}/manage-products.php`)
    const text = await page.evaluate((source) => {
      const re = new RegExp(source)
      const link = [...document.querySelectorAll('a[href*="edit-module-product.php?id="]')].find((a) => re.test(a.getAttribute('href')))
      const row = link && link.closest('tr')
      return row ? row.innerText : null
    }, productHrefPattern(id))
    if (text === null) {
      throw new Error('product row not found in manage-products.php')
    }
    if (!text.includes(zipName)) {
      throw new Error(`"${zipName}" not found in the product row of manage-products.php`)
    }
  } catch (error) {
    if (error.refused) {
      throw error
    }
    throw new Error(`${SUBMITTED_PREFIX}: ${error.message}`)
  }
}
