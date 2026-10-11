# dolistore-sync

Updates the DoliStore product page of a Dolibarr module (texts, compatibility, version, zip) from the module repository, by driving the DoliStore seller form with Playwright.
The module repository holds a `dolistore/` folder: `product.yml` (id, Dolibarr and PHP ranges, price, support, categories, keywords) plus one Markdown file per language (`en.md`, `fr.md`, ...) with a front matter `title` and `short`.
Use the action `Net-Logic/dolistore-sync@main` with the inputs `module-path`, `descriptor`, `zip`, `dry-run`, `login` and `password`.
The two secrets `DOLISTORE_LOGIN` and `DOLISTORE_PASSWORD` must be set in GitHub and passed as `login` and `password`.
`dry-run` is `'true'` by default: the form is filled and a screenshot kept, nothing is submitted (every write request is aborted). The form is submitted only when `dry-run` is exactly the string `'false'`; any other value is a dry run.
On the command line a dry run is also the default: pass `--submit` to send the form (`--dry-run` is accepted as a no-op alias).
Screenshots masked: password/e-mail/login inputs, the page header and anything showing the login e-mail are masked (best effort; the form fields stay visible), and no error screenshot is taken when the login step fails.
Pin the action to a tag or a commit SHA before using it on other modules.
