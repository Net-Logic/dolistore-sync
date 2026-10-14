import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadModuleData } from '../src/data.mjs'
import { buildFormValues } from '../src/form.mjs'
import { loadLayoutContext, readDepends, readInterfaceLangs } from '../src/layout/module.mjs'
import { renderLayout } from '../src/layout/render.mjs'

const fixtures = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures')
const fixture = join(fixtures, 'layoutmodule')
const descriptor = readFileSync(join(fixture, 'core/modules/modLayoutDemo.class.php'), 'utf8')

const layoutData = () => {
  const d = loadModuleData(fixture)
  d.layout = loadLayoutContext(fixture, descriptor)
  return d
}
const render = (d, lang) => renderLayout({ lang, text: d.langs[lang], product: d.product, context: d.layout })

test('without the layout key the description is the plain Markdown rendering, byte for byte', () => {
  const good = loadModuleData(join(fixtures, 'goodmodule'))
  const v = buildFormValues(good, '1.0.0')
  assert.equal(v.text.description_en, '<p>Set of <strong>libraries</strong> used by the other Net Logic modules.</p>\n')
  assert.equal(v.text.description_fr, '<p>Ensemble de <strong>librairies</strong> utilisées par les autres modules Net Logic.</p>\n')
  // The layout context is ignored when the key is absent
  const d = layoutData(); delete d.product.layout
  assert.doesNotMatch(buildFormValues(d, '1.2.3').text.description_en, /style=|Requirements/)
})

test('with the layout key the form gets the generated description', () => {
  const d = layoutData()
  const v = buildFormValues(d, '1.2.3')
  assert.equal(v.text.description_en, render(d, 'en'))
  assert.equal(v.text.description_fr, render(d, 'fr'))
})

test('interface languages come from the langs folder names, one per language', () => {
  assert.deepEqual(readInterfaceLangs(fixture), ['en_US', 'fr_BE', 'fr_FR', 'xx_YY'])
  assert.deepEqual(readInterfaceLangs(join(fixtures, 'goodmodule')), [])
})

test('depends are read in both array syntaxes, a commented line never wins', () => {
  assert.deepEqual(readDepends(descriptor), ['modFacture', 'modSociete', 'modFooBar'])
  assert.deepEqual(readDepends("<?php\n\t\t$this->depends = ['modFacture', \"modProjet\"];\n"), ['modFacture', 'modProjet'])
  assert.deepEqual(readDepends("<?php\n\t\t$this->depends = array('always1' => 'modTicket');\n"), ['modTicket'])
  assert.deepEqual(readDepends("<?php\n\t\t$this->depends = [];\n"), [])
  assert.deepEqual(readDepends('<?php\n'), [])
})

test('Requirements: localized interface languages and modules, unknown ones as is, then the needs lines', () => {
  const d = layoutData()
  const en = render(d, 'en')
  assert.match(en, />Requirements<\/h2>/)
  assert.match(en, /Interface languages: English, French, xx_YY/)
  assert.match(en, /Required Dolibarr modules: Invoices, Third parties, FooBar/)
  assert.match(en, /<li>An online payment module, only for the payment link<\/li>/)
  const fr = render(d, 'fr')
  assert.match(fr, />Prérequis<\/h2>/)
  assert.match(fr, /Langues de l'interface : anglais, français, xx_YY/)
  assert.match(fr, /Modules Dolibarr requis : Factures, Tiers, FooBar/)
  assert.match(fr, /Un module de paiement en ligne/)
  // Dolibarr and PHP ranges are shown by DoliStore, never repeated
  assert.doesNotMatch(en, /PHP|V20|V24/)
})

test('Requirements is left out when there is nothing to list', () => {
  const d = layoutData()
  d.layout = { interfaceLangs: [], depends: [] }
  delete d.langs.en.needs
  assert.doesNotMatch(render(d, 'en'), /Requirements/)
})

test('Installation: deploy, enable the module name, permissions, then the start line', () => {
  const d = layoutData()
  const en = render(d, 'en')
  assert.match(en, />Installation<\/h2>(\s*<\/td>\s*<\/tr>\s*<\/tbody>\s*<\/table>){2}\s*<ol>\s*<li>Deploy the zip with <strong>Home → Setup → Modules → Deploy an external module<\/strong>\.<\/li>\s*<li>Enable <strong>Layout Demo<\/strong>\.<\/li>\s*<li>Give the permissions to your users\.<\/li>\s*<li>Open a third-party card and click <strong>Send<\/strong>\.<\/li>\s*<\/ol>/)
  assert.match(render(d, 'fr'), /<li>Activez <strong>Démo mise en page<\/strong>\.<\/li>/)
  delete d.langs.en.start
  assert.equal((render(d, 'en').match(/<li>/g) || []).length, 3 + 3 + 3 + 4)
})

test('Support: e-mail, update days, then the related modules with their localized link', () => {
  const d = layoutData()
  const fr = render(d, 'fr')
  assert.match(fr, /Support par e-mail à <a href="mailto:dolibarr@netlogic\.fr">dolibarr@netlogic\.fr<\/a>\. Mises à jour incluses pendant 365 jours\./)
  assert.match(fr, /Autres modules Net-Logic sur DoliStore/)
  assert.match(fr, /<li><a href="https:\/\/www\.dolistore\.com\/product\.php\?id=792&amp;l=fr"><strong>Relance facture globale<\/strong><\/a> - Un seul e-mail/)
  // 792 shares 2 categories, 807 and 845 one, then the fill-up in catalogue order
  assert.deepEqual([...fr.matchAll(/product\.php\?id=(\d+)/g)].map((m) => m[1]), ['792', '807', '845', '647'])
  const none = layoutData(); none.product.related = []
  assert.doesNotMatch(render(none, 'en'), /More Net-Logic modules/)
})

const T = '<table style="width:100%; border-collapse:collapse">\n<tbody>\n<tr>\n'
const END = '\n</tr>\n</tbody>\n</table>'
const side = (name, color, width) => `border-${name}-color:${color}; border-${name}-style:solid; border-${name}-width:${width}`
const pad = (width) => ['top', 'right', 'bottom', 'left'].map((name) => side(name, '#F1F5FF', width)).join('; ')
const HEADING = `${T}<td style="background-color:#F1F5FF; ${side('top', '#ffffff', '8px')}; ${side('bottom', '#ffffff', '8px')}; ${side('left', '#324F9B', '6px')}">\n${T}<td style="background-color:#F1F5FF; ${pad('10px')}">\n<h2>Features</h2>\n</td>${END}\n</td>${END}`
const gutter = (left, right) => `${side('top', '#ffffff', '8px')}; ${side('bottom', '#ffffff', '8px')}; ${side('left', '#ffffff', left)}; ${side('right', '#ffffff', right)}`
const LEFT = `background-color:#F1F5FF; ${gutter('0px', '8px')}; vertical-align:top; width:50%`
const RIGHT = `background-color:#F1F5FF; ${gutter('8px', '0px')}; vertical-align:top; width:50%`
const INNER = `background-color:#F1F5FF; ${pad('12px')}; vertical-align:top`
const tile = (style, content) => `<td style="${style}">\n${T}<td style="${INNER}">${content}</td>${END}\n</td>`
const EMPTY = `<td style="${gutter('8px', '0px')}; vertical-align:top; width:50%"></td>`

test('styles: light blue heading cells with a navy left bar, tiles with white gutters, a light blue requirements box, spacing by nested cells', () => {
  const d = layoutData()
  const en = render(d, 'en')
  assert.ok(en.includes(HEADING), en.slice(0, 1500))
  assert.match(en, /<p><strong>Layout Demo<\/strong> sends one email with everything\.<\/p>/)
  assert.ok(en.includes(`${T}${tile(LEFT, '<strong>First feature</strong><br>the first text.')}\n${tile(RIGHT, '<strong>Second feature</strong><br>the second text with <code>code</code>.')}\n</tr>`))
  // 3 features: the 4th cell is empty, without background and without inner table
  assert.ok(en.includes(`${tile(LEFT, '<strong>Third feature</strong><br>the third text.')}\n${EMPTY}\n</tr>`))
  assert.ok(en.includes(`<h2>Requirements</h2>\n</td>${END}\n</td>${END}\n${T}<td style="background-color:#F1F5FF; ${gutter('0px', '0px')}">\n${T}<td style="background-color:#F1F5FF; ${pad('12px')}">\n<ul>\n<li>Interface languages`))
  assert.ok(en.includes(`<h2>How it works</h2>\n</td>${END}\n</td>${END}\n<ol>\n<li>Open the card.</li>`))
})

test('no generated table carries an attribute other than style (the server strips cellpadding and cellspacing)', () => {
  const en = render(layoutData(), 'en')
  const tables = [...en.matchAll(/<table\b([^>]*)>/g)].map((m) => m[1])
  assert.ok(tables.length > 10)
  for (const attrs of tables) {
    assert.equal(attrs, ' style="width:100%; border-collapse:collapse"')
  }
  assert.doesNotMatch(en, /cellpadding|cellspacing/)
  for (const m of en.matchAll(/<td\b([^>]*)>/g)) {
    assert.match(m[1], /^ style="[^"]*"$/)
  }
})

test('only the styles DoliStore\'s editor keeps: on table and td, from its allowed list', () => {
  const en = render(layoutData(), 'en')
  const allowed = {
    table: ['width', 'border-collapse'],
    td: ['background-color', 'border-right-color', 'border-right-style', 'border-right-width', 'border-top-color', 'border-top-style', 'border-top-width',
      'border-bottom-color', 'border-bottom-style', 'border-bottom-width',
      'border-left-color', 'border-left-style', 'border-left-width', 'vertical-align', 'width'],
  }
  const styled = [...en.matchAll(/<(\w+)[^>]*\sstyle="([^"]*)"/g)]
  assert.ok(styled.length > 10)
  for (const [, tag, style] of styled) {
    assert.ok(Object.hasOwn(allowed, tag), `style on <${tag}>`)
    for (const decl of style.split(';')) {
      assert.ok(allowed[tag].includes(decl.split(':')[0].trim()), `${tag}: ${decl}`)
    }
  }
  assert.doesNotMatch(en, /#FF4939|[;"\s]color\s*:|[;"\s]padding\s*:|margin|border-spacing|border-radius|font-|cellspacing|cellpadding/i)
  assert.doesNotMatch(en, /<(h2|ol|ul|li|strong|a|p|span)\s[^>]*style=/)
})

test('an even number of features leaves no empty cell', () => {
  const d = layoutData()
  d.langs.en.long = d.langs.en.long.replace('- **Third feature**: the third text.\n', '')
  assert.ok(!render(d, 'en').includes(EMPTY))
})

test('module text never injects HTML: a script tag in a feature stays text, unsafe links are neutralised', () => {
  const d = layoutData()
  d.langs.en.long = d.langs.en.long
    .replace('the first text.', 'evil <script>alert(1)</script> [x](javascript:alert(1))')
    .replace('**Layout Demo**', '**Layout Demo** <img src=x onerror=alert(1)>')
  d.langs.en.needs = ['<b>bold</b>']
  d.langs.en.start = '<iframe src="x">'
  d.langs.en.title = 'Layout <i>Demo</i> - x'
  d.langs.en.long = d.langs.en.long.replace('**Layout Demo**', '**Layout <i>Demo</i>**')
  const en = render(d, 'en')
  assert.doesNotMatch(en, /<script|<img|<iframe|<b>|<i>|javascript:/i)
  assert.match(en, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(en, /&lt;b&gt;bold&lt;\/b&gt;/)
  assert.match(en, /&lt;iframe/)
  assert.match(en, /Enable <strong>Layout &lt;i&gt;Demo&lt;\/i&gt;<\/strong>/)
})

// DoliStore's CKEditor sorts the declarations of a style alphabetically: the borders of every
// generated cell must mean the same thing in both orders (a shorthand followed by a side override
// turned the outer edges into black bars on the public page, 2026-10-14).
function resolveBorders(style) {
  const sides = ['top', 'right', 'bottom', 'left']
  const state = Object.fromEntries(sides.map((s) => [s, { color: 'currentcolor', style: 'none', width: 'medium' }]))
  for (const decl of style.split(';').map((d) => d.trim()).filter(Boolean)) {
    const [prop, ...rest] = decl.split(':')
    const value = rest.join(':').trim()
    const m = prop.trim().match(/^border(?:-(top|right|bottom|left))?(?:-(color|style|width))?$/)
    if (!m) continue
    const targets = m[1] ? [m[1]] : sides
    for (const t of targets) {
      if (m[2]) {
        state[t][m[2]] = value
      } else {
        // shorthand: unspecified parts reset to their initial values
        state[t] = { color: 'currentcolor', style: 'none', width: 'medium' }
        for (const part of value.split(/\s+/)) {
          if (/^(solid|none|dashed|dotted|double)$/.test(part)) state[t].style = part
          else if (/^(\d+(px)?|0|thin|medium|thick)$/.test(part)) state[t].width = part
          else state[t].color = part
        }
      }
    }
  }
  return JSON.stringify(state)
}

test('every generated cell keeps its borders when DoliStore sorts the declarations alphabetically', () => {
  const html = render(layoutData(), 'en')
  const styles = [...html.matchAll(/<td style="([^"]*)"/g)].map((m) => m[1])
  assert.ok(styles.length > 0)
  // The nested padding cells (heading 10px, tiles and box 12px) are covered too
  assert.ok(styles.filter((style) => style.includes('border-left-color:#F1F5FF; border-left-style:solid; border-left-width:10px')).length >= 5)
  assert.ok(styles.filter((style) => style.includes('border-left-color:#F1F5FF; border-left-style:solid; border-left-width:12px')).length === 4)
  for (const style of styles) {
    const sorted = style.split(';').map((d) => d.trim()).filter(Boolean).sort().join('; ')
    assert.equal(resolveBorders(sorted), resolveBorders(style), `borders change once sorted: ${style}`)
    assert.doesNotMatch(style, /(^|;\s*)border(-(top|right|bottom|left))?\s*:/, `no border shorthand: ${style}`)
  }
})
