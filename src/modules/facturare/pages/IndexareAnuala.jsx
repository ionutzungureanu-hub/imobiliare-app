import { useEffect, useMemo, useState, useCallback } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { fmt } from '../../../shared/utils'
import { mesajEroare } from '../../../shared/utils/eroare'
import { getRegistru, updateRegistruCampuri, getEntitatiEmitente } from '../../../shared/firebase/firestore'
import { rotunjeste, anIndexat } from '../services/facturareUtils'

// Indexarea anuală a chiriilor: rata se introduce manual când apare; fiecare sumă nouă poate fi corectată
export default function IndexareAnuala() {
  const toast = useToast()
  const { isAdmin } = useAuth()
  const [numeFirme, setNumeFirme] = useState([])
  const [an, setAn] = useState(new Date().getFullYear())
  const [rata, setRata] = useState('')
  const [rotunjire, setRotunjire] = useState('2')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState({})
  const [noi, setNoi] = useState({})       // sume noi editate manual
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const [r, e] = await Promise.all([getRegistru('comercial'), getEntitatiEmitente()]); setRows(r); setNumeFirme(e.map(x => x.nume)) }
    catch (e) { console.error(e); toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const calculeaza = (vechi) => {
    const v = Number(vechi) * (1 + (Number(rata) || 0) / 100)
    return rotunjire === '0' ? Math.round(v) : rotunjeste(v)
  }

  // Contracte cu facturare activă, indexabile, care nu au fost încă indexate în anul ales
  const { deIndexat, indexate } = useMemo(() => {
    const d = [], i = []
    for (const r of rows) {
      if (!isAdmin && r.entitate && !numeFirme.includes(r.entitate)) continue   // firmă fără acces
      if (!r.factActiv || r.indexabil === false || !Number(r.chirie) || r.activManual === false) continue
      if (r.dataFinal && r.activManual !== true && r.dataFinal < `${an}-01-01`) continue
      if (anIndexat(r) < an) d.push(r); else i.push(r)
    }
    const sort = (a, b) => String(a.entitate).localeCompare(String(b.entitate)) || String(a.numar).localeCompare(String(b.numar))
    return { deIndexat: d.sort(sort), indexate: i.sort(sort) }
  }, [rows, an, numeFirme, isAdmin])

  const nou = (r) => noi[r.id] !== undefined && noi[r.id] !== '' ? Number(noi[r.id]) : calculeaza(r.chirie)
  const alese = deIndexat.filter(r => sel[r.id])

  const istoric = (r, la, rataAplicata) => [...(r.istoricChirie || []), {
    an, de: Number(r.chirie), la, rata: rataAplicata, moneda: r.moneda || 'RON', data: new Date().toISOString().slice(0, 10),
  }]

  const aplica = async () => {
    if (!alese.length) { toast('Bifează contractele de indexat.', 'error'); return }
    if (!Number(rata) && alese.some(r => noi[r.id] === undefined || noi[r.id] === '')) { toast('Introdu rata de indexare sau sumele noi.', 'error'); return }
    if (!confirm(`Aplici indexarea pentru ${alese.length} contracte? Chiriile din registru se modifică și rămân în istoric.`)) return
    setBusy(true)
    try {
      for (const r of alese) {
        const la = nou(r)
        await updateRegistruCampuri(r.id, { chirie: la, indexatAn: an, istoricChirie: istoric(r, la, Number(rata) || null) })
      }
      toast(`${alese.length} contracte indexate.`); setSel({}); setNoi({}); load()
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Indexarea a eșuat'), 'error') }
    setBusy(false)
  }

  const faraIndexare = async (r) => {
    if (!confirm(`Chiria contractului ${r.numar || r.nume} rămâne neschimbată în ${an}?`)) return
    try {
      await updateRegistruCampuri(r.id, { indexatAn: an, istoricChirie: istoric(r, Number(r.chirie), 0) })
      toast('Marcat: fără indexare în acest an.'); load()
    } catch (e) { toast(mesajEroare(e), 'error') }
  }

  return (
    <>
      <Topbar title="Indexare anuală" subtitle="Actualizarea chiriilor cu rata inflației" />
      <div className="content">
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          <span>
            Până nu indexezi un contract, <strong>chiria lui nu apare în „De emis”</strong> în anul respectiv. Introdu rata când e publicată, verifică sumele noi
            (le poți corecta pe fiecare) și aplică. Contractele care nu se indexează se marchează cu „Fără indexare”.
          </span>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}><label>An</label>
              <input type="number" value={an} onChange={e => setAn(Number(e.target.value) || an)} style={{ width: 100 }} /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Rata de indexare (%)</label>
              <input type="number" step="0.01" value={rata} onChange={e => setRata(e.target.value)} placeholder="ex. 4.5" style={{ width: 130 }} /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Rotunjire</label>
              <select value={rotunjire} onChange={e => setRotunjire(e.target.value)}>
                <option value="2">2 zecimale</option><option value="0">La întreg</option>
              </select></div>
          </div>
        </div>

        {loading ? <div className="empty"><p>Se încarcă…</p></div> : (
          <>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="card-title">De indexat în {an} ({deIndexat.length})</div>
                  <div className="card-subtitle">{indexate.length} contracte sunt deja indexate sau în regulă pentru {an}.</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSel(deIndexat.every(r => sel[r.id]) ? {} : Object.fromEntries(deIndexat.map(r => [r.id, true])))}>Bifează / debifează</button>
                <button className="btn btn-primary btn-sm" onClick={aplica} disabled={busy || !alese.length}><i className="ti ti-check" /> Aplică indexarea ({alese.length})</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th></th><th>Entitate</th><th>Contract</th><th>Client</th><th style={{ textAlign: 'right' }}>Chirie actuală</th><th style={{ textAlign: 'right' }}>Chirie nouă</th><th></th></tr></thead>
                  <tbody>
                    {deIndexat.length === 0 ? (
                      <tr><td colSpan={7}><div className="empty"><i className="ti ti-circle-check" /><p>Nimic de indexat pentru {an}.</p></div></td></tr>
                    ) : deIndexat.map(r => (
                      <tr key={r.id}>
                        <td><input type="checkbox" checked={!!sel[r.id]} onChange={e => setSel(s => ({ ...s, [r.id]: e.target.checked }))} style={{ width: 18, height: 18 }} /></td>
                        <td style={{ fontSize: 12 }}>{r.entitate || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{r.numar || r.identificator}</td>
                        <td>{r.nume}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(r.chirie)} {r.moneda}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <input type="number" step="0.01" value={noi[r.id] ?? (Number(rata) ? calculeaza(r.chirie) : '')}
                            onChange={e => setNoi(m => ({ ...m, [r.id]: e.target.value }))} placeholder="—" style={{ width: 110, textAlign: 'right' }} /> {r.moneda}
                        </td>
                        <td><button className="btn btn-ghost btn-sm" onClick={() => faraIndexare(r)}>Fără indexare</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
