// Fixed texts of the "netlogic" layout, one entry per DoliStore language.
// The values are trusted HTML fragments (no module text): {name}, {start}, {support} and {days}
// are replaced by the layout with escaped values.

export const TEXTS = {
  en: {
    features: 'Features',
    how: 'How it works',
    requirements: 'Requirements',
    installation: 'Installation',
    support: 'Support and updates',
    interfaceLangs: 'Interface languages: ',
    dependsOn: 'Required Dolibarr modules: ',
    install: [
      'Deploy the zip with <strong>Home → Setup → Modules → Deploy an external module</strong>.',
      'Enable <strong>{name}</strong>.',
      'Give the permissions to your users.',
    ],
    supportLine: 'Support by email at {support}. Updates included for {days} days.',
    more: 'More Net-Logic modules on DoliStore',
  },
  fr: {
    features: 'Fonctionnalités',
    how: 'Fonctionnement',
    requirements: 'Prérequis',
    installation: 'Installation',
    support: 'Support et mises à jour',
    interfaceLangs: 'Langues de l\'interface : ',
    dependsOn: 'Modules Dolibarr requis : ',
    install: [
      'Déployez le zip avec <strong>Accueil → Configuration → Modules → Déployer un module externe</strong>.',
      'Activez <strong>{name}</strong>.',
      'Donnez les permissions à vos utilisateurs.',
    ],
    supportLine: 'Support par e-mail à {support}. Mises à jour incluses pendant {days} jours.',
    more: 'Autres modules Net-Logic sur DoliStore',
  },
  de: {
    features: 'Funktionen',
    how: 'So funktioniert es',
    requirements: 'Voraussetzungen',
    installation: 'Installation',
    support: 'Support und Updates',
    interfaceLangs: 'Sprachen der Oberfläche: ',
    dependsOn: 'Benötigte Dolibarr-Module: ',
    install: [
      'Installieren Sie die ZIP-Datei unter <strong>Start → Einstellungen → Module → Externes Modul installieren</strong>.',
      'Aktivieren Sie <strong>{name}</strong>.',
      'Vergeben Sie die Berechtigungen an Ihre Benutzer.',
    ],
    supportLine: 'Support per E-Mail an {support}. Updates für {days} Tage inklusive.',
    more: 'Weitere Net-Logic-Module im DoliStore',
  },
  it: {
    features: 'Funzionalità',
    how: 'Come funziona',
    requirements: 'Requisiti',
    installation: 'Installazione',
    support: 'Supporto e aggiornamenti',
    interfaceLangs: 'Lingue dell\'interfaccia: ',
    dependsOn: 'Moduli Dolibarr richiesti: ',
    install: [
      'Installa lo zip da <strong>Home → Impostazioni → Moduli → Installa un modulo esterno</strong>.',
      'Attiva <strong>{name}</strong>.',
      'Assegna i permessi ai tuoi utenti.',
    ],
    supportLine: 'Supporto via e-mail a {support}. Aggiornamenti inclusi per {days} giorni.',
    more: 'Altri moduli Net-Logic su DoliStore',
  },
  es: {
    features: 'Funcionalidades',
    how: 'Cómo funciona',
    requirements: 'Requisitos',
    installation: 'Instalación',
    support: 'Soporte y actualizaciones',
    interfaceLangs: 'Idiomas de la interfaz: ',
    dependsOn: 'Módulos de Dolibarr necesarios: ',
    install: [
      'Despliegue el zip desde <strong>Inicio → Configuración → Módulos → Desplegar un módulo externo</strong>.',
      'Active <strong>{name}</strong>.',
      'Dé los permisos a sus usuarios.',
    ],
    supportLine: 'Soporte por correo electrónico en {support}. Actualizaciones incluidas durante {days} días.',
    more: 'Más módulos de Net-Logic en DoliStore',
  },
}

// Headings accepted in a module file, compared after normalizeHeading() (no case, no accents).
// English is accepted in every language.
export const FEATURES_HEADINGS = {
  en: ['features'],
  fr: ['fonctionnalites'],
  de: ['funktionen'],
  it: ['funzionalita'],
  es: ['funcionalidades'],
}

export const HOW_HEADINGS = {
  en: ['how it works'],
  fr: ['fonctionnement', 'comment ca marche'],
  de: ['so funktioniert es', 'funktionsweise'],
  it: ['come funziona'],
  es: ['como funciona'],
}

// Hand-written sections that the layout generates: a heading starting with one of these
// (any language, normalised) is refused
export const GENERATED_HEADING_STEMS = [
  'requirement', 'prerequisite', 'system requirement', 'install', 'support',
  'prerequis', 'configuration requise', 'assistance', 'mise a jour', 'mises a jour',
  'voraussetzung', 'anforderung', 'systemanforderung', 'unterstutzung',
  'requisit', 'prerequisit', 'assistenza', 'supporto', 'aggiornament',
  'requisito', 'instalacion', 'soporte', 'asistencia', 'actualizacion', 'update',
]

// Interface language names by the language part of a Dolibarr langs/ folder (fr_FR -> fr)
export const LANGUAGE_NAMES = {
  en: { en: 'English', fr: 'anglais', de: 'Englisch', it: 'inglese', es: 'inglés' },
  fr: { en: 'French', fr: 'français', de: 'Französisch', it: 'francese', es: 'francés' },
  de: { en: 'German', fr: 'allemand', de: 'Deutsch', it: 'tedesco', es: 'alemán' },
  it: { en: 'Italian', fr: 'italien', de: 'Italienisch', it: 'italiano', es: 'italiano' },
  es: { en: 'Spanish', fr: 'espagnol', de: 'Spanisch', it: 'spagnolo', es: 'español' },
  pt: { en: 'Portuguese', fr: 'portugais', de: 'Portugiesisch', it: 'portoghese', es: 'portugués' },
  pl: { en: 'Polish', fr: 'polonais', de: 'Polnisch', it: 'polacco', es: 'polaco' },
  nl: { en: 'Dutch', fr: 'néerlandais', de: 'Niederländisch', it: 'olandese', es: 'neerlandés' },
  ca: { en: 'Catalan', fr: 'catalan', de: 'Katalanisch', it: 'catalano', es: 'catalán' },
  ru: { en: 'Russian', fr: 'russe', de: 'Russisch', it: 'russo', es: 'ruso' },
  uk: { en: 'Ukrainian', fr: 'ukrainien', de: 'Ukrainisch', it: 'ucraino', es: 'ucraniano' },
  el: { en: 'Greek', fr: 'grec', de: 'Griechisch', it: 'greco', es: 'griego' },
  tr: { en: 'Turkish', fr: 'turc', de: 'Türkisch', it: 'turco', es: 'turco' },
  ar: { en: 'Arabic', fr: 'arabe', de: 'Arabisch', it: 'arabo', es: 'árabe' },
  zh: { en: 'Chinese', fr: 'chinois', de: 'Chinesisch', it: 'cinese', es: 'chino' },
  ja: { en: 'Japanese', fr: 'japonais', de: 'Japanisch', it: 'giapponese', es: 'japonés' },
  sv: { en: 'Swedish', fr: 'suédois', de: 'Schwedisch', it: 'svedese', es: 'sueco' },
  da: { en: 'Danish', fr: 'danois', de: 'Dänisch', it: 'danese', es: 'danés' },
  nb: { en: 'Norwegian', fr: 'norvégien', de: 'Norwegisch', it: 'norvegese', es: 'noruego' },
  fi: { en: 'Finnish', fr: 'finnois', de: 'Finnisch', it: 'finlandese', es: 'finés' },
  cs: { en: 'Czech', fr: 'tchèque', de: 'Tschechisch', it: 'ceco', es: 'checo' },
  hu: { en: 'Hungarian', fr: 'hongrois', de: 'Ungarisch', it: 'ungherese', es: 'húngaro' },
  ro: { en: 'Romanian', fr: 'roumain', de: 'Rumänisch', it: 'rumeno', es: 'rumano' },
}

// Common core modules of a descriptor's $this->depends, by their Dolibarr class name
export const DOLIBARR_MODULES = {
  modFacture: { en: 'Invoices', fr: 'Factures', de: 'Rechnungen', it: 'Fatture', es: 'Facturas' },
  modSociete: { en: 'Third parties', fr: 'Tiers', de: 'Geschäftspartner', it: 'Soggetti terzi', es: 'Terceros' },
  modPropale: { en: 'Commercial proposals', fr: 'Propositions commerciales', de: 'Angebote', it: 'Preventivi', es: 'Presupuestos' },
  modCommande: { en: 'Sales orders', fr: 'Commandes clients', de: 'Kundenaufträge', it: 'Ordini cliente', es: 'Pedidos de clientes' },
  modFournisseur: { en: 'Suppliers', fr: 'Fournisseurs', de: 'Lieferanten', it: 'Fornitori', es: 'Proveedores' },
  modProduct: { en: 'Products', fr: 'Produits', de: 'Produkte', it: 'Prodotti', es: 'Productos' },
  modStock: { en: 'Stocks', fr: 'Stocks', de: 'Lagerbestände', it: 'Magazzino', es: 'Existencias' },
  modProjet: { en: 'Projects', fr: 'Projets', de: 'Projekte', it: 'Progetti', es: 'Proyectos' },
  modAgenda: { en: 'Agenda', fr: 'Agenda', de: 'Terminkalender', it: 'Agenda', es: 'Agenda' },
  modTicket: { en: 'Tickets', fr: 'Tickets', de: 'Tickets', it: 'Ticket', es: 'Tickets' },
  modAdherent: { en: 'Members', fr: 'Adhérents', de: 'Mitglieder', it: 'Membri', es: 'Miembros' },
  modBanque: { en: 'Banks', fr: 'Banques', de: 'Banken', it: 'Banche', es: 'Bancos' },
  modExpedition: { en: 'Shipments', fr: 'Expéditions', de: 'Lieferungen', it: 'Spedizioni', es: 'Envíos' },
  modContrat: { en: 'Contracts', fr: 'Contrats', de: 'Verträge', it: 'Contratti', es: 'Contratos' },
  // Names as in Dolibarr's own admin.lang (Module2500Name, Module1780Name, Module2300Name)
  modECM: { en: 'DMS / ECM', fr: 'GED', de: 'DMS/ECM', it: 'DMS / ECM', es: 'GED / SGD' },
  modCategorie: { en: 'Tags/Categories', fr: 'Libellés/Catégories', de: 'Kategorien', it: 'Tag/categorie', es: 'Etiquetas/Categorías' },
  modCron: { en: 'Scheduled jobs', fr: 'Travaux planifiés', de: 'Geplante Jobs', it: 'Processi pianificati', es: 'Tareas programadas' },
}
