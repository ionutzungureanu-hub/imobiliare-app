import { lazy, Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getIndexuriPrimite } from '../../../shared/firebase/firestore'

const Utilitati        = lazy(() => import('./Utilitati'))
const UtilitatiMobile  = lazy(() => import('./UtilitatiMobile'))
const ValidareIndexuri = lazy(() => import('./ValidareIndexuri'))

// Ecran unic pentru citirea lunară: introducere indexuri + validarea celor primite de la chiriași
export default function Citire() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'validare' ? 'validare' : 'citire'
  const [nr, setNr] = useState(0)
  const [mobil, setMobil] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const h = () => setMobil(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    getIndexuriPrimite('asteptare').then(l => setNr(l.length)).catch(() => {})
  }, [tab])

  const Tab = ({ id, icon, children }) => (
    <button onClick={() => setParams(id === 'citire' ? {} : { tab: id })}
      style={{
        flex: 1, padding: '10px 12px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
        background: 'none', color: tab === id ? 'var(--blue)' : 'var(--slate)',
        borderBottom: `3px solid ${tab === id ? 'var(--blue)' : 'transparent'}`,
      }}>
      <i className={`ti ${icon}`} style={{ marginRight: 6 }} />{children}
    </button>
  )

  return (
    <div>
      <div style={{ display: 'flex', background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '0 12px' }}>
        <Tab id="citire" icon={mobil ? 'ti-bolt' : 'ti-plug'}>Citire indexuri</Tab>
        <Tab id="validare" icon="ti-checks">
          De validat{nr > 0 && (
            <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 10, fontSize: 11, padding: '1px 7px' }}>{nr}</span>
          )}
        </Tab>
      </div>
      <Suspense fallback={<div style={{ padding: 24, color: 'var(--slate)' }}>Se încarcă...</div>}>
        {tab === 'validare' ? <ValidareIndexuri /> : (mobil ? <UtilitatiMobile /> : <Utilitati />)}
      </Suspense>
    </div>
  )
}
