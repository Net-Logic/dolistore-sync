import { catalogueLink, pickRelated } from '../catalogue.mjs'
import { escapeHtml, toInlineHtml } from '../markdown.mjs'
import { bannerImage } from './banner.mjs'
import { DOLIBARR_MODULES, LANGUAGE_NAMES, TEXTS } from './i18n.mjs'
import { moduleName, parseLayoutBody } from './parse.mjs'

// netlogic.fr palette, in the only vocabulary DoliStore keeps: styles on <table> (width,
// border-collapse) and <td> (background-color, per-side border longhands, vertical-align, width).
// Stripped: every h2/strong/ol/ul/a style, td padding, border-spacing (by the editor, first dry run
// 2026-10-14), and the cellpadding/cellspacing attributes (by the server on save, live page of 792).
// So the tables carry no attribute at all, and the inner spacing is a nested table whose cell has
// thick borders of its own background colour. Gutters are white borders in collapsed tables (the
// public CSS forces "table { border-collapse:collapse; border-spacing:0 }").
const NAVY = '#324F9B'
const LIGHT_BLUE = '#F1F5FF'
const WHITE = '#ffffff'
// Every border is written per side with longhands only: DoliStore's CKEditor sorts the style
// properties alphabetically, so a shorthand followed by an override ("border:8px solid #fff;
// border-left:0") comes back as "border-color; border-left:0; border-style; border-width" and the
// left edge turns into an 8px black bar on the public page.
const side = (name, color, width) => `border-${name}-color:${color}; border-${name}-style:solid; border-${name}-width:${width}`
const gutter = (left, right) => [side('top', WHITE, '8px'), side('bottom', WHITE, '8px'), side('left', WHITE, left), side('right', WHITE, right)].join('; ')
// "Padding" that survives: a border of the cell's own colour on every side
const pad = (width) => ['top', 'right', 'bottom', 'left'].map((name) => side(name, LIGHT_BLUE, width)).join('; ')

export const STYLES = {
  table: 'width:100%; border-collapse:collapse',
  // White top and bottom borders: room around the heading (tables have no margin); navy left bar
  heading: `background-color:${LIGHT_BLUE}; ${side('top', WHITE, '8px')}; ${side('bottom', WHITE, '8px')}; ${side('left', NAVY, '6px')}`,
  headingInner: `background-color:${LIGHT_BLUE}; ${pad('10px')}`,
  // The tile background is on the outer cell too, so the tiles of a row have the same height.
  // No outer side border, so the tiles line up with the headings.
  cellLeft: `background-color:${LIGHT_BLUE}; ${gutter('0px', '8px')}; vertical-align:top; width:50%`,
  cellRight: `background-color:${LIGHT_BLUE}; ${gutter('8px', '0px')}; vertical-align:top; width:50%`,
  cellInner: `background-color:${LIGHT_BLUE}; ${pad('12px')}; vertical-align:top`,
  emptyCell: `${gutter('8px', '0px')}; vertical-align:top; width:50%`,
  box: `background-color:${LIGHT_BLUE}; ${gutter('0px', '0px')}`,
  boxInner: `background-color:${LIGHT_BLUE}; ${pad('12px')}`,
  // Banner: a white bottom border of the outer cell is the space before the intro; the inner cell
  // (a table of its own, so the two bottom borders never collapse into one) draws the navy line
  banner: side('bottom', WHITE, '14px'),
  bannerInner: side('bottom', NAVY, '3px'),
}

const table = (rows) => `<table style="${STYLES.table}">\n<tbody>\n${rows.join('\n')}\n</tbody>\n</table>`
// One cell holding a one-cell table: the inner cell's borders give the spacing around the content
const padded = (innerStyle, content) => table([`<tr>\n<td style="${innerStyle}">${content}</td>\n</tr>`])
const h2 = (text) => table([`<tr>\n<td style="${STYLES.heading}">\n${padded(STYLES.headingInner, `\n<h2>${text}</h2>\n`)}\n</td>\n</tr>`])
const ol = (items) => `<ol>\n${items.map((item) => `<li>${item}</li>`).join('\n')}\n</ol>`
const ul = (items) => `<ul>\n${items.map((item) => `<li>${item}</li>`).join('\n')}\n</ul>`
// The image on white at its natural size, left-aligned, a full-width navy line under it, then space
const banner = () => table([`<tr>\n<td style="${STYLES.banner}">\n${padded(STYLES.bannerInner, bannerImage())}\n</td>\n</tr>`])
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (all, key) => (key in values ? values[key] : all))

function featuresGrid(features) {
  const cells = features.map((f, i) => (
    `<td style="${i % 2 === 0 ? STYLES.cellLeft : STYLES.cellRight}">\n${padded(STYLES.cellInner, `<strong>${toInlineHtml(f.lead)}</strong><br>${toInlineHtml(f.text)}`)}\n</td>`
  ))
  if (cells.length % 2 === 1) {
    cells.push(`<td style="${STYLES.emptyCell}"></td>`)
  }
  const rows = []
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(`<tr>\n${cells[i]}\n${cells[i + 1]}\n</tr>`)
  }
  return table(rows)
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
  return [h2(t.requirements), table([`<tr>\n<td style="${STYLES.box}">\n${padded(STYLES.boxInner, `\n${ul(items)}\n`)}\n</td>\n</tr>`])]
}

// The third installation step (give the permissions) is left out when the descriptor declares none
function installation(text, context, t) {
  const install = context && context.hasRights === false ? t.install.slice(0, 2) : t.install
  const steps = install.map((step) => fill(step, { name: escapeHtml(moduleName(text.title)) }))
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
// The Net Logic banner comes first, the same in every language.
export function renderLayout({ lang, text, product, context = {} }) {
  const t = TEXTS[lang]
  const body = parseLayoutBody(text.long, lang)
  const parts = [banner()]
  parts.push(...body.intro.map((paragraph) => `<p>${toInlineHtml(paragraph)}</p>`))
  parts.push(h2(t.features), featuresGrid(body.features))
  if (body.how !== null) {
    parts.push(h2(t.how), ol(body.how.map(toInlineHtml)))
  }
  parts.push(...requirements(text, context, t, lang))
  parts.push(...installation(text, context, t))
  parts.push(...support(product, t, lang))
  return `${parts.join('\n')}\n`
}
