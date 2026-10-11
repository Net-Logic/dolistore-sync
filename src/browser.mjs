const BASE = 'https://www.dolistore.com'

// Selectors to be confirmed by the first dry run (see plan task 7 steps 5-6)
export async function login(page, { login: email, password }) {
  await page.goto(`${BASE}/login-register.php`)
  // The sign-in form is the first one with an e-mail and a password field
  await page.getByLabel(/e-?mail/i).first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.getByRole('button', { name: /connexion|sign in|se connecter/i }).first().click(),
  ])
  if (page.url().includes('login-register.php') || await page.getByText(/authentification|invalid|incorrect/i).count()) {
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
  // Long descriptions are CKEditor instances backed by a textarea of the same name
  await page.evaluate(({ name: n, value: v }) => {
    const el = document.querySelector(`#product-creation-form [name="${n}"]`)
    const editor = window.CKEDITOR && window.CKEDITOR.instances && window.CKEDITOR.instances[n]
    if (editor) {
      editor.setData(v)
    }
    el.value = v
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, { name, value })
}

export async function fillForm(page, values) {
  for (const [name, value] of Object.entries(values.text)) {
    await setText(page, name, value)
  }
  for (const [name, value] of Object.entries(values.selects)) {
    await page.locator(`#product-creation-form select[name="${name}"]`).selectOption(value)
  }
  // Categories: exactly the wanted ones are checked, others are unchecked
  await page.evaluate((wanted) => {
    for (const box of document.querySelectorAll('#product-creation-form input[name="categories[]"]')) {
      if (box.checked !== wanted.includes(box.value)) {
        box.click()
      }
    }
  }, values.categories)
  const terms = page.locator('#dolibarr_terms')
  if (!(await terms.isChecked())) {
    throw new Error('The seller terms checkbox is not accepted on this product: accept it once by hand')
  }
}

export async function uploadZip(page, zipPath) {
  await page.locator('#virtual_product_file').setInputFiles(zipPath)
}

// Selectors to be confirmed by the first dry run (see plan task 7 steps 5-6)
// Adds screenshots only when the product has none yet; never touches existing images
export async function uploadScreenshots(page, files) {
  const existing = await page.locator('#table-body-edit tr[data-id]').count()
  if (existing > 0 || files.length === 0) {
    return { added: 0, skipped: existing > 0 ? 'product already has screenshots' : 'no screenshots in the repository' }
  }
  for (const file of files) {
    await page.locator('#fileInput2').setInputFiles(file)
  }
  return { added: files.length }
}

export async function submit(page, id, zipName) {
  await Promise.all([page.waitForLoadState('domcontentloaded'), page.locator('#sub').click()])
  await page.goto(`${BASE}/manage-products.php`)
  const row = page.locator('tr', { has: page.locator(`a[href="edit-module-product.php?id=${id}"]`) })
  const text = await row.first().innerText()
  if (!text.includes(zipName)) {
    throw new Error(`Submission not confirmed: "${zipName}" not found in the product row of manage-products.php`)
  }
}
