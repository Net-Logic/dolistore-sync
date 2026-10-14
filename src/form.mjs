import { CATEGORIES, DOLIBARR_VERSIONS, LANGS } from './constants.mjs'
import { toHtml } from './markdown.mjs'
import { renderLayout } from './layout/render.mjs'
import { toStoreVersion } from './version.mjs'

// The price is never sent: it stays managed on DoliStore (the form keeps its prefilled value)
export function buildFormValues(data, version) {
  const p = data.product
  const text = {
    version: toStoreVersion(version),
    phpmin: String(p.php.min),
    phpmax: String(p.php.max),
    validityduration: String(p.access_days),
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
    // data.layout (langs/ folders, depends) is loaded by the caller when product.yml has a layout
    text[`description_${lang}`] = p.layout === 'netlogic'
      ? renderLayout({ lang, text: l, product: p, context: data.layout })
      : toHtml(l.long)
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

// Creation only: the price and the choices that the update never sends (the price is a number of euros, dot decimal)
export function buildCreateValues(data) {
  const c = data.product.create
  return {
    price: Number(c.price).toFixed(2),
    status: c.status,
    acceptTerms: c.accept_terms === true,
    wikiNotice: c.accept_wiki_notice === true,
    coreInclude: c.core_include === true,
  }
}
