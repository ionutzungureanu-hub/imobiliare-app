// Îmbunătățiri de accesibilitate și de afișare pe mobil, aplicate global (fără a modifica fiecare pagină):
//  • butoane/linkuri doar cu iconiță primesc nume accesibil (din title sau din iconiță)
//  • câmpurile din .form-group primesc numele din <label>
//  • ferestrele (.modal-box) primesc role="dialog"; tasta Esc le închide
//  • tabelele cu clasa .tabel-carduri primesc data-label pe celule (se afișează ca fișe pe telefon)
const ICONITE = {
  'ti-pencil': 'Editează', 'ti-trash': 'Șterge', 'ti-x': 'Închide', 'ti-menu-2': 'Deschide meniul', 'ti-plus': 'Adaugă',
  'ti-download': 'Descarcă', 'ti-upload': 'Încarcă', 'ti-eye': 'Vizualizează', 'ti-copy': 'Copiază', 'ti-refresh': 'Reîncarcă',
  'ti-search': 'Caută', 'ti-check': 'Confirmă', 'ti-arrow-back-up': 'Anulează', 'ti-chevron-right': 'Următorul', 'ti-chevron-left': 'Înapoi',
  'ti-external-link': 'Deschide', 'ti-send': 'Trimite', 'ti-history': 'Istoric', 'ti-paperclip': 'Atașament', 'ti-settings': 'Setări',
}
const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim()

function eticheteazaButoane(root) {
  root.querySelectorAll('button:not([aria-label]), a:not([aria-label])').forEach(el => {
    if (text(el)) return
    const t = el.getAttribute('title')
    if (t) { el.setAttribute('aria-label', t); return }
    const ic = el.querySelector('i.ti')
    const cls = ic && [...ic.classList].find(c => ICONITE[c])
    if (cls) el.setAttribute('aria-label', ICONITE[cls])
  })
}

function eticheteazaCampuri(root) {
  root.querySelectorAll('.form-group').forEach(g => {
    const lab = g.querySelector('label'); if (!lab) return
    const nume = text(lab).replace(/\s*\*$/, ''); if (!nume) return
    g.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([aria-label]), select:not([aria-label]), textarea:not([aria-label])').forEach(c => {
      if (!c.id) c.setAttribute('aria-label', nume)
    })
  })
}

function eticheteazaFerestre(root) {
  root.querySelectorAll('.modal-box:not([role])').forEach(m => {
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true')
    const h = m.querySelector('h3, h2, .modal-title'); if (h) m.setAttribute('aria-label', text(h))
  })
}

function eticheteazaTabele(root) {
  root.querySelectorAll('table.tabel-carduri').forEach(t => {
    const ths = [...t.querySelectorAll('thead th')].map(th => text(th).replace(/[▲▼↑↓]/g, '').trim())
    if (!ths.length) return
    t.querySelectorAll('tbody tr').forEach(tr => {
      let i = 0
      ;[...tr.children].forEach(td => {
        const span = td.colSpan || 1
        if (span > 1) { td.setAttribute('data-gol', '1'); i += span; return }
        if (td.getAttribute('data-label') === null) td.setAttribute('data-label', ths[i] || '')
        i += 1
      })
    })
  })
}

export function pornesteAccesibilitate() {
  let programat = false
  const aplica = () => {
    programat = false
    const r = document.body
    eticheteazaButoane(r); eticheteazaCampuri(r); eticheteazaFerestre(r); eticheteazaTabele(r)
  }
  const obs = new MutationObserver(() => { if (!programat) { programat = true; requestAnimationFrame(aplica) } })
  obs.observe(document.body, { childList: true, subtree: true })
  aplica()

  const esc = (e) => {
    if (e.key !== 'Escape') return
    const ferestre = document.querySelectorAll('.modal-overlay')
    const ultima = ferestre[ferestre.length - 1]
    const inchide = ultima?.querySelector('.modal-close')
    if (inchide) inchide.click()
  }
  document.addEventListener('keydown', esc)
  return () => { obs.disconnect(); document.removeEventListener('keydown', esc) }
}
