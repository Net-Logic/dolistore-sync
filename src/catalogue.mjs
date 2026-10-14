// Net-Logic modules published on DoliStore, linked from the "More Net-Logic modules" list of the
// netlogic layout. id and categories come from each module's dolistore/product.yml, the name from
// its title (part before " - "), the tagline is a short neutral form of its "short" text.
// Catalogue order is the tie-break of the choice: keep it stable.
export const CATALOGUE = [
  {
    id: 647, // microsoftgraph
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
    id: 807, // emailtemplatemgr
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
    id: 1029, // imagegallery
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
    id: 1246, // googlerecaptcha
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
    id: 792, // relancefactureglobale
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
]

// Every product has this category: sharing it means nothing
const COMMON_CATEGORY = 'Modules/Plugins'

export const MAX_RELATED = 4

export const catalogueEntry = (id) => CATALOGUE.find((entry) => String(entry.id) === String(id))

export function catalogueLink(id, lang) {
  return `https://www.dolistore.com/product.php?id=${encodeURIComponent(id)}&l=${encodeURIComponent(lang)}`
}

// related: [ids] in product.yml wins (validated beforehand); otherwise the modules sharing at least one
// category other than Modules/Plugins, by number of shared categories then catalogue order
export function pickRelated(product) {
  if (Array.isArray(product.related)) {
    return product.related.map(catalogueEntry).filter(Boolean).slice(0, MAX_RELATED)
  }
  const own = new Set((product.categories || []).filter((label) => label !== COMMON_CATEGORY))
  return CATALOGUE
    .filter((entry) => String(entry.id) !== String(product.id))
    .map((entry, index) => ({ entry, index, shared: entry.categories.filter((label) => own.has(label)).length }))
    .filter((c) => c.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.index - b.index)
    .slice(0, MAX_RELATED)
    .map((c) => c.entry)
}
