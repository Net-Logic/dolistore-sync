import { CATEGORIES, DOLIBARR_VERSIONS, LANGS } from './constants.mjs'
import { toHtml } from './markdown.mjs'
import { toStoreVersion } from './version.mjs'

export function buildFormValues(data, version) {
  const p = data.product
  const text = {
    version: toStoreVersion(version),
    phpmin: String(p.php.min),
    phpmax: String(p.php.max),
    validityduration: String(p.access_days),
    sale_price: String(p.price),
    contact_support: String(p.support),
    keywords: (p.keywords || []).join(', '),
  }
  for (const lang of LANGS) {
    const l = data.langs[lang]
    if (!l) {
      continue
    }
    text[`name_${lang}`] = l.title
    text[`short_description_${lang}`] = l.short
    text[`description_${lang}`] = toHtml(l.long)
  }
  return {
    text,
    selects: {
      version_min: DOLIBARR_VERSIONS[p.dolibarr.min],
      version_max: DOLIBARR_VERSIONS[p.dolibarr.max],
    },
    categories: p.categories.map((label) => CATEGORIES[label]),
  }
}
