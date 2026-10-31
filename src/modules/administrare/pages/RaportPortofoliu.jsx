import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../../shared/components/Toast'
import { getImobile, getSpatii, getRegistru, getEntitatiEmitente, getFacturariLuna } from '../../../shared/firebase/firestore'
import { mesajEroare } from '../../../shared/utils/eroare'
import { esteActiv, azi } from '../services/registruUtils'
import { construiesteCsv, descarca, fmtD } from '../../facturare/services/facturareUtils'

const nr = (v, z = 2) => (Number(v) || 0).toLocaleString('ro-RO', { minimumFractionDigits: z, maximumFractionDigits: z })
const LUNI = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
const sumaPe = (items) => items.reduce((m, r) => { const k = r.moneda || 'RON'; m[k] = (m[k] || 0) + (Number(r.chirie) || 0); return m }, {})
const txtMonede = (m) => Object.keys(m).length ? Object.entries(m).map(([k, v]) => `${nr(v)} ${k}`).join(' + ') : '—'

// Portofoliu: ocupare și chirii pe imobil, pe firmă emitentă și calendarul expirărilor (doar citire)
export default function RaportPortofoliu() {
  const toast = useToast()
  const an0 = new Date().getFullYear()
  const [an, setAn] = useState(an0)
  const [d, setD] = useState(null)
  const [fact, setFact] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [im, sp, a, b, en] = await Promise.all([getImobile(), getSpatii(), getRegistru('comercial'), getRegistru('rezidential'), getEntitatiEmitente()])
        setD({ imobile: im, spatii: sp, contracte: [...a, ...b], entitati: en })
      } catch (e) { console.error(e); toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
      setLoading(false)
    })()
  }, [])

  // Facturat în anul ales: 12 interogări (una pe lună)
  useEffect(() => {
    let viu = true
    Promise.allSettled(Array.from({ length: 12 }, (_, i) => getFacturariLuna(`${an}-${String(i + 1).padStart(2, '0')}`)))
      .then(r => { if (viu) setFact(r.flatMap(x => x.status === 'fulfilled' ? x.value : [])) })
    return () => { viu = false }
  }, [an])

  const calc = useMemo(() => {
    if (!d) return null
    const spDe = Object.fromEntries(d.spatii.map(s => [s.id, s]))
    const active = d.contracte.filter(esteActiv)
    const imobilDe = (r) => r.imobilId || spDe[r.spatiuId]?.imobilId || ''

    const pe_imobil = d.imobile.map(im => {
      const sp = d.spatii.filter(s => s.imobilId === im.id)
      const ocup = sp.filter(s => s.status === 'Ocupat')
      const contr = active.filter(r => imobilDe(r) === im.id)
      const mp = sp.reduce((t, s) => t + (Number(s.suprafata) || 0), 0)
      const mpOcup = ocup.reduce((t, s) => t + (Number(s.suprafata) || 0), 0)
      const chirii = sumaPe(contr)
      const chPerMp = Object.fromEntries(Object.entries(chirii).map(([k, v]) => [k, mpOcup ? v / mpOcup : 0]))
      return { id: im.id, nume: im.nume || im.denumire || im.id, spatii: sp.length, ocupate: ocup.length, mp, mpOcup, contracte: contr.length, chirii, chPerMp }
    })

    const pe_firma = [...d.entitati.map(e => e.nume), ...new Set(active.map(r => r.entitate).filter(x => x && !d.entitati.some(e => e.nume === x)))].map(nume => {
      const contr = active.filter(r => r.entitate === nume)
      const f = fact.filter(x => x.entitate === nume)
      return {
        nume, contracte: contr.length, chirii: sumaPe(contr), facturi: f.length,
        baza: f.reduce((t, x) => t + (Number(x.baza) || 0), 0), total: f.reduce((t, x) => t + (Number(x.total) || 0), 0),
      }
    })
    const faraFirma = active.filter(r => !r.entitate)
    if (faraFirma.length) pe_firma.push({ nume: '(fără firmă)', contracte: faraFirma.length, chirii: sumaPe(faraFirma), facturi: 0, baza: 0, total: 0 })

    // Expirări în următoarele 12 luni (contractele cu dată de final, neprelungite manual)
    const luni = Array.from({ length: 12 }, (_, i) => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() + i); return { key: `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`, et: `${LUNI[x.getMonth()]} ${x.getFullYear()}` } })
    const expiră = luni.map(l => {
      const c = active.filter(r => r.dataFinal && r.activManual !== true && r.dataFinal.slice(0, 7) === l.key).sort((x, y) => x.dataFinal.localeCompare(y.dataFinal))
      return { ...l, contracte: c, chirii: sumaPe(c) }
    })
    return { pe_imobil, pe_firma, expiră, totalActive: active.length }
  }, [d, fact])

  const exportCsv = (nume, coloane, randuri) => descarca(`${nume}-${azi()}.csv`, construiesteCsv(coloane, randuri))

  if (loading || !calc) return <div className="empty"><p>Se încarcă…</p></div>
  const { pe_imobil, pe_firma, expiră } = calc

  const Titlu = ({ children, onExport }) => (
    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className="card-title" style={{ flex: 1 }}>{children}</div>
      <button className="btn btn-ghost btn-sm" onClick={onExport}><i className="ti ti-download" /> Export Excel (CSV)</button>
    </div>
  )

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <Titlu onExport={() => exportCsv('portofoliu-imobile', ['Imobil', 'Spații', 'Ocupate', 'Ocupare %', 'Suprafață (mp)', 'Suprafață ocupată (mp)', 'Contracte active', 'Chirie lunară contractuală', 'Chirie/mp ocupat'],
          pe_imobil.map(r => [r.nume, r.spatii, r.ocupate, r.spatii ? Math.round(r.ocupate / r.spatii * 100) : 0, r.mp, r.mpOcup, r.contracte, txtMonede(r.chirii), Object.entries(r.chPerMp).map(([k, v]) => `${nr(v)} ${k}`).join(' + ')]))}>
          Pe imobil — ocupare și chirii
        </Titlu>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Imobil</th><th style={{ textAlign: 'right' }}>Spații</th><th style={{ textAlign: 'right' }}>Ocupare</th><th style={{ textAlign: 'right' }}>Suprafață</th><th style={{ textAlign: 'right' }}>Contracte</th><th style={{ textAlign: 'right' }}>Chirie lunară (contract)</th><th style={{ textAlign: 'right' }}>Chirie / mp ocupat</th></tr></thead>
            <tbody>
              {pe_imobil.length === 0 ? <tr><td colSpan={7}><div className="empty"><p>Niciun imobil.</p></div></td></tr> : pe_imobil.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.nume}</td>
                  <td style={{ textAlign: 'right' }}>{r.ocupate}/{r.spatii}</td>
                  <td style={{ textAlign: 'right' }}>{r.spatii ? `${Math.round(r.ocupate / r.spatii * 100)}%` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{r.mp ? `${nr(r.mpOcup, 0)} / ${nr(r.mp, 0)} mp` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{r.contracte}</td>
                  <td style={{ textAlign: 'right' }}>{txtMonede(r.chirii)}</td>
                  <td style={{ textAlign: 'right' }}>{Object.keys(r.chPerMp).length && r.mpOcup ? Object.entries(r.chPerMp).map(([k, v]) => `${nr(v)} ${k}`).join(' + ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <Titlu onExport={() => exportCsv(`firme-${an}`, ['Firmă', 'Contracte active', 'Chirie lunară contractuală', `Facturi marcate ${an}`, `Facturat ${an} fără TVA (RON)`, `Facturat ${an} cu TVA (RON)`],
          pe_firma.map(r => [r.nume, r.contracte, txtMonede(r.chirii), r.facturi, r.baza, r.total]))}>
          Pe firmă emitentă — contractual și facturat
        </Titlu>
        <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          Anul facturat: <input type="number" value={an} onChange={e => setAn(Number(e.target.value) || an0)} style={{ width: 90 }} />
          <span style={{ color: 'var(--slate)' }}>Facturatul vine din chiriile marcate ca emise în aplicație.</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Firmă</th><th style={{ textAlign: 'right' }}>Contracte</th><th style={{ textAlign: 'right' }}>Chirie lunară (contract)</th><th style={{ textAlign: 'right' }}>Facturi {an}</th><th style={{ textAlign: 'right' }}>Fără TVA (RON)</th><th style={{ textAlign: 'right' }}>Cu TVA (RON)</th></tr></thead>
            <tbody>
              {pe_firma.length === 0 ? <tr><td colSpan={6}><div className="empty"><p>Nicio firmă emitentă accesibilă.</p></div></td></tr> : pe_firma.map(r => (
                <tr key={r.nume}>
                  <td style={{ fontWeight: 600 }}>{r.nume}</td>
                  <td style={{ textAlign: 'right' }}>{r.contracte}</td>
                  <td style={{ textAlign: 'right' }}>{txtMonede(r.chirii)}</td>
                  <td style={{ textAlign: 'right' }}>{r.facturi}</td>
                  <td style={{ textAlign: 'right' }}>{nr(r.baza)}</td>
                  <td style={{ textAlign: 'right' }}>{nr(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <Titlu onExport={() => exportCsv('expirari-12-luni', ['Lună', 'Contract', 'Client', 'Firmă', 'Data final', 'Chirie lunară'],
          expiră.flatMap(l => l.contracte.map(r => [l.et, r.numar || '', r.nume || '', r.entitate || '', r.dataFinal, `${nr(r.chirie)} ${r.moneda || 'RON'}`])))}>
          Calendar expirări — următoarele 12 luni
        </Titlu>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Luna</th><th style={{ textAlign: 'right' }}>Contracte</th><th style={{ textAlign: 'right' }}>Chirie lunară în risc</th><th>Contracte</th></tr></thead>
            <tbody>
              {expiră.map(l => (
                <tr key={l.key} style={l.contracte.length ? undefined : { color: 'var(--slate)' }}>
                  <td style={{ fontWeight: 600 }}>{l.et}</td>
                  <td style={{ textAlign: 'right' }}>{l.contracte.length || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{l.contracte.length ? txtMonede(l.chirii) : '—'}</td>
                  <td style={{ fontSize: 12 }}>{l.contracte.map(r => `${r.numar || r.nume} (${fmtD(r.dataFinal)})`).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
