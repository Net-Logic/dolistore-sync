export function readModuleVersion(descriptorSource) {
  const match = descriptorSource.match(/^[ \t]*\$this->version\s*=\s*'([0-9][^']*)'/m)
  if (!match) {
    throw new Error('Module version not found in the descriptor ($this->version = \'x.y.z\')')
  }
  return match[1]
}

export function toStoreVersion(version) {
  const converted = version.replace(/-/g, '.')
  if (!/^\d+(\.\d+){0,2}$/.test(converted)) {
    throw new Error(`Version "${version}" is not accepted by DoliStore: digits and dots only, x, x.y or x.y.z`)
  }
  return converted
}

export function assertZipMatchesVersion(zipPath, version) {
  const name = zipPath.split(/[\\/]/).pop()
  const expected = toStoreVersion(version)
  if (!name.endsWith(`-${expected}.zip`)) {
    throw new Error(`Zip name "${name}" does not match the descriptor version (expected a name ending with -${expected}.zip)`)
  }
}
