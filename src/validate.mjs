import {
  CATEGORIES, DOLIBARR_VERSIONS, MAX_CATEGORIES, MAX_SCREENSHOTS, MAX_ZIP_BYTES, dolibarrNumber,
} from './constants.mjs'
import { toStoreVersion } from './version.mjs'

const REQUIRED = ['id', 'dolibarr', 'php', 'access_days', 'price', 'support', 'categories']

const isMapping = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
const isBlank = (value) => value === undefined || value === null || value === ''

// Compares "major.minor" strings as numbers, so 7.10 is greater than 7.9
function comparePhp(a, b) {
  const [majorA, minorA] = a.split('.').map(Number)
  const [majorB, minorB] = b.split('.').map(Number)
  return majorA - majorB || minorA - minorB
}

export function validate(data, { version, zipBytes }) {
  const errors = []
  const p = data.product ?? {}
  if (!isMapping(p)) {
    return ['product.yml: must be a mapping of keys']
  }

  for (const key of REQUIRED) {
    if (isBlank(p[key])) {
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
    if (!isMapping(text)) {
      errors.push(`dolistore/${lang}.md: invalid content`)
      continue
    }
    for (const [field, label] of [['title', 'title'], ['short', 'short description'], ['long', 'long description']]) {
      if (String(text[field] ?? '').trim() === '') {
        errors.push(`dolistore/${lang}.md: empty ${label} (${field})`)
      }
    }
  }

  if (!isBlank(p.categories)) {
    if (!Array.isArray(p.categories)) {
      errors.push('product.yml: "categories" must be a list')
    } else if (p.categories.length === 0) {
      errors.push('product.yml: at least one category is required')
    } else {
      if (p.categories.length > MAX_CATEGORIES) {
        errors.push(`At most ${MAX_CATEGORIES} categories, got ${p.categories.length}`)
      }
      for (const label of p.categories) {
        if (!Object.hasOwn(CATEGORIES, label)) {
          errors.push(`Unknown category "${label}" (exact DoliStore label required)`)
        }
      }
    }
  }

  const dol = p.dolibarr
  if (!isBlank(dol)) {
    if (!isMapping(dol)) {
      errors.push('product.yml: "dolibarr" must be a mapping with min and max')
    } else {
      for (const side of ['min', 'max']) {
        if (isBlank(dol[side])) {
          errors.push(`product.yml: "dolibarr.${side}" is missing`)
        } else if (!Object.hasOwn(DOLIBARR_VERSIONS, dol[side])) {
          errors.push(`Unknown Dolibarr version "${dol[side]}" for ${side} (V6 to V24)`)
        }
      }
      if (Object.hasOwn(DOLIBARR_VERSIONS, dol.min) && Object.hasOwn(DOLIBARR_VERSIONS, dol.max)
        && dolibarrNumber(dol.min) > dolibarrNumber(dol.max)) {
        errors.push(`Dolibarr min (${dol.min}) is greater than max (${dol.max})`)
      }
    }
  }

  const php = p.php
  if (!isBlank(php)) {
    if (!isMapping(php)) {
      errors.push('product.yml: "php" must be a mapping with min and max')
    } else {
      for (const side of ['min', 'max']) {
        if (isBlank(php[side])) {
          errors.push(`product.yml: "php.${side}" is missing`)
        } else if (!/^\d+\.\d+$/.test(String(php[side]))) {
          errors.push(`php.${side} must look like 7.4, got "${php[side]}"`)
        }
      }
      if (/^\d+\.\d+$/.test(String(php.min)) && /^\d+\.\d+$/.test(String(php.max))
        && comparePhp(String(php.min), String(php.max)) > 0) {
        errors.push(`php min (${php.min}) is greater than max (${php.max})`)
      }
    }
  }

  try {
    toStoreVersion(version)
  } catch (error) {
    errors.push(error.message)
  }
  if (zipBytes > MAX_ZIP_BYTES) {
    errors.push('The zip is larger than 80 MB (DoliStore limit)')
  }
  if ((data.screenshots || []).length > MAX_SCREENSHOTS) {
    errors.push(`At most ${MAX_SCREENSHOTS} screenshots, got ${data.screenshots.length}`)
  }
  return errors
}
