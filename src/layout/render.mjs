import { catalogueLink, pickRelated } from '../catalogue.mjs'
import { escapeHtml, toInlineHtml } from '../markdown.mjs'
import { DOLIBARR_MODULES, LANGUAGE_NAMES, TEXTS } from './i18n.mjs'
import { moduleName, parseLayoutBody } from './parse.mjs'

// netlogic.fr palette, in the only vocabulary DoliStore's CKEditor keeps (first CI dry run, 2026-10-14):
// styles on <table> (width, border-collapse) and <td> (background-color, border, vertical-align, width)
// only; h2/strong/ol/ul/a styles, td padding and border-spacing are stripped, so headings, lists and
// links stay plain. Inner spacing comes from the cellpadding attribute of <table>. Gutters cannot use
// cellspacing: the public page's CSS sets "table { border-collapse:collapse; border-spacing:0 }", which
// beats the attribute. They are white td borders in a collapsed table instead.
const NAVY = '#324F9B'
const LIGHT_BLUE = '#F1F5FF'
// Every border is written per side with longhands only: DoliStore's CKEditor sorts the style
// properties alphabetically, so a shorthand followed by an override ("border:8px solid #fff;
// border-left:0") comes back as "border-color; border-left:0; border-style; border-width" and the
// left edge turns into an 8px black bar on the public page.
const side = (name, width) => `border-${name}-color:#ffffff; border-${name}-style:solid; border-${name}-width:${width}`
const gutter = (left, right) => [side('top', '8px'), side('bottom', '8px'), side('left', left), side('right', right)].join('; ')

export const STYLES = {
  table: 'width:100%; border-collapse:collapse',
  // White top and bottom borders: room around the heading (tables have no margin); navy left bar
  heading: `background-color:${LIGHT_BLUE}; border-top-color:#ffffff; border-top-style:solid; border-top-width:8px; border-bottom-color:#ffffff; border-bottom-style:solid; border-bottom-width:8px; border-left-color:${NAVY}; border-left-style:solid; border-left-width:6px`,
  // No outer side border, so the cells line up with the headings
  cellLeft: `background-color:${LIGHT_BLUE}; ${gutter('0px', '8px')}; vertical-align:top; width:50%`,
  cellRight: `background-color:${LIGHT_BLUE}; ${gutter('8px', '0px')}; vertical-align:top; width:50%`,
  emptyCell: `${gutter('8px', '0px')}; vertical-align:top; width:50%`,
  box: `background-color:${LIGHT_BLUE}; ${gutter('0px', '0px')}`,
}

export const TABLE_ATTRIBUTES = {
  heading: 'cellpadding="10" cellspacing="0"',
  grid: 'cellpadding="12" cellspacing="0"',
  box: 'cellpadding="12" cellspacing="0"',
}

const table = (attributes, rows) => `<table ${attributes} style="${STYLES.table}">\n<tbody>\n${rows.join('\n')}\n</tbody>\n</table>`
const h2 = (text) => table(TABLE_ATTRIBUTES.heading, [`<tr>\n<td style="${STYLES.heading}">\n<h2>${text}</h2>\n</td>\n</tr>`])
const ol = (items) => `<ol>\n${items.map((item) => `<li>${item}</li>`).join('\n')}\n</ol>`
const ul = (items) => `<ul>\n${items.map((item) => `<li>${item}</li>`).join('\n')}\n</ul>`
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (all, key) => (key in values ? values[key] : all))

function featuresGrid(features) {
  const cells = features.map((f, i) => `<td style="${i % 2 === 0 ? STYLES.cellLeft : STYLES.cellRight}"><strong>${toInlineHtml(f.lead)}</strong><br>${toInlineHtml(f.text)}</td>`)
  if (cells.length % 2 === 1) {
    cells.push(`<td style="${STYLES.emptyCell}"></td>`)
  }
  const rows = []
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(`<tr>\n${cells[i]}\n${cells[i + 1]}\n</tr>`)
  }
  return table(TABLE_ATTRIBUTES.grid, rows)
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
  return [h2(t.requirements), table(TABLE_ATTRIBUTES.box, [`<tr>\n<td style="${STYLES.box}">\n${ul(items)}\n</td>\n</tr>`])]
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
  const parts = [h2(t.support), `<p>${fill(t.supportLine, { support: `<a href="mailto:${email}">${email}</a>`, days: escapeHtml(String(product.access_days ?? '')) })}</p>`]
  const related = pickRelated(product)
  if (related.length > 0) {
    parts.push(`<p><strong>${t.more}</strong></p>`)
    parts.push(ul(related.map((entry) => (
      `<a href="${escapeHtml(catalogueLink(entry.id, lang))}"><strong>${escapeHtml(entry.name[lang])}</strong></a> - ${escapeHtml(entry.tagline[lang])}`
    ))))
  }
  return parts
}

// Description of one language in the netlogic layout. The data must have passed validate():
// module text only goes through the safe inline Markdown renderer, the tags around it are fixed.
export function renderLayout({ lang, text, product, context = {} }) {
  const t = TEXTS[lang]
  const body = parseLayoutBody(text.long, lang)
  const parts = body.intro.map((paragraph) => `<p>${toInlineHtml(paragraph)}</p>`)
  parts.push(h2(t.features), featuresGrid(body.features))
  if (body.how !== null) {
    parts.push(h2(t.how), ol(body.how.map(toInlineHtml)))
  }
  parts.push(...requirements(text, context, t, lang))
  parts.push(...installation(text, t))
  parts.push(...support(product, t, lang))
  return `${parts.join('\n')}\n`
}
