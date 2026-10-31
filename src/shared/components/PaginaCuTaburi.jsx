import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SceletTabel } from './Schelet'

// Pagină compusă din mai multe ecrane, afișate ca file (?tab=...). Fiecare filă își păstrează propriul antet.
export default function PaginaCuTaburi({ taburi }) {
  const [params, setParams] = useSearchParams()
  const tab = taburi.find(t => t.id === params.get('tab')) || taburi[0]
  useEffect(() => { window.scrollTo(0, 0) }, [tab.id])
  const alege = (id) => setParams(new URLSearchParams({ tab: id }))

  return (
    <div>
      <div role="tablist" style={{ display: 'flex', gap: 2, background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '0 20px', overflowX: 'auto' }}>
        {taburi.map(t => (
          <button key={t.id} role="tab" aria-selected={tab.id === t.id} onClick={() => alege(t.id)} style={{
            padding: '11px 18px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            borderBottom: `3px solid ${tab.id === t.id ? 'var(--blue)' : 'transparent'}`,
            color: tab.id === t.id ? 'var(--blue)' : 'var(--slate)', textAlign: 'left',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}><i className={`ti ${t.icon}`} style={{ marginRight: 6 }} />{t.label}</div>
            {t.sub && <div style={{ fontSize: 11, opacity: .8 }}>{t.sub}</div>}
          </button>
        ))}
      </div>
      <Suspense fallback={<div style={{ padding: 24 }}><SceletTabel randuri={4} coloane={4} /></div>}>
        <tab.C key={tab.id} />
      </Suspense>
    </div>
  )
}
