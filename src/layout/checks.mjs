import { LANGS } from '../constants.mjs'
import { MAX_RELATED, catalogueEntry } from '../catalogue.mjs'
import { moduleName, normalizeHeading, parseLayoutBody } from './parse.mjs'

export const LAYOUTS = ['netlogic']

export const MAX_SHORT = 125

// DoliStore's info box already shows the Dolibarr and PHP ranges: no range, no "V20" token and no PHP
// version in the text. A Dolibarr version used as a condition stays allowed ("from Dolibarr 23",
// "Dolibarr 21 and later"): some features only exist on some versions.
const VERSION_MENTIONS = [
  /\bv\d{2}\b/gi,
  /\bDolibarr\s*v?\d+(?:\.\d+)*\s*(?:-|–|—|to|à|a|al|au|bis|jusqu'(?:à|au))\s*v?\d+(?:\.\d+)*/gi,
  /\bDolibarr\s*[<>≤≥=]+\s*v?\d+(?:\.\d+)*/gi,
  /\bPHP\s*(?:[<>≤≥=]+\s*)?v?[5-9](?:\.\d+)*\b/gi,
]

const isMapping = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
const isLine = (value) => typeof value === 'string' && value.trim() !== '' && !/[\r\n]/.test(value)

// Every problem of every language at once (validate() lists them all before refusing)
export function validateLayout(data) {
  const errors = []
  const p = data.product
  const parsed = {}
  for (const lang of LANGS) {
    const text = data.langs?.[lang]
    if (!isMapping(text)) {
      continue
    }
    const file = `dolistore/${lang}.md`
    const body = parseLayoutBody(text.long, lang)
    parsed[lang] = body
    for (const problem of body.errors) {
      errors.push(`${file}: ${problem}`)
    }
    const name = moduleName(text.title)
    if (body.intro.length > 0 && name && !body.introBold.some((bold) => normalizeHeading(bold) === normalizeHeading(name))) {
      errors.push(`${file}: the first intro paragraph must contain the module name in bold (**${name}**)`)
    }
    if (text.start !== undefined && !isLine(text.start)) {
      errors.push(`${file}: "start" must be one line of text`)
    }
    if (text.needs !== undefined && !(Array.isArray(text.needs) && text.needs.every(isLine))) {
      errors.push(`${file}: "needs" must be a list of lines`)
    }
    const short = String(text.short ?? '')
    if ([...short].length > MAX_SHORT) {
      errors.push(`${file}: the short description has ${[...short].length} characters, at most ${MAX_SHORT}`)
    }
    const written = [text.long, isLine(text.start) ? text.start : '', ...(Array.isArray(text.needs) ? text.needs.filter(isLine) : [])].join('\n')
    for (const pattern of VERSION_MENTIONS) {
      for (const match of written.matchAll(pattern)) {
        errors.push(`${file}: remove the version mention "${match[0].trim()}" (DoliStore shows the Dolibarr and PHP ranges)`)
      }
    }
  }

  errors.push(...compareLanguages(parsed))
  errors.push(...validateRelated(p))
  return errors
}

// Same number of features, same presence of How it works (and same number of steps) everywhere
function compareLanguages(parsed) {
  const errors = []
  const langs = Object.keys(parsed)
  const list = (fn) => langs.map((lang) => `${lang}: ${fn(parsed[lang])}`).join(', ')
  if (new Set(langs.map((lang) => parsed[lang].featureCount)).size > 1) {
    errors.push(`Features: every language must have the same number of features (${list((b) => b.featureCount)})`)
  }
  const withHow = langs.filter((lang) => parsed[lang].how !== null)
  if (withHow.length > 0 && withHow.length < langs.length) {
    errors.push(`How it works: present in ${withHow.join(', ')}, missing in ${langs.filter((lang) => !withHow.includes(lang)).join(', ')}`)
  } else if (withHow.length > 0 && new Set(langs.map((lang) => parsed[lang].how.length)).size > 1) {
    errors.push(`How it works: every language must have the same number of How it works steps (${list((b) => b.how.length)})`)
  }
  return errors
}

function validateRelated(p) {
  if (p.related === undefined || p.related === null) {
    return []
  }
  if (!Array.isArray(p.related)) {
    return ['product.yml: "related" must be a list of DoliStore ids']
  }
  const errors = []
  if (p.related.length > MAX_RELATED) {
    errors.push(`product.yml: at most ${MAX_RELATED} related ids, got ${p.related.length}`)
  }
  for (const id of p.related) {
    if (String(id) === String(p.id)) {
      errors.push(`product.yml: related id ${id} is the product itself`)
    } else if (!catalogueEntry(id)) {
      errors.push(`product.yml: related id ${id} is not in the Net-Logic catalogue (src/catalogue.mjs)`)
    }
  }
  return errors
}
