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
