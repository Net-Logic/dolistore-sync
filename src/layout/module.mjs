import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Folder names of the module's langs/ directory (en_US, fr_FR, ...), sorted
export function readInterfaceLangs(moduleDir) {
  const dir = join(moduleDir, 'langs')
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort()
}

// Module class names of the uncommented $this->depends line, [...] or array(...) syntax
// (keyed entries such as 'always1' => 'modX' give their value)
export function readDepends(descriptorSource) {
  const match = String(descriptorSource).match(/^[ \t]*\$this->depends\s*=\s*(\[[\s\S]*?\]|array\s*\([\s\S]*?\))\s*;/m)
  if (!match) {
    return []
  }
  return [...match[1].matchAll(/(['"])(mod\w+)\1/g)].map((m) => m[2])
}

// What the netlogic layout needs from the module beside dolistore/
export function loadLayoutContext(moduleDir, descriptorSource) {
  return {
    interfaceLangs: readInterfaceLangs(moduleDir),
    depends: readDepends(descriptorSource),
  }
}
