import { Marked } from 'marked'

const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// https, http, mailto, a single-slash absolute path or a fragment; anything else becomes '#'
const SAFE_URL = /^(https?:|mailto:|\/(?!\/)|#)/i
const safeUrl = (href) => (SAFE_URL.test(href || '') ? href : '#')

// marked <= 12 passes plain strings to renderers, >= 13 passes token objects
const marked = new Marked({
  gfm: true,
  renderer: {
    // Raw HTML typed in the markdown is shown as text
    html(arg) {
      return escapeHtml(typeof arg === 'string' ? arg : arg.text)
    },
    link(hrefOrToken, titleArg, textArg) {
      let href, label
      if (typeof hrefOrToken === 'string') {
        href = hrefOrToken
        label = textArg
      } else {
        href = hrefOrToken.href
        label = this.parser.parseInline(hrefOrToken.tokens)
      }
      return `<a href="${escapeHtml(safeUrl(href))}">${label}</a>`
    },
    image(hrefOrToken, titleArg, textArg) {
      const token = typeof hrefOrToken === 'string' ? { href: hrefOrToken, text: textArg } : hrefOrToken
      return `<img src="${escapeHtml(safeUrl(token.href))}" alt="${escapeHtml(token.text || '')}">`
    },
    heading(textOrToken, levelArg) {
      let text, depth
      if (typeof textOrToken === 'string') {
        text = textOrToken
        depth = levelArg
      } else {
        text = this.parser.parseInline(textOrToken.tokens)
        depth = textOrToken.depth
      }
      const level = Math.min(4, Math.max(2, depth))
      return `<h${level}>${text}</h${level}>\n`
    },
    del(textOrToken) {
      return typeof textOrToken === 'string' ? textOrToken : this.parser.parseInline(textOrToken.tokens)
    },
  },
})

export function toHtml(markdown) {
  return marked.parse(markdown, { async: false })
}
