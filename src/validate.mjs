import {
  CATEGORIES, DOLIBARR_VERSIONS, MAX_CATEGORIES, MAX_SCREENSHOTS, MAX_ZIP_BYTES, dolibarrNumber,
} from './constants.mjs'
import { COVER_MODES } from './cover.mjs'
import { LAYOUTS, validateLayout } from './layout/checks.mjs'
import { SCREENSHOT_MODES } from './screenshots.mjs'
import { toStoreVersion } from './version.mjs'

// "price" is optional and ignored: it is managed on DoliStore and never sent
const REQUIRED = ['id', 'dolibarr', 'php', 'access_days', 'support', 'categories']

const isMapping = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
const isBlank = (value) => value === undefined || value === null || value === ''

// Compares "major.minor" strings as numbers, so 7.10 is greater than 7.9
function comparePhp(a, b) {
  const [majorA, minorA] = a.split('.').map(Number)
  const [majorB, minorB] = b.split('.').map(Number)
  return majorA - majorB || minorA - minorB
}

export const CREATE_STATUSES = ['submitted', 'disabled']

// create: true checks a NEW product (no id yet, price/status/terms/cover required); false checks an update
export function validate(data, { version, zipBytes, create = false }) {
  const errors = []
  const p = data.product ?? {}
  if (!isMapping(p)) {
    return ['product.yml: must be a mapping of keys']
  }

  for (const key of REQUIRED) {
    if (key === 'id' && create) {
      continue
    }
    if (isBlank(p[key])) {
      errors.push(`product.yml: "${key}" is missing`)
    }
  }
  if (create) {
    errors.push(...validateCreate(data))
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
        } else if (typeof php[side] !== 'string') {
          errors.push(`php.${side} must be quoted ("8.10")`)
        } else if (!/^\d+\.\d+$/.test(php[side])) {
          errors.push(`php.${side} must look like 7.4, got "${php[side]}"`)
        }
      }
      if (/^\d+\.\d+$/.test(String(php.min)) && /^\d+\.\d+$/.test(String(php.max))
        && comparePhp(String(php.min), String(php.max)) > 0) {
        errors.push(`php min (${php.min}) is greater than max (${php.max})`)
      }
    }
  }

  if (!isBlank(p.keywords) && !Array.isArray(p.keywords)) {
    errors.push('product.yml: "keywords" must be a list')
  }

  if (!isBlank(p.screenshots)) {
    if (!SCREENSHOT_MODES.includes(p.screenshots)) {
      errors.push(`product.yml: "screenshots" must be one of ${SCREENSHOT_MODES.join(', ')}, got "${p.screenshots}"`)
    } else if (p.screenshots === 'sync' && (data.screenshots || []).length === 0) {
      errors.push('product.yml: screenshots: sync needs at least one image in dolistore/screenshots')
    }
  }

  if (!isBlank(p.cover)) {
    if (!COVER_MODES.includes(p.cover)) {
      errors.push(`product.yml: "cover" must be one of ${COVER_MODES.join(', ')}, got "${p.cover}"`)
    } else if (p.cover === 'sync' && !data.cover) {
      errors.push('product.yml: cover: sync needs dolistore/cover.png (or .jpg)')
    }
  }

  // Opt-in description layout: without the key nothing below runs
  if (!isBlank(p.layout)) {
    if (!LAYOUTS.includes(p.layout)) {
      errors.push(`product.yml: "layout" must be one of ${LAYOUTS.join(', ')}, got "${p.layout}"`)
    } else {
      errors.push(...validateLayout(data))
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

// Extra rules of a creation: nothing is guessed, every legal and commercial choice is written in product.yml
export function validateCreate(data) {
  const errors = []
  const p = data.product ?? {}
  if (!isBlank(p.id)) {
    errors.push('product.yml: "id" is set, the product already exists: use the normal update (without --create)')
  }
  const c = p.create
  if (!isMapping(c)) {
    errors.push('product.yml: a "create" block (price, status, accept_terms) is required to create a product')
  } else {
    const price = typeof c.price === 'number' ? c.price : Number.NaN
    if (!Number.isFinite(price) || price < 0) {
      errors.push('product.yml: create.price must be a number >= 0 (euros excl. tax, 0 is free)')
    }
    if (!CREATE_STATUSES.includes(c.status)) {
      errors.push(`product.yml: create.status must be one of ${CREATE_STATUSES.join(', ')}`)
    }
    if (c.accept_terms !== true) {
      errors.push('product.yml: create.accept_terms must be true (the seller terms are required by DoliStore and are accepted only on this explicit setting)')
    }
    for (const key of ['accept_wiki_notice', 'core_include']) {
      if (c[key] !== undefined && typeof c[key] !== 'boolean') {
        errors.push(`product.yml: create.${key} must be true or false`)
      }
    }
  }
  if (!data.cover) {
    errors.push('dolistore/cover.png (or .jpg) is required: DoliStore needs a cover image')
  }
  return errors
}
