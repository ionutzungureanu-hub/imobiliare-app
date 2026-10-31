// Catalogul modulelor aplicației: o singură sursă pentru meniul desktop, meniul mobil, bara de jos,
// cartonașele din Dashboard, căutarea globală și blocarea paginilor ascunse.
// d = vizibil pe desktop · m = vizibil pe mobil · h = apare pe pagina Acasă (cartonașe)
// fix = nu poate fi ascuns · adminOnly = doar administratorul general · inMeniu:false = nu apare ca link în meniu
export const SECTIUNI = ['Acasă', 'Persoane și spații', 'Ciclul lunar', 'Documente și rapoarte', 'Setări']

export const MODULE = [
  { key: 'dashboard',   to: '/dashboard',          paths: ['/dashboard'], icon: 'ti-layout-dashboard', label: 'Dashboard', scurt: 'Acasă', section: 'Acasă', fix: true, def: { d: true, m: true, h: true } },

  { key: 'clienti',     to: '/clienti',            paths: ['/clienti', '/import-clienti'], icon: 'ti-users', label: 'Clienți', scurt: 'Clienți', section: 'Persoane și spații', def: { d: true, m: true, h: true } },
  { key: 'spatii',      to: '/spatii',             paths: ['/spatii'], icon: 'ti-building', label: 'Spații & Imobile', section: 'Persoane și spații', def: { d: true, m: false, h: true } },
  { key: 'contracte',   to: '/contracte',          paths: ['/contracte'], icon: 'ti-file-text', label: 'Contracte', section: 'Persoane și spații', def: { d: true, m: false, h: true } },
  { key: 'comunicare',  to: '/comunicare',         paths: ['/comunicare'], icon: 'ti-mail', label: 'Comunicare', section: 'Persoane și spații', def: { d: true, m: false, h: false } },
  { key: 'portal',      to: '/portal-chiriasi',    paths: ['/portal-chiriasi'], icon: 'ti-link', label: 'Portal chiriași', section: 'Persoane și spații', def: { d: true, m: true, h: true } },

  { key: 'citire',      to: '/citire',             paths: ['/citire', '/utilitati', '/utilitati-mobile', '/validare-indexuri'], icon: 'ti-bolt', label: '1 · Citire indexuri', scurt: 'Citire', section: 'Ciclul lunar', badge: true, def: { d: true, m: true, h: true } },
  { key: 'nota',        to: '/nota-administratie', paths: ['/nota-administratie'], icon: 'ti-droplet', label: '2 · Notă apă bloc', section: 'Ciclul lunar', def: { d: true, m: true, h: true } },
  { key: 'facturi',     to: '/facturi',            paths: ['/facturi', '/emite', '/emite-utilitati', '/emise'], icon: 'ti-receipt', label: '3 · Facturi', section: 'Ciclul lunar', def: { d: true, m: false, h: true } },
  // Nota de calcul: pe desktop face parte din Facturi; pe mobil e pagină separată (bara de jos)
  { key: 'nota_calcul', to: '/nota-calcul',        paths: ['/nota-calcul'], icon: 'ti-calculator', label: 'Notă de calcul', scurt: 'Notă', section: 'Ciclul lunar', inMeniu: false, def: { d: true, m: true, h: true } },

  { key: 'biblioteca',  to: '/biblioteca',         paths: ['/biblioteca'], icon: 'ti-books', label: 'Bibliotecă', section: 'Documente și rapoarte', def: { d: true, m: true, h: true } },
  { key: 'firme',      to: '/firme',             paths: ['/firme'], icon: 'ti-building-bank', label: 'Registru firme', scurt: 'Firme', section: 'Documente și rapoarte', def: { d: true, m: false, h: false } },
  { key: 'rapoarte',    to: '/rapoarte',           paths: ['/rapoarte'], icon: 'ti-chart-bar', label: 'Rapoarte', section: 'Documente și rapoarte', def: { d: true, m: false, h: true } },

  { key: 'acces',       to: '/acces',              paths: ['/acces'], icon: 'ti-key', label: 'Acces imobile', section: 'Setări', adminOnly: true, fix: true, def: { d: true, m: false, h: false } },
  { key: 'utilizatori', to: '/utilizatori',        paths: ['/utilizatori'], icon: 'ti-user-cog', label: 'Utilizatori', section: 'Setări', adminOnly: true, fix: true, def: { d: true, m: false, h: true } },
  { key: 'config',      to: '/config',             paths: ['/config'], icon: 'ti-settings', label: 'Configurare', section: 'Setări', adminOnly: true, fix: true, def: { d: true, m: false, h: true } },
  { key: 'meniu',       to: '/meniu',              paths: ['/meniu'], icon: 'ti-layout-sidebar', label: 'Administrare meniu', section: 'Setări', adminOnly: true, fix: true, def: { d: true, m: false, h: false } },
  { key: 'entitati',   to: '/entitati',           paths: ['/entitati'], icon: 'ti-building-bank', label: 'Entități emitente', section: 'Setări', adminOnly: true, def: { d: true, m: false, h: false } },
  { key: 'furnizori',   to: '/furnizori',          paths: ['/furnizori'], icon: 'ti-file-import', label: 'Furnizori', section: 'Setări', adminOnly: true, def: { d: true, m: false, h: true } },
]

export const MODULE_PE_CHEIE = Object.fromEntries(MODULE.map(m => [m.key, m]))
export const BARA_IMPLICIT = ['dashboard', 'clienti', 'citire', 'nota_calcul']
export const MAX_BARA = 4

// Modulul căruia îi aparține o adresă (ex. „/spatii/abc/portal” → spatii)
export const moduleDinCale = (cale) => {
  const p = String(cale || '').split('?')[0]
  return MODULE.find(m => m.paths.some(x => p === x || p.startsWith(x + '/'))) || null
}

// Valoarea efectivă: excepție pe persoană → meniu standard → implicit
export const esteVizibil = (cfg, uid, isAdmin, key, p) => {
  const m = MODULE_PE_CHEIE[key]
  if (!m) return true
  if (m.adminOnly) return !!isAdmin && (m.fix || valoare(cfg, uid, m, p))
  if (m.fix) return true
  return valoare(cfg, uid, m, p)
}
const valoare = (cfg, uid, m, p) => {
  const pers = cfg?.persoane?.[uid]?.[m.key]?.[p]
  if (typeof pers === 'boolean') return pers
  const std = cfg?.standard?.[m.key]?.[p]
  if (typeof std === 'boolean') return std
  return m.def[p]
}
export const valoareStandard = (cfg, key, p) => valoare(cfg, null, MODULE_PE_CHEIE[key], p)

// Ordinea: lista salvată, apoi restul în ordinea implicită; secțiunile rămân în ordinea fixă
export const moduleOrdonate = (cfg) => {
  const ord = cfg?.ordine || []
  const poz = (k) => { const i = ord.indexOf(k); return i === -1 ? 1000 + MODULE.findIndex(m => m.key === k) : i }
  return [...MODULE].sort((a, b) => {
    const sa = SECTIUNI.indexOf(a.section), sb = SECTIUNI.indexOf(b.section)
    return sa !== sb ? sa - sb : poz(a.key) - poz(b.key)
  })
}
