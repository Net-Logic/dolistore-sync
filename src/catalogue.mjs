// Net-Logic products on DoliStore (editor "NET LOGIC"), linked from the "More Net-Logic modules" list of
// the netlogic layout. Only products publicly active on DoliStore. Sources: (a) a local dolistore/
// folder, (b) the dolistore/ folder of the GitHub repo, (c) the public DoliStore page (names, and the
// categories from the public category listings). The name is the title before " - " (English when the
// product has no text in a language); the tagline is a short neutral form of the "short" text.
// Catalogue order is the tie-break and the fill-up order of the choice: keep it stable.
// Left out on 2026-10-14, not publicly active: 659 Yousign REST-V3 (disabled), 1512 DoliEsign
// (deactivated by the developer), 3707 Order to suppliers and 3710 Office Editor ("no more available",
// not validated yet). Add them when their page is live.
export const CATALOGUE = [
  {
    id: 647, // microsoftgraph (a)
    categories: ['Modules/Plugins', 'Interfaçage externes', 'Outils systèmes'],
    name: { en: 'Doli 365', fr: 'Doli 365', de: 'Doli 365', it: 'Doli 365', es: 'Doli 365' },
    tagline: {
      en: 'Dolibarr emails through Microsoft 365, mail collection, Outlook calendar and contact sync',
      fr: 'E-mails Dolibarr via Microsoft 365, collecte du courrier, agendas et contacts Outlook',
      de: 'Dolibarr-E-Mails über Microsoft 365, E-Mail-Abruf, Outlook-Kalender- und Kontaktsync',
      it: 'Email di Dolibarr tramite Microsoft 365, raccolta posta, sync calendari e contatti Outlook',
      es: 'Correos de Dolibarr vía Microsoft 365, recogida de correo, sincronización de Outlook',
    },
  },
  {
    id: 807, // emailtemplatemgr (a)
    categories: ['Modules/Plugins', 'CRM - Gestion relation client', 'Outils systèmes'],
    name: { en: 'Email Template Manager', fr: 'Email Template Manager', de: 'Email Template Manager', it: 'Email Template Manager', es: 'Email Template Manager' },
    tagline: {
      en: 'Default sender, recipients and template in the Dolibarr email form',
      fr: 'Expéditeur, destinataires et modèle par défaut dans le formulaire d\'e-mail de Dolibarr',
      de: 'Standardabsender, -empfänger und -vorlage im E-Mail-Formular von Dolibarr',
      it: 'Mittente, destinatari e modello predefiniti nel modulo di invio email di Dolibarr',
      es: 'Remitente, destinatarios y plantilla por defecto en el formulario de correo de Dolibarr',
    },
  },
  {
    id: 1029, // imagegallery (a)
    categories: ['Modules/Plugins', 'GED - Gestion de documents', 'Interface utilisateurs'],
    name: { en: 'Image Gallery', fr: 'Galerie d\'images', de: 'Bildergalerie', it: 'Galleria immagini', es: 'Galería de imágenes' },
    tagline: {
      en: 'Images attached to any Dolibarr object as a gallery with thumbnails and a slideshow',
      fr: 'Images jointes à tout objet Dolibarr en galerie avec miniatures et diaporama',
      de: 'An Dolibarr-Objekte angehängte Bilder als Galerie mit Vorschaubildern und Diashow',
      it: 'Immagini allegate a qualsiasi oggetto Dolibarr in galleria con miniature e presentazione',
      es: 'Imágenes adjuntas a cualquier objeto de Dolibarr en galería con miniaturas y presentación',
    },
  },
  {
    id: 1246, // googlerecaptcha (a)
    categories: ['Modules/Plugins', 'Outils systèmes', 'Interfaçage externes'],
    name: { en: 'Google reCAPTCHA v3', fr: 'Google reCAPTCHA v3', de: 'Google reCAPTCHA v3', it: 'Google reCAPTCHA v3', es: 'Google reCAPTCHA v3' },
    tagline: {
      en: 'Invisible Google reCAPTCHA v3 on the login page and the public forms',
      fr: 'reCAPTCHA v3 invisible de Google sur la page de connexion et les formulaires publics',
      de: 'Unsichtbares Google reCAPTCHA v3 für die Anmeldeseite und die öffentlichen Formulare',
      it: 'reCAPTCHA v3 invisibile di Google sulla pagina di accesso e sui moduli pubblici',
      es: 'reCAPTCHA v3 invisible de Google en la página de acceso y los formularios públicos',
    },
  },
  {
    id: 792, // relancefactureglobale (a)
    categories: ['Modules/Plugins', 'Comptabilité', 'CRM - Gestion relation client'],
    name: { en: 'Global Invoice Reminder', fr: 'Relance facture globale', de: 'Globale Zahlungserinnerung', it: 'Sollecito globale fatture', es: 'Recordatorio global de facturas' },
    tagline: {
      en: 'One reminder email with all the unpaid invoices of a customer and their PDF',
      fr: 'Un seul e-mail de relance avec toutes les factures impayées d\'un client et leurs PDF',
      de: 'Eine einzige Zahlungserinnerung mit allen offenen Rechnungen eines Kunden als PDF',
      it: 'Un\'unica e-mail di sollecito con tutte le fatture non pagate di un cliente e i PDF',
      es: 'Un único correo de recordatorio con todas las facturas impagadas de un cliente y sus PDF',
    },
  },
  {
    id: 846, // dolitrashcan (a)
    categories: ['Modules/Plugins', 'GED - Gestion de documents', 'Outils systèmes'],
    name: { en: 'Trash for Dolibarr', fr: 'Corbeille pour Dolibarr', de: 'Papierkorb für Dolibarr', it: 'Cestino per Dolibarr', es: 'Papelera para Dolibarr' },
    tagline: {
      en: 'Files deleted from any document area are kept in a trash, to restore or delete for good',
      fr: 'Les fichiers supprimés de toute zone de documents restent dans une corbeille, restaurables',
      de: 'Gelöschte Dateien aller Dokumentbereiche bleiben im Papierkorb und sind wiederherstellbar',
      it: 'I file eliminati da qualsiasi area documenti restano in un cestino, ripristinabili',
      es: 'Los archivos eliminados de cualquier zona de documentos van a una papelera, restaurables',
    },
  },
  {
    id: 845, // dolidocusign (a: dolistore/ folder since 2026-10-15)
    categories: ['Modules/Plugins', 'CRM - Gestion relation client', 'Interfaçage externes'],
    name: { en: 'DoliDocuSign', fr: 'DoliDocuSign', de: 'DoliDocuSign', it: 'DoliDocuSign', es: 'DoliDocuSign' },
    tagline: {
      en: 'Proposals, orders, contracts and more signed with DocuSign, the signed PDF stored back',
      fr: 'Propositions, commandes, contrats et plus signés avec DocuSign, PDF signé récupéré',
      de: 'Angebote, Aufträge, Verträge und mehr mit DocuSign signieren, signiertes PDF zurück',
      it: 'Preventivi, ordini, contratti e altro firmati con DocuSign, PDF firmato salvato',
      es: 'Presupuestos, pedidos, contratos y más firmados con DocuSign, PDF firmado guardado',
    },
  },
  {
    id: 378, // productsalepricebyproject (c: no dolistore/ folder)
    categories: ['Modules/Plugins', 'Produits, services ou stocks', 'Projets ou collaboratif'],
    name: { en: 'Product prices per project', fr: 'Prix produits par projet', de: 'Produktpreise pro Projekt', it: 'Prezzi dei prodotti per progetto', es: 'Precios de productos por proyecto' },
    tagline: {
      en: 'Specific product prices per project, for tenders with unit price schedules',
      fr: 'Prix de produits spécifiques par projet, pour les appels d\'offres avec bordereau de prix',
      de: 'Projektspezifische Produktpreise, für Ausschreibungen mit Einheitspreislisten',
      it: 'Prezzi dei prodotti specifici per progetto, per gare d\'appalto con listini prezzi unitari',
      es: 'Precios de productos específicos por proyecto, para licitaciones con cuadros de precios',
    },
  },
  {
    id: 646, // prune (a: prune-dolistore-pilot, en and fr only), last: a library the other modules need
    categories: ['Modules/Plugins', 'Outils systèmes', 'Interfaçage externes'],
    name: { en: 'Prune libraries', fr: 'Librairies Prune', de: 'Prune libraries', it: 'Prune libraries', es: 'Prune libraries' },
    tagline: {
      en: 'Shared libraries used by the other Net-Logic modules',
      fr: 'Librairies communes utilisées par les autres modules Net-Logic',
      de: 'Gemeinsame Bibliotheken für die anderen Net-Logic-Module',
      it: 'Librerie comuni usate dagli altri moduli Net-Logic',
      es: 'Bibliotecas comunes usadas por los demás módulos de Net-Logic',
    },
  },
]

// Every product has this category: sharing it means nothing
const COMMON_CATEGORY = 'Modules/Plugins'

export const MAX_RELATED = 4

export const catalogueEntry = (id) => CATALOGUE.find((entry) => String(entry.id) === String(id))

export function catalogueLink(id, lang) {
  return `https://www.dolistore.com/product.php?id=${encodeURIComponent(id)}&l=${encodeURIComponent(lang)}`
}

// related: [ids] in product.yml wins (validated beforehand; [] shows no link). Otherwise the modules
// sharing at least one category other than Modules/Plugins, by number of shared categories then
// catalogue order, filled up to 4 with the other entries in catalogue order; never the product itself.
export function pickRelated(product) {
  if (Array.isArray(product.related)) {
    return product.related.map(catalogueEntry).filter(Boolean).slice(0, MAX_RELATED)
  }
  const own = new Set((product.categories || []).filter((label) => label !== COMMON_CATEGORY))
  const others = CATALOGUE.filter((entry) => String(entry.id) !== String(product.id))
  const sharing = others
    .map((entry, index) => ({ entry, index, shared: entry.categories.filter((label) => own.has(label)).length }))
    .filter((c) => c.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.index - b.index)
    .map((c) => c.entry)
  const fill = others.filter((entry) => !sharing.includes(entry))
  return [...sharing, ...fill].slice(0, MAX_RELATED)
}
