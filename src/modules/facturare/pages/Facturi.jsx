import { lazy, Suspense, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const EmiteFactura          = lazy(() => import('./EmiteFactura'))
const EmiteFacturaUtilitati = lazy(() => import('./EmiteFacturaUtilitati'))
const NotaCalcul            = lazy(() => import('../../administrare/pages/NotaCalcul'))
const FacturiEmise          = lazy(() => import('./FacturiEmise'))
const FacturareLunara       = lazy(() => import('./FacturareLunara'))
const IndexareAnuala        = lazy(() => import('./IndexareAnuala'))

const TABURI = [
  { id: 'lunar',    icon: 'ti-calendar-event', label: 'De emis luna asta', sub: 'chirii recurente', C: FacturareLunara },
  { id: 'indexare', icon: 'ti-trending-up',    label: 'Indexare anuală',   sub: 'ianuarie',         C: IndexareAnuala },
  { id: 'chirie',   icon: 'ti-file-plus', label: 'Factură chirie',     sub: 'persoane juridice', C: EmiteFactura },
  { id: 'utilitati',icon: 'ti-receipt',   label: 'Factură utilități',  sub: 'din citiri',        C: EmiteFacturaUtilitati },
  { id: 'nota',     icon: 'ti-calculator',label: 'Notă de calcul',     sub: 'persoane fizice',   C: NotaCalcul },
  { id: 'istoric',  icon: 'ti-files',     label: 'Istoric facturi',    sub: 'emise',             C: FacturiEmise },
]

// Un singur loc pentru tot ce ține de facturare: emitere (chirie, utilități, notă PF) și istoric
export default function Facturi() {
  const [params, setParams] = useSearchParams()
  const tab = TABURI.find(t => t.id === params.get('tab')) || TABURI[0]

  useEffect(() => { window.scrollTo(0, 0) }, [tab.id])

  const alege = id => {
    const p = new URLSearchParams()
    p.set('tab', id)
    setParams(p)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '0 20px', overflowX: 'auto' }}>
        {TABURI.map(t => (
          <button key={t.id} onClick={() => alege(t.id)} style={{
            padding: '11px 18px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            borderBottom: `3px solid ${tab.id === t.id ? 'var(--blue)' : 'transparent'}`,
            color: tab.id === t.id ? 'var(--blue)' : 'var(--slate)', textAlign: 'left',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}><i className={`ti ${t.icon}`} style={{ marginRight: 6 }} />{t.label}</div>
            <div style={{ fontSize: 11, opacity: .8 }}>{t.sub}</div>
          </button>
        ))}
      </div>
      <Suspense fallback={<div style={{ padding: 24, color: 'var(--slate)' }}>Se încarcă...</div>}>
        <tab.C key={tab.id} />
      </Suspense>
    </div>
  )
}
