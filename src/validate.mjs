import {
  CATEGORIES, DOLIBARR_VERSIONS, MAX_CATEGORIES, MAX_SCREENSHOTS, MAX_ZIP_BYTES, dolibarrNumber,
} from './constants.mjs'
import { toStoreVersion } from './version.mjs'

const REQUIRED = ['id', 'dolibarr', 'php', 'access_days', 'price', 'support', 'categories']

export function validate(data, { version, zipBytes }) {
  const errors = []
  const p = data.product ?? {}
  if (typeof p !== 'object' || Array.isArray(p)) {
    return ['product.yml: must be a mapping of keys']
  }

  for (const key of REQUIRED) {
    if (p[key] === undefined || p[key] === null || p[key] === '') {
      errors.push(`product.yml: "${key}" is missing`)
    }
  }
  if (p.id !== undefined && !/^\d+$/.test(String(p.id))) {
    errors.push(`product.yml: "id" must be numeric, got "${p.id}"`)
  }

  if (!data.langs || !data.langs.en) {
    errors.push('dolistore/en.md is mandatory (English description)')
  }
  for (const [lang, text] of Object.entries(data.langs || {})) {
    for (const [field, label] of [['title', 'title'], ['short', 'short description'], ['long', 'long description']]) {
      if (!text[field]) {
        errors.push(`dolistore/${lang}.md: empty ${label} (${field})`)
      }
    }
  }

  const categories = Array.isArray(p.categories) ? p.categories : []
  if (categories.length > MAX_CATEGORIES) {
    errors.push(`At most ${MAX_CATEGORIES} categories, got ${categories.length}`)
  }
  for (const label of categories) {
    if (!(label in CATEGORIES)) {
      errors.push(`Unknown category "${label}" (exact DoliStore label required)`)
    }
  }

  const dol = p.dolibarr || {}
  for (const side of ['min', 'max']) {
    if (dol[side] !== undefined && !(dol[side] in DOLIBARR_VERSIONS)) {
      errors.push(`Unknown Dolibarr version "${dol[side]}" for ${side} (V6 to V24)`)
    }
  }
  if (dol.min in DOLIBARR_VERSIONS && dol.max in DOLIBARR_VERSIONS && dolibarrNumber(dol.min) > dolibarrNumber(dol.max)) {
    errors.push(`Dolibarr min (${dol.min}) is greater than max (${dol.max})`)
  }

  const php = p.php || {}
  for (const side of ['min', 'max']) {
    if (php[side] !== undefined && !/^\d+\.\d+$/.test(String(php[side]))) {
      errors.push(`php.${side} must look like 7.4, got "${php[side]}"`)
    }
  }

  try {
    toStoreVersion(version)
  } catch (error) {
    errors.push(error.message)
  }
  if (zipBytes > MAX_ZIP_BYTES) {
    errors.push(`The zip is larger than 80 MB (DoliStore limit)`)
  }
  if ((data.screenshots || []).length > MAX_SCREENSHOTS) {
    errors.push(`At most ${MAX_SCREENSHOTS} screenshots, got ${data.screenshots.length}`)
  }
  return errors
}
