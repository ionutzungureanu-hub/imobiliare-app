import { useEffect, useState } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { getIndexuriPrimite, updateIndexPrimit, deleteIndexPrimit, saveCitire, getSpatii, getImobile } from '../firebase/firestore'
import { fmt } from '../utils'

export default function ValidareIndexuri() {
  const toast = useToast()
  const [indexuri,  setIndexuri]  = useState([])
  const [spatii,    setSpatii]    = useState([])
  const [imobile,   setImobile]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [valoriEdit,setValoriEdit]= useState({}) // id → valoare editată
  const [saving,    setSaving]    = useState({})

  const load = async () => {
    setLoading(true)
    const [idx, sp, im] = await Promise.all([
      getIndexuriPrimite('asteptare'),
      getSpatii(), getImobile()
    ])
    setIndexuri(idx)
    setSpatii(sp)
    setImobile(im)
    // Init valori editabile
    const init = {}
    idx.forEach(i => { init[i.id] = i.indexNou })
    setValoriEdit(init)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const getSpatiu  = (id) => spatii.find(s => s.id === id)
  const getImobil  = (id) => imobile.find(im => im.id === id)
  const fmtDate    = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  const handleValidare = async (idx) => {
    const indexFinal = Number(valoriEdit[idx.id])
    if (!indexFinal || isNaN(indexFinal)) { toast('Index invalid.', 'error'); return }
    setSaving(s => ({ ...s, [idx.id]: true }))
    try {
      // Salvează citire în Firestore
      await saveCitire({
        contorId:      idx.contorId,
        spatiuId:      idx.spatiuId,
        imobilId:      idx.imobilId,
        tip:           idx.tip,
        um:            idx.um,
        mod:           'index',
        index:         indexFinal,
        indexPrecedent: idx.indexPrecedent,
        consum:        idx.indexPrecedent != null ? Math.max(0, indexFinal - Number(idx.indexPrecedent)) : null,
        data:          new Date().toISOString().split('T')[0],
        nota:          'Validat din portal chiriaș',
        sursa:         'portal',
      })
      // Marchează ca validat
      await updateIndexPrimit(idx.id, { status: 'validat', indexValidat: indexFinal, validatLa: new Date() })
      toast(`Index ${idx.tip} validat și salvat!`)
      load()
    } catch { toast('Eroare la validare.', 'error') }
    finally { setSaving(s => ({ ...s, [idx.id]: false })) }
  }

  const handleRespinge = async (idx) => {
    if (!confirm(`Respingi indexul pentru "${idx.tip}"?`)) return
    await updateIndexPrimit(idx.id, { status: 'respins' })
    toast('Index respins.')
    load()
  }

  const iconForTip = (tip) => {
    if (tip?.includes('Energie')) return '⚡'
    if (tip?.includes('rece'))    return '💧'
    if (tip?.includes('cald'))    return '🌡️'
    if (tip?.includes('Gaze'))    return '🔥'
    return '📊'
  }

  return (
    <>
      <Topbar title="Validare indexuri" subtitle="Indexuri trimise de chiriași — în așteptare" />

      <div className="content">
        {loading ? (
          <div className="empty"><i className="ti ti-refresh" /><p>Se încarcă...</p></div>
        ) : indexuri.length === 0 ? (
          <div className="card">
            <div className="empty">
              <i className="ti ti-checks" style={{ color: 'var(--green)' }} />
              <p>Niciun index în așteptare. Toate sunt procesate!</p>
            </div>
          </div>
        ) : (
          <>
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <i className="ti ti-info-circle" />
              <span><strong>{indexuri.length}</strong> indexuri primite de la chiriași — verifică și validează.</span>
            </div>

            {indexuri.map(idx => {
              const spatiu = getSpatiu(idx.spatiuId)
              const imobil = getImobil(spatiu?.imobilId)
              const consum = idx.indexPrecedent != null
                ? Math.max(0, Number(valoriEdit[idx.id] || idx.indexNou) - Number(idx.indexPrecedent))
                : null

              return (
                <div key={idx.id} className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{iconForTip(idx.tip)}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{idx.tip}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                          {imobil?.nume} → {spatiu?.denumire}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--slate)', textAlign: 'right' }}>
                      Primit: {fmtDate(idx.dataTrimis)}
                      {idx.avePoza && (
                        <div style={{ color: 'var(--blue)', fontWeight: 500 }}>
                          <i className="ti ti-camera" style={{ fontSize: 12 }} /> Însoțit de poză
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div style={{ textAlign: 'center', padding: 12, background: 'var(--slate-light)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 4 }}>Index anterior</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>
                          {idx.indexPrecedent != null ? idx.indexPrecedent : '—'} <span style={{ fontSize: 12 }}>{idx.um}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: 12, background: 'var(--blue-light)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--blue)', marginBottom: 4 }}>Trimis de chiriaș</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>
                          {idx.indexNou} <span style={{ fontSize: 12 }}>{idx.um}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: 12, background: consum >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 4 }}>Consum calculat</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: consum >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {consum != null ? consum : '—'} <span style={{ fontSize: 12 }}>{idx.um}</span>
                        </div>
                      </div>
                    </div>

                    {/* Index editabil */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 6, display: 'block' }}>
                        Index de salvat (modifică dacă e greșit):
                      </label>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                          type="number"
                          value={valoriEdit[idx.id] ?? idx.indexNou}
                          onChange={e => setValoriEdit(v => ({ ...v, [idx.id]: e.target.value }))}
                          style={{ width: 140, padding: '8px 12px', fontSize: 18, fontWeight: 700, textAlign: 'center', border: '2px solid var(--blue)', borderRadius: 8, color: 'var(--blue)' }}
                        />
                        <span style={{ fontSize: 14, color: 'var(--slate)' }}>{idx.um}</span>
                        {String(valoriEdit[idx.id]) !== String(idx.indexNou) && (
                          <span className="badge badge-amber" style={{ fontSize: 11 }}>
                            ✎ Modificat față de original ({idx.indexNou})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acțiuni */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleValidare(idx)}
                        disabled={saving[idx.id]}
                      >
                        <i className={`ti ${saving[idx.id] ? 'ti-refresh' : 'ti-check'}`} />
                        {saving[idx.id] ? 'Se salvează...' : 'Validează și salvează'}
                      </button>
                      <button className="btn btn-ghost" onClick={() => handleRespinge(idx)}>
                        <i className="ti ti-x" /> Respinge
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </>
  )
}
