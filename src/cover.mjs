export const COVER_MODES = ['keep', 'sync']

// "keep" (default): the cover on DoliStore is never touched. "sync": it becomes dolistore/cover.(png|jpg|jpeg)
export function coverMode(product) {
  return product?.cover ?? 'keep'
}

// Pure plan: upload only when the bytes differ, so a run twice in a row is a no-op
export function planCover({ mode, currentHash, desiredHash }) {
  if (!COVER_MODES.includes(mode)) {
    throw new Error(`unknown cover mode "${mode}"`)
  }
  if (mode === 'keep') {
    return { upload: false, reason: 'cover not managed (cover: keep)' }
  }
  if (!desiredHash) {
    throw new Error('cover: sync needs dolistore/cover.png (or .jpg) in the repository')
  }
  if (currentHash === desiredHash) {
    return { upload: false, reason: 'cover already identical' }
  }
  return { upload: true, reason: currentHash ? 'cover differs' : 'product has no cover' }
}
