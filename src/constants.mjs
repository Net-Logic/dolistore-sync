export const LANGS = ['en', 'fr', 'de', 'it', 'es']

// Value of the <select name="version_min|version_max"> options of edit-module-product.php
export const DOLIBARR_VERSIONS = {
  V24: '120', V23: '116', V22: '112', V21: '101', V20: '100', V19: '98', V18: '97',
  V17: '96', V16: '95', V15: '94', V14: '93', V13: '92', V12: '91', V11: '90',
  V10: '89', V9: '109', V8: '108', V7: '107', V6: '106',
}

// Value of the <input type="checkbox" name="categories[]"> of the same form
export const CATEGORIES = {
  'Modules/Plugins': '67',
  'IA': '110',
  'GED - Gestion de documents': '70',
  'CRM - Gestion relation client': '68',
  'Comptabilité': '73',
  'Interfaçage externes': '74',
  'Produits, services ou stocks': '75',
  'Projets ou collaboratif': '76',
  'Reporting ou recherche': '77',
  'Interface utilisateurs': '78',
  'Portails ou ECommerce': '69',
  'POS (Point de Vente)': '71',
  'RH - Ressource humaines': '72',
  'Outils systèmes': '79',
  'Autres': '80',
  'Thèmes et modèles': '81',
  'Modèles de documents': '82',
  'Modèles de sites web': '84',
  'Thèmes': '83',
  'Documentation': '85',
  'Outils externes et appli mobiles': '86',
}

export const MAX_CATEGORIES = 3
// DoliStore enforces no visible limit (a public product shows 14 screenshots on 2026-10-15); 10 is the common ceiling
export const MAX_SCREENSHOTS = 10
export const MAX_ZIP_BYTES = 80 * 1024 * 1024

export function dolibarrNumber(label) {
  return Number.parseInt(String(label).slice(1), 10)
}
