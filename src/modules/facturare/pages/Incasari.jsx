import { useEffect, useMemo, useState, useCallback } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { fmt } from '../../../shared/utils'
import { mesajEroare } from '../../../shared/utils/eroare'
import { SceletTabel } from '../../../shared/components/Schelet'
import StareGoala from '../../../shared/components/StareGoala'
import { getFacturariPeStatus, updateFacturareLuna, logAudit, getImobile } from '../../../shared/firebase/firestore'
import { fmtD, numeLuna } from '../services/facturareUtils'

const azi = () => new Date().toISOString().slice(0, 10)
const zileIntarziere = (scad) => scad ? Math.round((new Date(azi() + 'T12:00:00') - new Date(scad + 'T12:00:00')) / 86400000) : 0
const suma = (l) => l.reduce((s, f) => s + (Number(f.total) || 0), 0)

// Evidența încasărilor: toate facturile marcate ca emise și care nu au fost încă marcate ca încasate (toate lunile),
// cu restanțele (scadență depășită) puse în față. Vizibil doar pentru firmele și imobilele la care contul are acces.
export default function Incasari() {
  const toast = useToast()
  const [vedere, setVedere] = useState('neincasate') // neincasate | restante | incasate
  const [neinc, setNeinc] = useState([])
  const [inc, setInc] = useState(null)
  const [imobile, setImobile] = useState([])
  const [cauta, setCauta] = useState('')
  const [firma, setFirma] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null) // { f, data }
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [n, im] = await Promise.all([getFacturariPeStatus('emis'), getImobile()])
      setNeinc(n); setImobile(im)
      if (inc) setInc(await getFacturariPeStatus('incasat'))
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
    setLoading(false)
  }, [inc !== null])
  useEffect(() => { load() }, [load])

  const alegeVedere = async (v) => {
    setVedere(v)
    if (v === 'incasate' && inc === null) {
      try { setInc(await getFacturariPeStatus('incasat')) } catch (e) { toast(mesajEroare(e), 'error') }
    }
  }

  const restante = useMemo(() => neinc.filter(f => f.dataScadenta && f.dataScadenta < azi()), [neinc])
  const in7 = useMemo(() => neinc.filter(f => f.dataScadenta && f.dataScadenta >= azi() && zileIntarziere(f.dataScadenta) >= -7), [neinc])
  const firme = useMemo(() => [...new Set([...neinc, ...(inc || [])].map(f => f.entitate).filter(Boolean))].sort(), [neinc, inc])
  const numeIm = (id) => imobile.find(i => i.id === id)?.nume || ''

  const lista = useMemo(() => {
    const baza = vedere === 'incasate' ? (inc || []) : vedere === 'restante' ? restante : neinc
    const q = cauta.trim().toLowerCase()
    return baza.filter(f => (!firma || f.entitate === firma)
      && (!q || [f.clientNume, f.contractNr, f.numar, f.entitate].some(x => String(x || '').toLowerCase().includes(q))))
      .sort((a, b) => vedere === 'incasate' ? (b.dataIncasare || '').localeCompare(a.dataIncasare || '') : (a.dataScadenta || '').localeCompare(b.dataScadenta || ''))
  }, [vedere, neinc, inc, restante, cauta, firma])

  const marcheaza = async () => {
    const { f, data } = dialog
    if (!data) return
    setBusy(true)
    try {
      await updateFacturareLuna(f.id, { status: 'incasat', dataIncasare: data })
      logAudit({ actiune: 'incasare', tip: 'facturare', id: f.id, imobilId: f.imobilId, rezumat: `Încasat: contract ${f.contractNr || '—'}, ${f.clientNume || ''}, ${numeLuna(f.luna)}, ${fmt(f.total)} RON (${fmtD(data)})` })
      toast('Marcat ca încasat.'); setDialog(null); await load()
    } catch (e) { toast(mesajEroare(e), 'error') }
    setBusy(false)
  }
  const anuleaza = async (f) => {
    if (!confirm('Anulezi încasarea? Factura revine la neîncasate.')) return
    try {
      await updateFacturareLuna(f.id, { status: 'emis', dataIncasare: '' })
      logAudit({ actiune: 'incasare_anulata', tip: 'facturare', id: f.id, imobilId: f.imobilId, rezumat: `Încasare anulată: contract ${f.contractNr || '—'}, ${numeLuna(f.luna)}` })
      toast('Încasare anulată.'); await load()
    } catch (e) { toast(mesajEroare(e), 'error') }
  }

  const Tile = ({ label, val, sub, culoare }) => (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: culoare, marginTop: 4 }}>{val}</div>
      <div style={{ fontSize: 12, color: 'var(--slate)' }}>{sub}</div>
    </div>
  )

  return (
    <>
      <Topbar title="Încasări" subtitle="Facturi emise și neîncasate, cu restanțele în față" />
      <div className="content">
        {loading ? <SceletTabel /> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              <Tile label="De încasat" val={`${fmt(suma(neinc))} RON`} sub={`${neinc.length} facturi`} culoare="var(--blue)" />
              <Tile label="Restante" val={`${fmt(suma(restante))} RON`} sub={`${restante.length} facturi cu scadența depășită`} culoare={restante.length ? 'var(--red)' : 'var(--green)'} />
              <Tile label="Scadente în 7 zile" val={`${fmt(suma(in7))} RON`} sub={`${in7.length} facturi`} culoare={in7.length ? 'var(--amber)' : 'var(--green)'} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {[['neincasate', `Neîncasate (${neinc.length})`], ['restante', `Restante (${restante.length})`], ['incasate', 'Încasate']].map(([k, l]) => (
                <button key={k} className={`btn btn-sm ${vedere === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => alegeVedere(k)}>{l}</button>
              ))}
              <input placeholder="Caută client, contract, număr…" value={cauta} onChange={e => setCauta(e.target.value)} style={{ maxWidth: 260 }} />
              {firme.length > 1 && (
                <select value={firma} onChange={e => setFirma(e.target.value)} style={{ maxWidth: 220 }}>
                  <option value="">Toate firmele</option>
                  {firme.map(x => <option key={x}>{x}</option>)}
                </select>
              )}
            </div>

            {lista.length === 0 ? (
              <div className="card"><StareGoala icon={vedere === 'incasate' ? 'ti-cash' : 'ti-circle-check'}
                titlu={vedere === 'incasate' ? 'Nicio factură încasată în listă' : vedere === 'restante' ? 'Nicio restanță' : 'Nicio factură de încasat'}
                text={vedere === 'incasate' ? 'Facturile marcate ca încasate apar aici.' : 'Facturile apar aici după ce marchezi chiriile ca emise în „De emis luna asta”.'} /></div>
            ) : (
              <div className="card" style={{ overflowX: "auto" }}>
                <table>
                  <thead><tr><th>Client</th><th>Contract</th><th>Firmă</th><th>Factură</th><th>Luna</th><th>Scadență</th><th style={{ textAlign: 'right' }}>Total (RON)</th><th></th></tr></thead>
                  <tbody>
                    {lista.map(f => {
                      const z = zileIntarziere(f.dataScadenta)
                      return (
                        <tr key={f.id}>
                          <td><strong>{f.clientNume || '—'}</strong>{numeIm(f.imobilId) && <div style={{ fontSize: 11, color: 'var(--slate)' }}>{numeIm(f.imobilId)}</div>}</td>
                          <td>{f.contractNr || '—'}</td>
                          <td style={{ fontSize: 12 }}>{f.entitate}</td>
                          <td>{f.numar ? `${f.serie || ''} ${f.numar}` : <span style={{ color: 'var(--slate)' }}>—</span>}</td>
                          <td>{numeLuna(f.luna)}</td>
                          <td>
                            {fmtD(f.dataScadenta)}
                            {vedere !== 'incasate' && z > 0 && <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>{z} {z === 1 ? 'zi' : 'zile'} întârziere</div>}
                            {vedere !== 'incasate' && z <= 0 && z >= -7 && <div style={{ fontSize: 11, color: 'var(--amber)' }}>{z === 0 ? 'scadentă azi' : `în ${-z} zile`}</div>}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(f.total)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {vedere === 'incasate'
                              ? <><span style={{ fontSize: 12, color: 'var(--green)', marginRight: 8 }}>încasat {fmtD(f.dataIncasare)}</span><button className="btn btn-ghost btn-sm" onClick={() => anuleaza(f)} title="Anulează încasarea"><i className="ti ti-arrow-back-up" /></button></>
                              : <button className="btn btn-primary btn-sm" onClick={() => setDialog({ f, data: azi() })}><i className="ti ti-check" /> Încasat</button>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {dialog && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !busy && setDialog(null)}>
          <div className="modal-box" style={{ width: 380 }}>
            <div className="modal-head"><h3>Marchează încasat</h3><button className="modal-close" onClick={() => setDialog(null)}><i className="ti ti-x" /></button></div>
            <div className="modal-body">
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                {dialog.f.clientNume} · contract {dialog.f.contractNr || '—'} · {numeLuna(dialog.f.luna)}<br />
                <strong>{fmt(dialog.f.total)} RON</strong>
              </div>
              <div className="form-group"><label>Data încasării</label>
                <input type="date" value={dialog.data} max={azi()} onChange={e => setDialog(d => ({ ...d, data: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" disabled={busy} onClick={() => setDialog(null)}>Renunță</button>
              <button className="btn btn-primary" disabled={busy || !dialog.data} onClick={marcheaza}>{busy ? 'Se salvează…' : 'Confirmă'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
