import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { LANGS } from './constants.mjs'

export function parseLangFile(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    throw new Error('Language file without front matter (--- title / short ---)')
  }
  const meta = parse(match[1]) || {}
  return {
    title: String(meta.title ?? '').trim(),
    short: String(meta.short ?? '').trim(),
    long: match[2].trim(),
  }
}

export function loadModuleData(moduleDir) {
  const dir = join(moduleDir, 'dolistore')
  if (!existsSync(join(dir, 'product.yml'))) {
    throw new Error(`No dolistore/product.yml in ${moduleDir}`)
  }
  const product = parse(readFileSync(join(dir, 'product.yml'), 'utf8')) || {}
  const langs = {}
  for (const lang of LANGS) {
    const file = join(dir, `${lang}.md`)
    if (existsSync(file)) {
      langs[lang] = parseLangFile(readFileSync(file, 'utf8'))
    }
  }
  const shotsDir = join(dir, 'screenshots')
  const screenshots = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort().map((f) => join(shotsDir, f))
    : []
  const cover = ['png', 'jpg', 'jpeg'].map((ext) => join(dir, `cover.${ext}`)).find((f) => existsSync(f)) ?? null
  return { product, langs, screenshots, cover }
}
