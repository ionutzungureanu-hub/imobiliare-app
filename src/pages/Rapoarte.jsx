import { useEffect, useState } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useImobile } from '../hooks/useImobile'
import {
  getClienti, getSpatii, getContoareSpatiu, getCitiriPentruRaport
} from '../firebase/firestore'
import {
  exportRaportClient, exportRaportGeneral, exportRaportImobil
} from '../services/pdfRapoarte'
import { fmt } from '../utils'

const luna = (offset = 0) => {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.toISOString().slice(0, 7)
}

const primaZiLuna  = (ym) => `${ym}-01`
const ultimaZiLuna = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).toISOString().split('T')[0]
}

export default function Rapoarte() {
  const toast = useToast()
  const { imobile } = useImobile()

  const [tab,      setTab]      = useState('client')
  const [clienti,  setClienti]  = useState([])
  const [spatii,   setSpatii]   = useState([])
  const [contoare, setContoare] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [exporting,setExporting]= useState(false)

  // Filtre tab client
  const [selClient,   setSelClient]   = useState('')
  const [modPeriC,    setModPeriC]    = useState('luna') // 'luna' | 'interval'
  const [lunaC,       setLunaC]       = useState(luna(0))
  const [startC,      setStartC]      = useState(luna(-2))
  const [stopC,       setStopC]       = useState(luna(0))

  // Filtre tab general
  const [tipG,        setTipG]        = useState('toti') // 'toti'|'PF'|'PJ'
  const [selImobilG,  setSelImobilG]  = useState('')
  const [modPeriG,    setModPeriG]    = useState('luna')
  const [lunaG,       setLunaG]       = useState(luna(0))
  const [startG,      setStartG]      = useState(luna(-2))
  const [stopG,       setStopG]       = useState(luna(0))

  // Filtre tab imobil
  const [selImobilI,  setSelImobilI]  = useState('')
  const [modPeriI,    setModPeriI]    = useState('luna')
  const [lunaI,       setLunaI]       = useState(luna(0))
  const [startI,      setStartI]      = useState(luna(-2))
  const [stopI,       setStopI]       = useState(luna(0))

  // Preview data
  const [previewData, setPreviewData] = useState([])

  useEffect(() => {
    Promise.all([getClienti(), getSpatii()]).then(([cl, sp]) => {
      setClienti(cl); setSpatii(sp)
    })
  }, [imobile])

  // Încarcă contoarele tuturor spațiilor
  useEffect(() => {
    if (spatii.length === 0) return
    Promise.all(spatii.map(s => getContoareSpatiu(s.id))).then(results => {
      setContoare(results.flat())
    })
  }, [spatii])

  // ── Helpers perioadă ────────────────────────────────────────
  const getPerioadaStr = (mod, luna, start, stop) =>
    mod === 'luna'
      ? new Date(luna + '-01').toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
      : `${primaZiLuna(start)} — ${ultimaZiLuna(stop)}`

  const getDateRange = (mod, luna, start, stop) =>
    mod === 'luna'
      ? [primaZiLuna(luna), ultimaZiLuna(luna)]
      : [primaZiLuna(start), ultimaZiLuna(stop)]

  // ── Raport per client ────────────────────────────────────────
  const loadPreviewClient = async () => {
    if (!selClient) return
    setLoading(true)
    const sp = spatii.filter(s =>
      s.clienti?.find(sc => sc.clientId === selClient) || s.clientId === selClient
    )
    const [ds, de] = getDateRange(modPeriC, lunaC, startC, stopC)
    const citiri = await getCitiriPentruRaport(sp.map(s => s.id), ds, de)
    setPreviewData(citiri)
    setLoading(false)
  }

  const handleExportClient = async () => {
    if (!selClient) { toast('Selectează un client.', 'error'); return }
    setExporting(true)
    try {
      const sp = spatii.filter(s =>
        s.clienti?.find(sc => sc.clientId === selClient) || s.clientId === selClient
      )
      const [ds, de] = getDateRange(modPeriC, lunaC, startC, stopC)
      const citiri = await getCitiriPentruRaport(sp.map(s => s.id), ds, de)
      const client = clienti.find(c => c.id === selClient)
      exportRaportClient({ client, spatii: sp, contoare, citiri, perioada: getPerioadaStr(modPeriC, lunaC, startC, stopC) })
      toast('PDF generat!')
    } catch (err) { toast('Eroare: ' + err.message, 'error') }
    finally { setExporting(false) }
  }

  // ── Raport general ───────────────────────────────────────────
  const handleExportGeneral = async () => {
    setExporting(true)
    try {
      const imobileFiltrate = selImobilG ? imobile.filter(im => im.id === selImobilG) : imobile
      const spatiiFiltrate  = selImobilG ? spatii.filter(s => s.imobilId === selImobilG) : spatii
      const [ds, de] = getDateRange(modPeriG, lunaG, startG, stopG)
      const citiri = await getCitiriPentruRaport(spatiiFiltrate.map(s => s.id), ds, de)
      exportRaportGeneral({ clienti, spatii: spatiiFiltrate, contoare, citiri, perioada: getPerioadaStr(modPeriG, lunaG, startG, stopG), tip: tipG === 'toti' ? null : tipG })
      toast('PDF generat!')
    } catch (err) { toast('Eroare: ' + err.message, 'error') }
    finally { setExporting(false) }
  }

  // ── Raport imobil ────────────────────────────────────────────
  const handleExportImobil = async () => {
    setExporting(true)
    try {
      const imobileFiltrate = selImobilI ? imobile.filter(im => im.id === selImobilI) : imobile
      const spatiiFiltrate  = selImobilI ? spatii.filter(s => s.imobilId === selImobilI) : spatii
      const [ds, de] = getDateRange(modPeriI, lunaI, startI, stopI)
      const citiri = await getCitiriPentruRaport(spatiiFiltrate.map(s => s.id), ds, de)
      exportRaportImobil({ imobile: imobileFiltrate, spatii: spatiiFiltrate, clienti, contoare, citiri, perioada: getPerioadaStr(modPeriI, lunaI, startI, stopI) })
      toast('PDF generat!')
    } catch (err) { toast('Eroare: ' + err.message, 'error') }
    finally { setExporting(false) }
  }

  // ── Selector perioadă reusabil ───────────────────────────────
  const PerioadaSelector = ({ mod, setMod, luna, setLuna, start, setStart, stop, setStop }) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>Tip perioadă</label>
        <select value={mod} onChange={e => setMod(e.target.value)} style={{ minWidth: 140 }}>
          <option value="luna">Lună fixă</option>
          <option value="interval">Interval custom</option>
        </select>
      </div>
      {mod === 'luna' ? (
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Luna</label>
          <input type="month" value={luna} onChange={e => setLuna(e.target.value)} />
        </div>
      ) : (
        <>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>De la luna</label>
            <input type="month" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Până la luna</label>
            <input type="month" value={stop} onChange={e => setStop(e.target.value)} />
          </div>
        </>
      )}
    </div>
  )

  const clientCurent = clienti.find(c => c.id === selClient)
  const contorNume   = (contorId) => contoare.find(c => c.id === contorId)?.denumire || contoare.find(c => c.id === contorId)?.tip || '—'
  const spatiuNume   = (spatiuId) => spatii.find(s => s.id === spatiuId)?.denumire || '—'

  return (
    <>
      <Topbar title="Rapoarte" subtitle="Rapoarte consum și indici" />

      <div className="content">
        {/* Tab-uri */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {[
            { key: 'client',  icon: 'ti-user',    label: 'Per client' },
            { key: 'general', icon: 'ti-users',   label: 'General toți clienții' },
            { key: 'imobil',  icon: 'ti-building', label: 'Consum pe imobil' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none',
              cursor: 'pointer', borderBottom: `2px solid ${tab === t.key ? 'var(--blue)' : 'transparent'}`,
              color: tab === t.key ? 'var(--blue)' : 'var(--slate)', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit'
            }}>
              <i className={`ti ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB CLIENT ──────────────────────────────────────── */}
        {tab === 'client' && (
          <>
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ marginBottom: 0, minWidth: 220 }}>
                  <label>Client</label>
                  <select value={selClient} onChange={e => { setSelClient(e.target.value); setPreviewData([]) }}>
                    <option value="">— Alege client —</option>
                    {clienti.filter(c => c.activ !== false).map(c => (
                      <option key={c.id} value={c.id}>{c.nume} ({c.tip || 'PJ'})</option>
                    ))}
                  </select>
                </div>
                <PerioadaSelector mod={modPeriC} setMod={setModPeriC} luna={lunaC} setLuna={setLunaC} start={startC} setStart={setStartC} stop={stopC} setStop={setStopC} />
                <div style={{ display: 'flex', gap: 8, paddingBottom: 1 }}>
                  <button className="btn btn-ghost btn-sm" onClick={loadPreviewClient} disabled={!selClient || loading}>
                    <i className="ti ti-eye" /> {loading ? 'Se încarcă...' : 'Previzualizare'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleExportClient} disabled={!selClient || exporting}>
                    <i className="ti ti-download" /> {exporting ? 'Se generează...' : 'Export PDF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Preview tabel client */}
            {previewData.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{clientCurent?.nume}</div>
                    <div className="card-subtitle">{getPerioadaStr(modPeriC, lunaC, startC, stopC)} · {previewData.length} înregistrări</div>
                  </div>
                </div>
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Data</th><th>Spațiu</th><th>Contor</th>
                      <th style={{ textAlign: 'right' }}>Index</th>
                      <th style={{ textAlign: 'right' }}>Consum</th>
                      <th style={{ textAlign: 'right' }}>Valoare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((cit, i) => (
                      <tr key={cit.id} style={{ background: i % 2 === 0 ? 'white' : 'var(--slate-light)' }}>
                        <td>{cit.data}</td>
                        <td>{spatiuNume(cit.spatiuId)}</td>
                        <td>{contorNume(cit.contorId)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {cit.index != null ? `${cit.index} ${cit.um || ''}` : cit.valoare != null ? `${cit.valoare} RON` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>
                          {cit.consum != null ? `${cit.consum} ${cit.um || ''}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {cit.valoare != null ? fmt(cit.valoare) + ' RON' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--blue-light)', fontWeight: 700 }}>
                      <td colSpan={5} style={{ padding: '8px 12px', color: 'var(--blue)' }}>TOTAL VALOARE</td>
                      <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--blue)' }}>
                        {fmt(previewData.reduce((s, c) => s + (c.valoare || 0), 0))} RON
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {selClient && previewData.length === 0 && !loading && (
              <div className="card"><div className="empty"><i className="ti ti-file-off" /><p>Nicio citire în această perioadă.</p></div></div>
            )}
          </>
        )}

        {/* ── TAB GENERAL ─────────────────────────────────────── */}
        {tab === 'general' && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Tip clienți</label>
                <select value={tipG} onChange={e => setTipG(e.target.value)} style={{ minWidth: 160 }}>
                  <option value="toti">Toți clienții</option>
                  <option value="PF">Persoane Fizice</option>
                  <option value="PJ">Persoane Juridice</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Imobil</label>
                <select value={selImobilG} onChange={e => setSelImobilG(e.target.value)} style={{ minWidth: 160 }}>
                  <option value="">Toate imobilele</option>
                  {imobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
                </select>
              </div>
              <PerioadaSelector mod={modPeriG} setMod={setModPeriG} luna={lunaG} setLuna={setLunaG} start={startG} setStart={setStartG} stop={stopG} setStop={setStopG} />
              <button className="btn btn-primary btn-sm" onClick={handleExportGeneral} disabled={exporting} style={{ paddingBottom: 1 }}>
                <i className="ti ti-download" /> {exporting ? 'Se generează...' : 'Export PDF'}
              </button>
            </div>
            <div style={{ marginTop: 16, padding: 12, background: 'var(--blue-light)', borderRadius: 8, fontSize: 13, color: 'var(--slate)', border: '1px solid var(--blue-mid)' }}>
              <i className="ti ti-info-circle" /> Raportul va include toate citirile înregistrate pentru <strong>{tipG === 'toti' ? 'toți clienții' : tipG === 'PF' ? 'persoanele fizice' : 'persoanele juridice'}</strong>{selImobilG ? ` din ${imobile.find(im => im.id === selImobilG)?.nume}` : ' din toate imobilele'}, grupate separat PF/PJ.
            </div>
          </div>
        )}

        {/* ── TAB IMOBIL ──────────────────────────────────────── */}
        {tab === 'imobil' && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Imobil</label>
                <select value={selImobilI} onChange={e => setSelImobilI(e.target.value)} style={{ minWidth: 180 }}>
                  <option value="">Toate imobilele</option>
                  {imobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
                </select>
              </div>
              <PerioadaSelector mod={modPeriI} setMod={setModPeriI} luna={lunaI} setLuna={setLunaI} start={startI} setStart={setStartI} stop={stopI} setStop={setStopI} />
              <button className="btn btn-primary btn-sm" onClick={handleExportImobil} disabled={exporting} style={{ paddingBottom: 1 }}>
                <i className="ti ti-download" /> {exporting ? 'Se generează...' : 'Export PDF'}
              </button>
            </div>
            <div style={{ marginTop: 16, padding: 12, background: 'var(--blue-light)', borderRadius: 8, fontSize: 13, color: 'var(--slate)', border: '1px solid var(--blue-mid)' }}>
              <i className="ti ti-info-circle" /> Raportul va include consumul per spațiu și per contor pentru {selImobilI ? `imobilul ${imobile.find(im => im.id === selImobilI)?.nume}` : 'toate imobilele'}, cu totaluri per imobil.
            </div>
          </div>
        )}
      </div>
    </>
  )
}
