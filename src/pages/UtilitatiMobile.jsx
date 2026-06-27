import { useEffect, useState } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useImobile } from '../hooks/useImobile'
import { getSpatii, getContoare, getCitiri, addCitire } from '../firebase/firestore'
import { fmt } from '../utils'

export default function UtilitatiMobile() {
  const toast = useToast()
  const { imobile } = useImobile()

  const [spatii,    setSpatii]    = useState([])
  const [imobilId,  setImobilId]  = useState('')
  const [spatiuId,  setSpatiuId]  = useState('')
  const [contoare,  setContoare]  = useState([])
  const [contorId,  setContorId]  = useState('')
  const [citiri,    setCitiri]    = useState([])
  const [loading,   setLoading]   = useState(false)

  // Form citire
  const [mod,    setMod]    = useState('index')
  const [index,  setIndex]  = useState('')
  const [valoare,setValoare]= useState('')
  const [data,   setData]   = useState(new Date().toISOString().split('T')[0])
  const [nota,   setNota]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSpatii().then(sp => setSpatii(sp))
  }, [imobile])

  useEffect(() => {
    if (!spatiuId) { setContoare([]); setContorId(''); return }
    getContoare(spatiuId).then(ct => {
      setContoare(ct)
      if (ct.length > 0) setContorId(ct[0].id)
    })
  }, [spatiuId])

  useEffect(() => {
    if (!contorId) { setCitiri([]); return }
    setLoading(true)
    getCitiri(contorId).then(c => { setCitiri(c); setLoading(false) })
  }, [contorId])

  const spatiiImobil = spatii.filter(s => s.imobilId === imobilId)
  const contor       = contoare.find(c => c.id === contorId)
  const ultimaCitire = citiri[0]
  const consum       = mod === 'index' && index && ultimaCitire?.index !== undefined
    ? Math.max(0, Number(index) - Number(ultimaCitire.index))
    : null

  const handleSave = async () => {
    if (mod === 'index' && !index) { toast('Introdu indexul.', 'error'); return }
    if (mod === 'valoare' && !valoare) { toast('Introdu valoarea.', 'error'); return }
    setSaving(true)
    try {
      await addCitire({
        contorId, spatiuId,
        tip:    contor?.tip,
        um:     contor?.um,
        mod,
        index:  mod === 'index' ? Number(index) : null,
        consum: consum,
        valoare: mod === 'valoare' ? Number(valoare) : null,
        data, nota,
      })
      toast('Citire salvată! ✓')
      setIndex(''); setValoare(''); setNota('')
      getCitiri(contorId).then(setCitiri)
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <Topbar title="Citire utilități" subtitle="Introducere rapidă indecși" />

      <div className="content" style={{ maxWidth: 520 }}>

        {/* Selector ierarhic */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Imobil</label>
              <select value={imobilId} onChange={e => { setImobilId(e.target.value); setSpatiuId(''); setContorId('') }}>
                <option value="">— Alege imobil —</option>
                {imobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
              </select>
            </div>

            {imobilId && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Spațiu</label>
                <select value={spatiuId} onChange={e => { setSpatiuId(e.target.value); setContorId('') }}>
                  <option value="">— Alege spațiu —</option>
                  {spatiiImobil.map(s => <option key={s.id} value={s.id}>{s.denumire}{s.suprafata ? ` (${s.suprafata} mp)` : ''}</option>)}
                </select>
              </div>
            )}

            {spatiuId && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Contor / Utilitate</label>
                <select value={contorId} onChange={e => setContorId(e.target.value)}>
                  <option value="">— Alege contor —</option>
                  {contoare.map(c => <option key={c.id} value={c.id}>{c.tip} ({c.um})</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Formular citire */}
        {contorId && contor && (
          <>
            {/* Ultima citire */}
            {ultimaCitire && (
              <div className="card" style={{ marginBottom: 16, background: 'var(--blue-light)', border: '1px solid var(--blue-mid)' }}>
                <div className="card-body" style={{ padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Ultima citire
                  </div>
                  <div style={{ display: 'flex', gap: 20, fontSize: 14 }}>
                    <div>
                      <div style={{ color: 'var(--slate)', fontSize: 11 }}>Data</div>
                      <strong>{ultimaCitire.data}</strong>
                    </div>
                    {ultimaCitire.mod === 'index' ? (
                      <div>
                        <div style={{ color: 'var(--slate)', fontSize: 11 }}>Index</div>
                        <strong>{ultimaCitire.index} {contor.um}</strong>
                      </div>
                    ) : (
                      <div>
                        <div style={{ color: 'var(--slate)', fontSize: 11 }}>Valoare</div>
                        <strong>{ultimaCitire.valoare} RON</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Formular */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body">
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
                  Citire nouă — {contor.tip}
                </div>

                {/* Mod */}
                {!contor.fix && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {[['index', 'Index (calcul auto)'], ['valoare', 'Valoare RON']].map(([k, l]) => (
                      <button key={k} onClick={() => setMod(k)}
                        className={`btn btn-sm ${mod === k ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1 }}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input principal — mare pentru telefon */}
                {mod === 'index' ? (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Index nou ({contor.um})</label>
                    <input
                      type="number"
                      value={index}
                      onChange={e => setIndex(e.target.value)}
                      placeholder="ex. 1250"
                      autoFocus
                      style={{ fontSize: 24, padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}
                    />
                    {consum !== null && (
                      <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--green-light, #f0fdf4)', borderRadius: 8, border: '1px solid #86efac', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, color: '#166534' }}>Consum calculat: </span>
                        <strong style={{ color: '#166534', fontSize: 16 }}>{consum} {contor.um}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Valoare de plată (RON)</label>
                    <input
                      type="number"
                      value={valoare}
                      onChange={e => setValoare(e.target.value)}
                      placeholder="ex. 245.50"
                      style={{ fontSize: 24, padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Data citirii</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>Notă (opțional)</label>
                  <input value={nota} onChange={e => setNota(e.target.value)} placeholder="ex. Citire estimată" />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 600 }}
                >
                  <i className={`ti ${saving ? 'ti-refresh' : 'ti-check'}`} />
                  {saving ? 'Se salvează…' : 'Salvează citire'}
                </button>
              </div>
            </div>

            {/* Istoric citiri */}
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ fontSize: 14 }}>Istoric citiri — {contor.tip}</div>
              </div>
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--slate)' }}>Se încarcă...</div>
              ) : citiri.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--slate)', fontSize: 13 }}>Nicio citire înregistrată.</div>
              ) : (
                <table style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Dată</th>
                      <th>{contor.fix ? 'Valoare RON' : 'Index'}</th>
                      {!contor.fix && <th>Consum</th>}
                      <th>Notă</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citiri.map((cit, i) => (
                      <tr key={cit.id} style={{ background: i === 0 ? 'var(--blue-light)' : 'transparent' }}>
                        <td style={{ fontWeight: i === 0 ? 600 : 400 }}>{cit.data}</td>
                        <td>
                          {cit.mod === 'index'
                            ? <strong>{cit.index} {contor.um}</strong>
                            : <strong>{cit.valoare} RON</strong>
                          }
                        </td>
                        {!contor.fix && (
                          <td>
                            {cit.consum !== null && cit.consum !== undefined
                              ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>{cit.consum} {contor.um}</span>
                              : <span style={{ color: 'var(--slate)' }}>—</span>
                            }
                          </td>
                        )}
                        <td style={{ color: 'var(--slate)', fontSize: 11 }}>{cit.nota || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {!contorId && spatiuId && contoare.length === 0 && (
          <div className="card">
            <div className="empty"><i className="ti ti-plug" /><p>Niciun contor configurat pentru acest spațiu.</p></div>
          </div>
        )}
      </div>
    </>
  )
}
