import { useEffect, useState, useRef } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useImobile } from '../hooks/useImobile'
import { getSpatii, getContoareSpatiu, getCitiriContor, saveCitire } from '../firebase/firestore'
import { extractIndexFromImage, fileToBase64 } from '../services/ocrService'
import { fmt } from '../utils'

const TODAY = new Date().toISOString().split('T')[0]

export default function UtilitatiMobile() {
  const toast = useToast()
  const { imobile } = useImobile()
  const fileRef = useRef()

  const [spatii,    setSpatii]    = useState([])
  const [imobilId,  setImobilId]  = useState('')
  const [spatiuId,  setSpatiuId]  = useState('')
  const [contoare,  setContoare]  = useState([])
  const [contorId,  setContorId]  = useState('')
  const [citiri,    setCitiri]    = useState([])
  const [loading,   setLoading]   = useState(false)
  const [ocrStatus, setOcrStatus] = useState('')

  // Form
  const [index,   setIndex]   = useState('')
  const [valoare, setValoare] = useState('')
  const [data,    setData]    = useState(TODAY)
  const [nota,    setNota]    = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    getSpatii().then(setSpatii)
  }, [imobile])

  // Când se schimbă spațiul → încarcă contoarele noi (getContoareSpatiu)
  useEffect(() => {
    if (!spatiuId) { setContoare([]); setContorId(''); setCitiri([]); return }
    setLoading(true)
    getContoareSpatiu(spatiuId).then(ct => {
      // Filtrăm doar contoarele cu index (nu fix/bloc pentru citire rapidă)
      const ctIndex = ct.filter(c => c.mod === 'index' || !c.mod)
      setContoare(ctIndex)
      if (ctIndex.length > 0) setContorId(ctIndex[0].id)
      else setContorId('')
      setLoading(false)
    })
  }, [spatiuId])

  // Când se schimbă contorul → încarcă citirile
  useEffect(() => {
    if (!contorId) { setCitiri([]); return }
    getCitiriContor(contorId).then(setCitiri)
  }, [contorId])

  const spatiiImobil = spatii.filter(s => s.imobilId === imobilId)
  const contor       = contoare.find(c => c.id === contorId)
  const ultimaCitire = citiri[0]
  const consum = contor?.mod === 'index' && index && ultimaCitire?.index != null
    ? Math.max(0, Number(index) - Number(ultimaCitire.index)) : null

  // OCR
  const handleOCR = async (file) => {
    if (!file) return
    setOcrStatus('processing')
    try {
      const base64 = await fileToBase64(file)
      const result = await extractIndexFromImage(base64, file.type || 'image/jpeg')
      if (result.success && result.value != null) {
        setIndex(String(result.value))
        setOcrStatus('ok:' + result.value)
      } else setOcrStatus('fail')
    } catch { setOcrStatus('fail') }
  }

  const handleSave = async () => {
    if (!contorId) { toast('Selectează un contor.', 'error'); return }
    if (!index && contor?.mod === 'index') { toast('Introdu indexul.', 'error'); return }
    if (!valoare && contor?.mod !== 'index') { toast('Introdu suma.', 'error'); return }
    setSaving(true)
    try {
      await saveCitire({
        contorId,
        spatiuId,
        imobilId,
        tip:            contor?.denumire || contor?.tip,
        um:             contor?.um,
        mod:            contor?.mod || 'index',
        destinatie:     contor?.destinatie,
        index:          contor?.mod === 'index' ? Number(index) : null,
        indexPrecedent: ultimaCitire?.index ?? null,
        consum,
        pret:           0,
        valoare:        contor?.mod === 'index' ? null : Number(valoare),
        data:           data || TODAY,
        nota:           nota || '',
      })
      toast(`✓ Citire salvată — ${contor?.denumire || contor?.tip}`)
      setIndex(''); setValoare(''); setNota(''); setOcrStatus('')
      getCitiriContor(contorId).then(setCitiri)
    } catch (err) {
      toast('Eroare: ' + (err?.message || 'Verifică regulile Firestore'), 'error')
    } finally { setSaving(false) }
  }

  return (
    <>
      <Topbar title="Citire rapidă" subtitle="Introducere indecși de pe telefon" />

      <div className="content" style={{ maxWidth: 520 }}>

        {/* ── Selector ierarhic ── */}
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
                  {spatiiImobil.map(s => <option key={s.id} value={s.id}>{s.denumire}</option>)}
                </select>
              </div>
            )}

            {spatiuId && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Contor</label>
                {loading ? (
                  <div style={{ color: 'var(--slate)', fontSize: 13, padding: '8px 0' }}>Se încarcă contoarele...</div>
                ) : contoare.length === 0 ? (
                  <div style={{ color: 'var(--amber)', fontSize: 13, padding: '8px 0' }}>
                    <i className="ti ti-alert-triangle" /> Niciun contor cu index configurat.
                    Adaugă contoare din <strong>Configurare → Contoare</strong>.
                  </div>
                ) : (
                  <select value={contorId} onChange={e => setContorId(e.target.value)}>
                    {contoare.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.denumire || c.tip} ({c.um})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Formular citire ── */}
        {contorId && contor && (
          <>
            {/* Ultima citire */}
            {ultimaCitire ? (
              <div className="card" style={{ marginBottom: 16, background: 'var(--blue-light)', border: '1px solid var(--blue-mid)' }}>
                <div className="card-body" style={{ padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Ultima citire înregistrată
                  </div>
                  <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
                    <div>
                      <div style={{ color: 'var(--slate)', fontSize: 11 }}>Data</div>
                      <strong>{ultimaCitire.data}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--slate)', fontSize: 11 }}>Index</div>
                      <strong>{ultimaCitire.index} {contor.um}</strong>
                    </div>
                    {ultimaCitire.consum != null && (
                      <div>
                        <div style={{ color: 'var(--slate)', fontSize: 11 }}>Consum</div>
                        <strong style={{ color: 'var(--green)' }}>{ultimaCitire.consum} {contor.um}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px 14px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d', fontSize: 13, marginBottom: 16, color: '#92400e' }}>
                <i className="ti ti-alert-triangle" /> Prima citire pentru acest contor — introdu indexul inițial.
              </div>
            )}

            {/* Input principal */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body">
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--blue)' }}>
                  {contor.denumire || contor.tip} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--slate)' }}>({contor.um})</span>
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Index nou ({contor.um})</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={index}
                    onChange={e => setIndex(e.target.value)}
                    placeholder={ultimaCitire ? `> ${ultimaCitire.index}` : 'Index inițial'}
                    autoFocus
                    style={{ fontSize: 28, padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--blue)', border: '2px solid var(--blue)', borderRadius: 10 }}
                  />
                  {consum !== null && (
                    <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, color: '#166534' }}>Consum calculat: </span>
                      <strong style={{ color: '#166534', fontSize: 18 }}>{consum} {contor.um}</strong>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Data citirii</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} />
                </div>

                {/* OCR */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 6 }}>
                    Fotografiază contorul (OCR automat)
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }}
                      onClick={() => fileRef.current?.click()} disabled={ocrStatus === 'processing'}>
                      <i className={`ti ${ocrStatus === 'processing' ? 'ti-refresh' : 'ti-camera'}`} />
                      {ocrStatus === 'processing' ? 'Se analizează...' : 'Camera'}
                    </button>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => {
                      const inp = document.createElement('input')
                      inp.type = 'file'; inp.accept = 'image/*'
                      inp.onchange = e => handleOCR(e.target.files[0])
                      inp.click()
                    }}>
                      <i className="ti ti-photo" /> Galerie
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment"
                    onChange={e => handleOCR(e.target.files[0])} style={{ display: 'none' }} />
                  {ocrStatus && ocrStatus !== 'processing' && (
                    <div style={{ marginTop: 6, fontSize: 12, textAlign: 'center', color: ocrStatus.startsWith('ok') ? 'var(--green)' : 'var(--red)' }}>
                      {ocrStatus.startsWith('ok') ? `✅ Detectat: ${ocrStatus.split(':')[1]} ${contor.um}` : '⚠️ Nu s-a putut citi — introdu manual'}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>Notă (opțional)</label>
                  <input value={nota} onChange={e => setNota(e.target.value)} placeholder="ex. Citire estimată" />
                </div>

                {/* Buton Save mare */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '16px', background: saving ? 'var(--slate)' : 'var(--blue)',
                    color: 'white', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                  }}
                >
                  <i className={`ti ${saving ? 'ti-refresh' : 'ti-device-floppy'}`} style={{ fontSize: 20 }} />
                  {saving ? 'Se salvează...' : `Salvează — ${contor.denumire || contor.tip}`}
                </button>
              </div>
            </div>

            {/* Istoric */}
            {citiri.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title" style={{ fontSize: 14 }}>Istoric — {contor.denumire || contor.tip}</div>
                </div>
                <table style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th style={{ textAlign: 'center' }}>Index</th>
                      <th style={{ textAlign: 'center' }}>Consum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citiri.map((cit, i) => (
                      <tr key={cit.id} style={{ background: i === 0 ? 'var(--blue-light)' : 'transparent' }}>
                        <td style={{ fontWeight: i === 0 ? 600 : 400 }}>{cit.data}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{cit.index} {contor.um}</td>
                        <td style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 600 }}>
                          {cit.consum != null ? `${cit.consum} ${contor.um}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
