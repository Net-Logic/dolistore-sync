import { decode } from 'he'
import { catalogueLink, pickRelated } from '../catalogue.mjs'
import { escapeHtml, toInlineHtml } from '../markdown.mjs'
import { DOLIBARR_MODULES, LANGUAGE_NAMES, TEXTS } from './i18n.mjs'
import { moduleName, normalizeHeading, parseLayoutBody } from './parse.mjs'

// netlogic.fr palette. Only inline styles (DoliStore keeps them), no font-family or font-size:
// the page keeps DoliStore's fonts. Red-orange is used by the related-module links only.
const NAVY = '#324F9B'
const LIGHT_BLUE = '#F1F5FF'
const RED_ORANGE = '#FF4939'

export const STYLES = {
  h2: `background-color:${NAVY}; color:#ffffff; padding:8px 14px; border-radius:5px; margin:24px 0 12px 0`,
  name: `color:${NAVY}`,
  grid: 'width:100%; border-collapse:collapse',
  // White 8px borders make the gutters; none on the outer sides, so the cells line up with the headings
  cell: `width:50%; background-color:${LIGHT_BLUE}; vertical-align:top; padding:12px 14px; border:8px solid #ffffff`,
  emptyCell: 'width:50%; border:8px solid #ffffff',
  left: 'border-left:0',
  right: 'border-right:0',
  box: 'width:100%; border-collapse:separate; border-spacing:0',
  boxCell: `background-color:${LIGHT_BLUE}; padding:12px 18px; border-radius:5px`,
  list: 'margin:0; padding-left:22px',
  related: `color:${RED_ORANGE}`,
}

const h2 = (text) => `<h2 style="${STYLES.h2}">${text}</h2>`
const ol = (items) => `<ol style="${STYLES.list}">\n${items.map((item) => `<li>${item}</li>`).join('\n')}\n</ol>`
const ul = (items) => `<ul style="${STYLES.list}">\n${items.map((item) => `<li>${item}</li>`).join('\n')}\n</ul>`
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (all, key) => (key in values ? values[key] : all))

// Bold module name in navy in the intro (any other bold stays plain)
function introParagraph(markdown, name) {
  const wanted = normalizeHeading(name)
  const html = toInlineHtml(markdown).replace(/<strong>([\s\S]*?)<\/strong>/g, (all, inner) => (
    normalizeHeading(decode(inner.replace(/<[^>]*>/g, ''))) === wanted ? `<strong style="${STYLES.name}">${inner}</strong>` : all
  ))
  return `<p>${html}</p>`
}

function featuresGrid(features) {
  const side = (i) => (i % 2 === 0 ? STYLES.left : STYLES.right)
  const cells = features.map((f, i) => `<td style="${STYLES.cell}; ${side(i)}"><strong style="${STYLES.name}">${toInlineHtml(f.lead)}</strong><br>${toInlineHtml(f.text)}</td>`)
  if (cells.length % 2 === 1) {
    cells.push(`<td style="${STYLES.emptyCell}; ${STYLES.right}"></td>`)
  }
  const rows = []
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(`<tr>\n${cells[i]}\n${cells[i + 1]}\n</tr>`)
  }
  return `<table style="${STYLES.grid}">\n<tbody>\n${rows.join('\n')}\n</tbody>\n</table>`
}

function languageNames(codes, lang) {
  const names = codes.map((code) => {
    const part = code.split(/[_-]/)[0].toLowerCase()
    return Object.hasOwn(LANGUAGE_NAMES, part) ? LANGUAGE_NAMES[part][lang] : code
  })
  return [...new Set(names)].sort(new Intl.Collator(lang).compare)
}

function moduleNames(depends, lang) {
  const names = depends.map((mod) => (Object.hasOwn(DOLIBARR_MODULES, mod) ? DOLIBARR_MODULES[mod][lang] : mod.replace(/^mod/, '')))
  return [...new Set(names)]
}

function requirements(text, context, t, lang) {
  const items = []
  const langs = languageNames(context.interfaceLangs || [], lang)
  if (langs.length > 0) {
    items.push(t.interfaceLangs + escapeHtml(langs.join(', ')))
  }
  const mods = moduleNames(context.depends || [], lang)
  if (mods.length > 0) {
    items.push(t.dependsOn + escapeHtml(mods.join(', ')))
  }
  for (const line of Array.isArray(text.needs) ? text.needs : []) {
    items.push(toInlineHtml(line))
  }
  if (items.length === 0) {
    return []
  }
  return [h2(t.requirements), `<table style="${STYLES.box}">\n<tbody>\n<tr>\n<td style="${STYLES.boxCell}">\n${ul(items)}\n</td>\n</tr>\n</tbody>\n</table>`]
}

function installation(text, t) {
  const steps = t.install.map((step) => fill(step, { name: escapeHtml(moduleName(text.title)) }))
  if (typeof text.start === 'string' && text.start.trim() !== '') {
    steps.push(toInlineHtml(text.start))
  }
  return [h2(t.installation), ol(steps)]
}

function support(product, t, lang) {
  const email = escapeHtml(String(product.support ?? ''))
  const parts = [h2(t.support), `<p>${fill(t.supportLine, { support: `<a href="mailto:${email}" style="${STYLES.name}">${email}</a>`, days: escapeHtml(String(product.access_days ?? '')) })}</p>`]
  const related = pickRelated(product)
  if (related.length > 0) {
    parts.push(`<p><strong>${t.more}</strong></p>`)
    parts.push(ul(related.map((entry) => (
      `<a href="${escapeHtml(catalogueLink(entry.id, lang))}" style="${STYLES.related}"><strong>${escapeHtml(entry.name[lang])}</strong></a> - ${escapeHtml(entry.tagline[lang])}`
    ))))
  }
  return parts
}

// Description of one language in the netlogic layout. The data must have passed validate():
// module text only goes through the safe inline Markdown renderer, the tags around it are fixed.
export function renderLayout({ lang, text, product, context = {} }) {
  const t = TEXTS[lang]
  const body = parseLayoutBody(text.long, lang)
  const name = moduleName(text.title)
  const parts = body.intro.map((paragraph) => introParagraph(paragraph, name))
  parts.push(h2(t.features), featuresGrid(body.features))
  if (body.how !== null) {
    parts.push(h2(t.how), ol(body.how.map(toInlineHtml)))
  }
  parts.push(...requirements(text, context, t, lang))
  parts.push(...installation(text, t))
  parts.push(...support(product, t, lang))
  return `${parts.join('\n')}\n`
}
