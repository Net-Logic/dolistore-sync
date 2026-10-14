# dolistore-sync

Updates the DoliStore product page of a Dolibarr module (texts, compatibility, version, zip) from the module repository, by driving the DoliStore seller form with Playwright.
The module repository holds a `dolistore/` folder: `product.yml` (id, Dolibarr and PHP ranges, support, categories, keywords) plus one Markdown file per language (`en.md`, `fr.md`, ...) with a front matter `title` and `short`.
Use the action `Net-Logic/dolistore-sync@main` with the inputs `module-path`, `descriptor`, `zip`, `dry-run`, `login` and `password`.
The two secrets `DOLISTORE_LOGIN` and `DOLISTORE_PASSWORD` must be set in GitHub and passed as `login` and `password`.
`dry-run` is `'true'` by default: the form is filled and a screenshot kept, nothing is submitted (every write request is aborted). The form is submitted only when `dry-run` is exactly the string `'false'`; any other value is a dry run.
On the command line a dry run is also the default: pass `--submit` to send the form (`--dry-run` is accepted as a no-op alias).
Screenshots masked: password/e-mail/login inputs, the page header and anything showing the login e-mail are masked (best effort; the form fields stay visible), and no error screenshot is taken when the login step fails.
`product.yml` may still contain `price`, but it is optional and ignored: the price is managed on DoliStore and never sent (the form keeps its prefilled value).
Pin the action to a tag or a commit SHA before using it on other modules.

A refusal by the DoliStore package validator (error box on the result page) shows its reasons in the job log.

## Screenshots (`dolistore/screenshots/`)

PNG/JPG/JPEG files in `dolistore/screenshots/` (at most 5, sorted by name) are the "Autres images" of the product. The optional `screenshots` key of `product.yml` chooses what to do with them:

- `if-empty` (default when the key is absent): the images are uploaded only when the product has none yet; existing images are never touched.
- `sync`: the product images are made identical to the repository, compared by content (sha256), in order. Running it twice in a row is a no-op. From the first image that differs, the remaining current images are deleted and the repository ones are uploaded. `sync` needs at least one image in the repository (it never deletes everything). Images added by hand on DoliStore are removed in this mode.

The dry run only reports what would be deleted and added; it performs no write. The cover image is never touched.

## Creating a new product

An update needs the `id` of an existing product. To create a new one, write `dolistore/product.yml` **without `id`** and with a `create` block, add `dolistore/cover.png` (or `.jpg`, required by DoliStore), then run the action with `create: 'true'` (manually, never on a release):

```yaml
create:
  price: 180              # euros excl. tax, 0 is free (only used for a creation, never sent by an update)
  status: submitted       # submitted (validated within 15 days) or disabled
  accept_terms: true      # the seller terms are accepted only on this explicit setting
  accept_wiki_notice: true
  core_include: false     # never on unless you write it
```

A dry run (default) fills the form and stops. A real run (`dry-run: 'false'`) uploads the zip and the cover, submits, then prints the id of the new product: write it in `product.yml` as `id:` and remove the `create` block; the next releases update the product. The extra screenshots are added afterwards through the normal update (`screenshots: sync`). A creation never runs twice by itself: if the run fails after the click, check DoliStore by hand before re-running.

## Cover image

By default the cover of the product is never touched. With `cover: sync` in `product.yml` and a file `dolistore/cover.png` (or `.jpg`), a run compares the bytes of the current cover with the file and uploads it with the form only when they differ (a second run changes nothing). A dry run only reports; a real run checks afterwards that DoliStore now shows the file.

## Description layout (`layout: netlogic`)

Without a `layout` key the long description is the Markdown body rendered as is. With `layout: netlogic` in `product.yml` the tool builds a styled description (netlogic.fr palette, inline styles only, no font change) and writes the repetitive sections itself, in each language. Any other `layout` value is refused.

The language files then follow a fixed shape:

```markdown
---
title: "Module name - what it does"   # the module name is the part before " - "
short: "At most 125 characters."
start: "Open a third-party card and click **Send reminders**."   # optional, last installation step
needs:                                                          # optional, extra prerequisites
  - "An online payment module, only for the payment link"
---
**Module name** does this and that (1 or 2 intro paragraphs, the first one holds the module name in bold).

## Features

- **Lead-in**: text of the feature.
- **Other lead-in**: text.

## How it works

1. First step.
2. Second step.
```

- The Features heading and the optional How it works heading are matched per language, without case or accents: Features / Fonctionnalités / Funktionen / Funzionalità / Funcionalidades, How it works / Fonctionnement / So funktioniert es / Come funziona / Cómo funciona (English is accepted in every file).
- Every language must have the same number of features and the same How it works (same number of steps).
- Requirements, Installation and Support sections are generated: writing one by hand is refused, and so is any other section.
- The text must not mention the Dolibarr or PHP versions (`V20`, `Dolibarr 21`, `PHP 8.1`...): DoliStore's info box shows them.

Generated sections:

- **Requirements**: interface languages from the module's `langs/` folder names, required Dolibarr modules from `$this->depends` of the descriptor (`[...]` or `array(...)`), then the `needs` lines. The section is left out when there is nothing to list.
- **Installation**: deploy the zip, enable the module, give the permissions, then the `start` line.
- **Support and updates**: the `support` e-mail and the `access_days`, then up to 4 links to other Net-Logic modules.

Section headings are light blue table cells with a navy left bar, features a two-column grid of light blue cells, Requirements a light blue box; How it works and Installation are plain numbered lists. Module text goes through the same safe Markdown renderer as before (bold, italic, code, safe links): raw HTML stays escaped.

The markup only uses what DoliStore keeps: styles on `<table>` (width, border-collapse) and `<td>` (background, per-side border longhands, vertical-align, width), and no table attribute at all. The editor strips every style on headings, bold text, lists and links, `td` padding and `border-spacing`, sorts each style's declarations alphabetically (so borders are written per side, never as a shorthand plus an override), and the server drops `cellpadding`/`cellspacing` when it saves. So headings and links take DoliStore's own colours, the inner spacing is a nested one-cell table whose cell has thick borders of its own background colour, and the gutters are white `td` borders in collapsed tables (the public CSS forces `border-collapse:collapse; border-spacing:0`).

### Related modules (`src/catalogue.mjs`)

The "More Net-Logic modules on DoliStore" links come from a catalogue of the Net-Logic products publicly active on DoliStore (DoliStore id, name and tagline per language, categories). The tool picks the modules sharing at least one category with the product, `Modules/Plugins` excepted, by number of shared categories then catalogue order, and fills up to 4 links with the other catalogue entries in catalogue order; the product itself is never listed. `related: [807, 1029]` in `product.yml` overrides the choice and the fill-up (`related: []` shows no link); an id that is not in the catalogue is refused. Add a product to the catalogue when its DoliStore page is live.

### Styles and attributes kept by DoliStore's editor

With a layout, the form fill also compares the HTML that DoliStore's CKEditor gives back with the HTML sent: every element's inline style and the `border`/`cellpadding`/`cellspacing` attributes of tables, after normalising case, spacing, declaration order, `rgb()` colours, `0px` and the border shorthands (CKEditor writes `border:8px solid #fff` as `border-color`/`border-style`/`border-width`). A stripped or changed style or attribute stops the run, dry run included, with the list of what was lost in every language. Without a layout only the text is compared, as before.

After a real submit with a layout (never in a dry run), the tool reads the public product page of every language anonymously and compares its description the same way. What DoliStore's server dropped on save is printed as a warning in the job log; the run does not fail and nothing is submitted again.

## Preview without DoliStore

```bash
node bin/dolistore-sync.mjs --module path/to/module --descriptor core/modules/modMyModule.class.php --preview out/preview
```

`--preview <dir>` checks the data like a run, then writes `<dir>/<lang>.html` for each language file: the description inside a page that looks like a DoliStore product page (`div.rte.fulldescription`, 870 px wide). No zip, no login, no browser, no network. It works with and without a layout.
