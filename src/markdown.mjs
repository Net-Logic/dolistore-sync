import { Marked } from 'marked'

const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// marked <= 12 passes plain strings to renderers, >= 13 passes token objects
const marked = new Marked({
  gfm: true,
  renderer: {
    // Raw HTML typed in the markdown is shown as text
    html(arg) {
      return escapeHtml(typeof arg === 'string' ? arg : arg.text)
    },
    link(hrefOrToken, titleArg, textArg) {
      let href, title, label
      if (typeof hrefOrToken === 'string') {
        href = hrefOrToken
        title = titleArg
        label = textArg
      } else {
        href = hrefOrToken.href
        title = hrefOrToken.title
        label = this.parser.parseInline(hrefOrToken.tokens)
      }
      const safe = /^(https?:|mailto:|\/|#)/i.test(href || '') ? href : '#'
      return `<a href="${escapeHtml(safe)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${label}</a>`
    },
  },
})

export function toHtml(markdown) {
  return marked.parse(markdown, { async: false })
}
