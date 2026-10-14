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
  assert.match(en, />Installation<\/h2>\s*<ol[^>]*>\s*<li>Deploy the zip with <strong>Home → Setup → Modules → Deploy an external module<\/strong>\.<\/li>\s*<li>Enable <strong>Layout Demo<\/strong>\.<\/li>\s*<li>Give the permissions to your users\.<\/li>\s*<li>Open a third-party card and click <strong>Send<\/strong>\.<\/li>\s*<\/ol>/)
  assert.match(render(d, 'fr'), /<li>Activez <strong>Démo mise en page<\/strong>\.<\/li>/)
  delete d.langs.en.start
  assert.equal((render(d, 'en').match(/<li>/g) || []).length, 3 + 3 + 3 + 4)
})

test('Support: e-mail, update days, then the related modules with their localized link', () => {
  const d = layoutData()
  const fr = render(d, 'fr')
  assert.match(fr, /Support par e-mail à <a href="mailto:dolibarr@netlogic\.fr" style="color:#324F9B">dolibarr@netlogic\.fr<\/a>\. Mises à jour incluses pendant 365 jours\./)
  assert.match(fr, /Autres modules Net-Logic sur DoliStore/)
  assert.match(fr, /<li><a href="https:\/\/www\.dolistore\.com\/product\.php\?id=792&amp;l=fr" style="color:#FF4939"><strong>Relance facture globale<\/strong><\/a> - Un seul e-mail/)
  // 792 shares 2 categories, 807 and 845 one, then the fill-up in catalogue order
  assert.deepEqual([...fr.matchAll(/product\.php\?id=(\d+)/g)].map((m) => m[1]), ['792', '807', '845', '647'])
  const none = layoutData(); none.product.related = []
  assert.doesNotMatch(render(none, 'en'), /More Net-Logic modules/)
})

test('styles: navy headings, feature cells with white gutters, light blue requirements, red-orange only in the related links', () => {
  const d = layoutData()
  const en = render(d, 'en')
  assert.match(en, /<h2 style="background-color:#324F9B; color:#ffffff; padding:8px 14px; border-radius:5px; margin:24px 0 12px 0">Features<\/h2>/)
  assert.doesNotMatch(en, /font-family|font-size/)
  assert.match(en, /<p><strong style="color:#324F9B">Layout Demo<\/strong> sends one email with everything\.<\/p>/)
  assert.match(en, /<table style="width:100%; border-collapse:collapse">/)
  assert.match(en, /<td style="width:50%; background-color:#F1F5FF; vertical-align:top; padding:12px 14px; border:8px solid #ffffff; border-left:0"><strong style="color:#324F9B">First feature<\/strong><br>the first text\.<\/td>/)
  assert.match(en, /the second text with <code>code<\/code>\./)
  // 3 features: the 4th cell is empty, without background
  assert.match(en, /<td style="width:50%; border:8px solid #ffffff; border-right:0"><\/td>/)
  assert.match(en, /Second feature<\/strong>/)
  assert.match(en, /border:8px solid #ffffff; border-right:0"><strong style="color:#324F9B">Second feature/)
  assert.equal((en.match(/background-color:#F1F5FF; vertical-align:top/g) || []).length, 3)
  assert.match(en, /background-color:#F1F5FF; padding:12px 18px; border-radius:5px/)
  assert.match(en, />How it works<\/h2>\s*<ol[^>]*>\s*<li>Open the card\.<\/li>/)
  const redOrange = en.match(/#FF4939/g) || []
  assert.equal(redOrange.length, 4)
  assert.equal((en.match(/<a [^>]*style="color:#FF4939"/g) || []).length, 4)
})

test('an even number of features leaves no empty cell', () => {
  const d = layoutData()
  d.langs.en.long = d.langs.en.long.replace('- **Third feature**: the third text.\n', '')
  assert.doesNotMatch(render(d, 'en'), /<td style="width:50%; border:8px solid #ffffff; border-right:0"><\/td>/)
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
