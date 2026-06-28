import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useImobile } from '../hooks/useImobile'
import {
  getSpatii, getClienti, getImobile,
  getContoareSpatiu, saveContor, deleteContor,
  getCitiriContor, saveCitire, deleteCitire2,
  getPreturiImobil, updateSpatiuMod,
  getAllContoareCuCitiri
} from '../firebase/firestore'
import { extractIndexFromImage, fileToBase64 } from '../services/ocrService'
import { exportDateContoare, exportIstoricContor } from '../services/exportContoare'
import { fmt } from '../utils'

const TODAY = new Date().toISOString().split('T')[0]

// ── Contor card component ─────────────────────────────────────
function ContorCard({ contor, citiri, preturi, onSave, onDelete, onExportIstoric }) {
  const [index,    setIndex]    = useState('')
  const [valoare,  setValoare]  = useState('')
  const [data,     setData]     = useState(TODAY)
  const [nota,     setNota]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [istoricOpen, setIstoricOpen] = useState(false)
  const [ocrStatus, setOcrStatus] = useState('') // 'processing' | 'ok' | 'fail'
  const fileRef = useRef()

  const ultima  = citiri[0]
  const consum  = contor.mod === 'index' && index && ultima?.index != null
    ? Math.max(0, Number(index) - Number(ultima.index)) : null
  const pret    = preturi[contor.denumire] || preturi[contor.um] || 0
  const valCalc = consum !== null ? consum * pret : null

  const handleOCR = async (file) => {
    if (!file) return
    setOcrStatus('processing')
    try {
      const base64 = await fileToBase64(file)
      const result = await extractIndexFromImage(base64, file.type || 'image/jpeg')
      if (result.success && result.value != null) {
        setIndex(String(result.value))
        setOcrStatus('ok:' + result.value)
      } else {
        setOcrStatus('fail')
      }
    } catch { setOcrStatus('fail') }
  }

  const handleSave = async () => {
    if (contor.mod === 'index' && !index) return
    if ((contor.mod === 'fix' || contor.mod === 'bloc') && !valoare) return
    setSaving(true)
    try {
      await saveCitire({
        contorId: contor.id, spatiuId: contor.spatiuId, imobilId: contor.imobilId,
        tip: contor.denumire, um: contor.um, mod: contor.mod,
        destinatie: contor.destinatie,
        index:  contor.mod === 'index' ? Number(index) : null,
        indexPrecedent: ultima?.index ?? null,
        consum, pret,
        valoare: contor.mod === 'index' ? valCalc : Number(valoare),
        data, nota,
      })
      setIndex(''); setValoare(''); setNota('')
      setOcrStatus('')
      onSave()
    } catch { }
    finally { setSaving(false) }
  }

  const istoRender = istoricOpen ? citiri : citiri.slice(0, 3)

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--slate-light)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{contor.denumire}</div>
          <div style={{ fontSize: 11, color: 'var(--slate)' }}>
            {contor.mod === 'index' ? `Index · ${contor.um}` : contor.mod === 'fix' ? 'Sumă fixă' : 'Sumă bloc'}
            {pret > 0 && contor.mod === 'index' && ` · ${pret} RON/${contor.um}`}
          </div>
        </div>
        <button className="remove-btn" onClick={() => onDelete(contor)} title="Șterge contor"><i className="ti ti-x" style={{ fontSize: 13 }} /></button>
      </div>

      {/* Ultima citire */}
      {ultima && (
        <div style={{ padding: '6px 14px', background: 'var(--blue-light)', fontSize: 12, color: 'var(--blue)' }}>
          Ultima: {ultima.data} → {contor.mod === 'index' ? `${ultima.index} ${contor.um}` : `${fmt(ultima.valoare)} RON`}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {contor.mod === 'index' ? (
          <div style={{ flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 4 }}>Index nou ({contor.um})</div>
            <input type="number" value={index} onChange={e => setIndex(e.target.value)}
              placeholder={ultima ? `> ${ultima.index}` : 'Index inițial'}
              style={{ width: '100%', padding: '8px 10px', fontSize: 18, fontWeight: 700, textAlign: 'center', border: '2px solid var(--blue)', borderRadius: 8, color: 'var(--blue)', boxSizing: 'border-box' }} />
            {consum !== null && (
              <div style={{ fontSize: 11, marginTop: 4, color: 'var(--green)', textAlign: 'center' }}>
                Consum: <strong>{consum} {contor.um}</strong>
                {pret > 0 && <> → <strong>{fmt(valCalc)} RON</strong></>}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 4 }}>Sumă (RON)</div>
            <input type="number" value={valoare} onChange={e => setValoare(e.target.value)}
              placeholder="0.00" step="0.01"
              style={{ width: '100%', padding: '8px 10px', fontSize: 18, fontWeight: 700, textAlign: 'center', border: '2px solid var(--green)', borderRadius: 8, color: 'var(--green)', boxSizing: 'border-box' }} />
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 4 }}>Data</div>
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--border)' }} />
        </div>

        {/* OCR button for index mode */}
        {contor.mod === 'index' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 4 }}>OCR</div>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}
              title="Fotografiază contorul — OCR automat" disabled={ocrStatus === 'processing'}>
              <i className={`ti ${ocrStatus === 'processing' ? 'ti-refresh' : 'ti-camera'}`} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={e => handleOCR(e.target.files[0])} style={{ display: 'none' }} />
            {ocrStatus && (
              <div style={{ fontSize: 10, color: ocrStatus.startsWith('ok') ? 'var(--green)' : ocrStatus === 'fail' ? 'var(--red)' : 'var(--blue)', whiteSpace: 'nowrap' }}>
                {ocrStatus === 'processing' ? '🔍 Analizez...' : ocrStatus.startsWith('ok') ? `✅ ${ocrStatus.split(':')[1]}` : '⚠️ Manual'}
              </div>
            )}
          </div>
        )}

        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}
          style={{ padding: '8px 14px', height: 38 }}>
          {saving ? <i className="ti ti-refresh" /> : <i className="ti ti-device-floppy" />}
        </button>
      </div>

      {/* Notă */}
      <div style={{ padding: '0 14px 10px' }}>
        <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Notă (opțional)"
          style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, boxSizing: 'border-box' }} />
      </div>

      {/* Istoric cascade */}
      {citiri.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setIstoricOpen(o => !o)}
            style={{ width: '100%', padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--slate)', fontFamily: 'inherit' }}>
            <span><i className="ti ti-history" style={{ fontSize: 12 }} /> Istoric ({citiri.length} citiri)</span>
            <i className={`ti ${istoricOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12 }} />
          </button>
          {(istoricOpen || citiri.length <= 3) && (
            <div>
              <table style={{ fontSize: 11, width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--slate-light)' }}>
                  <tr>
                    <th style={{ padding: '4px 14px', textAlign: 'left' }}>Data</th>
                    {contor.mod === 'index' && <><th style={{ padding: '4px 8px' }}>Index</th><th style={{ padding: '4px 8px' }}>Consum</th></>}
                    <th style={{ padding: '4px 14px', textAlign: 'right' }}>Valoare</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {istoRender.map((cit, i) => (
                    <tr key={cit.id} style={{ background: i === 0 ? 'var(--blue-light)' : i % 2 === 0 ? 'white' : 'var(--slate-light)' }}>
                      <td style={{ padding: '4px 14px', fontWeight: i === 0 ? 600 : 400 }}>{cit.data}</td>
                      {contor.mod === 'index' && (
                        <>
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>{cit.index} {contor.um}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'center', color: 'var(--green)', fontWeight: 600 }}>{cit.consum ?? '—'}</td>
                        </>
                      )}
                      <td style={{ padding: '4px 14px', textAlign: 'right', fontWeight: 500 }}>
                        {cit.valoare != null ? fmt(cit.valoare) + ' RON' : '—'}
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <button className="remove-btn" onClick={() => deleteCitire2(cit.id).then(onSave)}>
                          <i className="ti ti-x" style={{ fontSize: 11 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!istoricOpen && citiri.length > 3 && (
                <div style={{ padding: '4px 14px', fontSize: 11, color: 'var(--slate)' }}>
                  + {citiri.length - 3} citiri mai vechi...
                </div>
              )}
              <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                  onClick={() => exportIstoricContor(contor, citiri)}>
                  <i className="ti ti-download" /> Export PDF istoric complet
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal contor nou ──────────────────────────────────────────
function ModalContorNou({ spatiu, imobil, contoareExistente, allSpatiiImobil, onSave, onClose }) {
  const [denumire, setDenumire] = useState('')
  const [um,       setUm]       = useState('')
  const [mod,      setMod]      = useState('index')
  const [dest,     setDest]     = useState('chirias')
  const [copyFrom, setCopyFrom] = useState('')
  const [saving,   setSaving]   = useState(false)
  const toast = useToast()

  const handleCopy = (spatiuId) => {
    setCopyFrom(spatiuId)
    // Just set the spatiuId — user will choose which contor to copy
  }

  const handleSave = async () => {
    if (!denumire.trim()) { toast('Completează denumirea.', 'error'); return }
    if (!um.trim()) { toast('Completează unitatea de măsură.', 'error'); return }
    setSaving(true)
    try {
      await saveContor({
        spatiuId: spatiu.id,
        imobilId: imobil?.id || spatiu.imobilId,
        denumire: denumire.trim(),
        um: um.trim(),
        mod,
        destinatie: dest,
        ordine: contoareExistente.length,
      })
      toast('Contor adăugat!')
      onSave()
      onClose()
    } catch { toast('Eroare.', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 520 }}>
        <div className="modal-head">
          <h3>Contor nou — {spatiu?.denumire}</h3>
          <button className="modal-close" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body">

          {/* Copiere de la alt spațiu */}
          {allSpatiiImobil?.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--blue-light)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--blue)' }}>
                <i className="ti ti-copy" /> Copiază configurație de la alt spațiu
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {allSpatiiImobil.filter(s => s.id !== spatiu.id).map(s => (
                  <button key={s.id} className="btn btn-ghost btn-sm" onClick={async () => {
                    const ct = await import('../firebase/firestore').then(m => m.getContoareSpatiu(s.id))
                    if (ct.length === 0) { toast('Niciun contor pe spațiul ales.', 'error'); return }
                    // Use first contor as template
                    const tpl = ct[0]
                    setDenumire(tpl.denumire); setUm(tpl.um); setMod(tpl.mod); setDest(tpl.destinatie || 'chirias')
                    toast(`Template copiat de la ${s.denumire}`)
                  }}>
                    {s.denumire}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group full">
              <label>Denumire contor *</label>
              <input value={denumire} onChange={e => setDenumire(e.target.value)}
                placeholder="ex. Apometru rece bucătărie, Energie electrică, Internet" autoFocus />
            </div>
            <div className="form-group">
              <label>Unitate de măsură *</label>
              <input value={um} onChange={e => setUm(e.target.value)}
                placeholder="mc / kWh / RON" />
            </div>
            <div className="form-group">
              <label>Mod calcul</label>
              <select value={mod} onChange={e => setMod(e.target.value)}>
                <option value="index">Index — consum automat (contor fizic)</option>
                <option value="fix">Sumă fixă — introduci suma direct</option>
                <option value="bloc">Sumă bloc — suma de la administrație</option>
              </select>
            </div>
            <div className="form-group full">
              <label>Destinație</label>
              <select value={dest} onChange={e => setDest(e.target.value)}>
                <option value="administratie">Administrație bloc — indexul merge la bloc</option>
                <option value="chirias">Chiriaș — apare pe nota/factura chiriașului</option>
                <option value="intern">Intern — doar pentru evidență</option>
              </select>
              <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>
                {dest === 'administratie' && '📊 Indexul se trimite administrației. Suma primită de la bloc se introduce separat ca contor "bloc".'}
                {dest === 'chirias' && '👤 Apare pe nota de calcul sau factura chiriașului.'}
                {dest === 'intern' && '🔒 Doar pentru evidență internă — nu apare pe nicio notă.'}
              </div>
            </div>
          </div>

          {/* Info mod */}
          <div style={{ marginTop: 8, padding: 10, background: 'var(--slate-light)', borderRadius: 8, fontSize: 12, color: 'var(--slate)' }}>
            {mod === 'index' && '📊 Introduci indexul la fiecare citire. Consumul se calculează automat. OCR disponibil.'}
            {mod === 'fix' && '💶 Introduci suma RON direct (ex. abonament internet 50 RON/lună).'}
            {mod === 'bloc' && '🏢 Suma comunicată de administrația blocului (apă, întreținere).'}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Anulează</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <i className="ti ti-plus" /> {saving ? 'Se salvează...' : 'Adaugă contor'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pagina principală ─────────────────────────────────────────
export default function Utilitati() {
  const navigate  = useNavigate()
  const toast     = useToast()
  const { imobile } = useImobile()

  const [allSpatii,  setAllSpatii]  = useState([])
  const [clienti,    setClienti]    = useState([])
  const [allImobile, setAllImobile] = useState([])
  const [imobilId,   setImobilId]   = useState('')
  const [spatiuId,   setSpatiuId]   = useState('')
  const [contoare,   setContoare]   = useState([])
  const [citiriMap,  setCitiriMap]  = useState({})
  const [preturi,    setPreturi]    = useState({})
  const [spatiu,     setSpatiu]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [modalContor,setModalContor]= useState(false)
  const [exporting,  setExporting]  = useState(false)

  useEffect(() => {
    Promise.all([getSpatii(), getClienti(), getImobile()]).then(([sp, cl, im]) => {
      setAllSpatii(sp); setClienti(cl); setAllImobile(im)
    })
  }, [imobile])

  const spatiiImobil = allSpatii.filter(s => s.imobilId === imobilId)
  const imobilCurent = allImobile.find(im => im.id === imobilId)

  const loadContoare = useCallback(async () => {
    if (!spatiuId) return
    setLoading(true)
    const sp = allSpatii.find(s => s.id === spatiuId)
    setSpatiu(sp)
    const [ct, pr] = await Promise.all([
      getContoareSpatiu(spatiuId),
      imobilId ? getPreturiImobil(imobilId) : Promise.resolve({})
    ])
    setContoare(ct)
    setPreturi(pr)
    const map = {}
    await Promise.all(ct.map(async c => { map[c.id] = await getCitiriContor(c.id) }))
    setCitiriMap(map)
    setLoading(false)
  }, [spatiuId, imobilId, allSpatii])

  useEffect(() => { loadContoare() }, [loadContoare])

  const client = clienti.find(c =>
    spatiu?.clienti?.find(sc => sc.clientId === c.id && sc.rol === 'Chiriaș principal') ||
    c.id === spatiu?.clientId
  )

  const modUtilitati = spatiu?.modUtilitati || (client?.tip === 'PJ' ? 'factura' : 'nota')

  const handleDeleteContor = async (c) => {
    if (!confirm(`Ștergi contorul "${c.denumire}" și toate citirile?`)) return
    await deleteContor(c.id); toast('Contor șters.'); loadContoare()
  }

  const handleExportAll = async () => {
    setExporting(true)
    try {
      const all = await getAllContoareCuCitiri()
      await exportDateContoare(all, allSpatii, allImobile)
      toast('Export generat!')
    } catch { toast('Eroare la export.', 'error') }
    finally { setExporting(false) }
  }

  // Grupare contoare pe destinație
  // Backward compat: contoarele fără destinatie → tratate ca 'chirias'
  const ctAdministratie = contoare.filter(c => c.destinatie === 'administratie')
  const ctBloc          = contoare.filter(c => c.mod === 'bloc')
  const ctChirias       = contoare.filter(c => c.mod !== 'bloc' && (c.destinatie === 'chirias' || !c.destinatie))
  const ctIntern        = contoare.filter(c => c.destinatie === 'intern')

  // Total chiriaș
  const totalChirias = contoare
    .filter(c => c.mod === 'bloc' || c.destinatie === 'chirias' || (!c.destinatie && c.mod !== 'administratie'))
    .reduce((sum, c) => {
      const cits = citiriMap[c.id] || []
      const ultima = cits[0]
      return sum + (ultima?.valoare || 0)
    }, 0)

  return (
    <>
      <Topbar title="Utilități" subtitle="Contoare personalizate per spațiu">
        <button className="btn btn-ghost btn-sm" onClick={handleExportAll} disabled={exporting}>
          <i className={`ti ${exporting ? 'ti-refresh' : 'ti-download'}`} /> Export toate datele
        </button>
      </Topbar>

      <div className="content">
        {/* Selector */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
              <label>Imobil</label>
              <select value={imobilId} onChange={e => { setImobilId(e.target.value); setSpatiuId('') }}>
                <option value="">— Alege imobil —</option>
                {imobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
              </select>
            </div>
            {imobilId && (
              <div className="form-group" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
                <label>Spațiu</label>
                <select value={spatiuId} onChange={e => setSpatiuId(e.target.value)}>
                  <option value="">— Alege spațiu —</option>
                  {spatiiImobil.map(s => <option key={s.id} value={s.id}>{s.denumire}</option>)}
                </select>
              </div>
            )}
            {spatiu && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--slate)' }}>Mod:</span>
                {['nota', 'factura'].map(m => (
                  <button key={m} onClick={() => updateSpatiuMod(spatiuId, m).then(loadContoare)}
                    className={`btn btn-sm ${modUtilitati === m ? 'btn-primary' : 'btn-ghost'}`}>
                    {m === 'nota' ? '🧮 Notă calcul' : '🧾 Facturare'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading && <div className="empty"><i className="ti ti-refresh" /><p>Se încarcă...</p></div>}

        {!loading && spatiuId && (
          <>
            {/* Buton adaugă contor */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setModalContor(true)}>
                <i className="ti ti-plus" /> Contor nou
              </button>
            </div>

            {contoare.length === 0 && (
              <div className="card">
                <div className="empty">
                  <i className="ti ti-plug" />
                  <p>Niciun contor. Adaugă primul contor pentru <strong>{spatiu?.denumire}</strong>.</p>
                </div>
              </div>
            )}

            {/* ── SECȚIUNEA ADMINISTRAȚIE BLOC ──────────────── */}
            {ctAdministratie.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 12px', background: '#7c3aed20', borderRadius: 8, border: '1px solid #7c3aed40' }}>
                  <i className="ti ti-building" style={{ color: '#7c3aed' }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Administrație bloc
                  </span>
                  <span style={{ fontSize: 11, color: '#7c3aed80' }}>— indexuri transmise la bloc</span>
                </div>
                {ctAdministratie.map(c => (
                  <ContorCard key={c.id} contor={c} citiri={citiriMap[c.id] || []}
                    preturi={preturi} onSave={loadContoare} onDelete={handleDeleteContor}
                    onExportIstoric={exportIstoricContor} />
                ))}
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 8 }}
                  onClick={() => navigate(`/nota-administratie?imobilId=${imobilId}&spatiuId=${spatiuId}`)}>
                  <i className="ti ti-file-text" /> Generează notă administrație
                </button>
              </div>
            )}

            {/* ── SECȚIUNEA SUMĂ BLOC ───────────────────────── */}
            {ctBloc.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 12px', background: '#0284c720', borderRadius: 8, border: '1px solid #0284c740' }}>
                  <i className="ti ti-currency-leu" style={{ color: '#0284c7' }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Sumă comunicată de bloc
                  </span>
                  <span style={{ fontSize: 11, color: '#0284c780' }}>— introdusă după primirea chitanței</span>
                </div>
                {ctBloc.map(c => (
                  <ContorCard key={c.id} contor={c} citiri={citiriMap[c.id] || []}
                    preturi={preturi} onSave={loadContoare} onDelete={handleDeleteContor}
                    onExportIstoric={exportIstoricContor} />
                ))}
              </div>
            )}

            {/* ── ALTE UTILITĂȚI (chiriaș) ──────────────────── */}
            {ctChirias.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 12px', background: '#16a34a20', borderRadius: 8, border: '1px solid #16a34a40' }}>
                  <i className="ti ti-plug" style={{ color: '#16a34a' }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Utilități chiriaș
                  </span>
                </div>
                {ctChirias.map(c => (
                  <ContorCard key={c.id} contor={c} citiri={citiriMap[c.id] || []}
                    preturi={preturi} onSave={loadContoare} onDelete={handleDeleteContor}
                    onExportIstoric={exportIstoricContor} />
                ))}
              </div>
            )}

            {/* ── INTERN ───────────────────────────────────── */}
            {ctIntern.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 12px', background: 'var(--slate-light)', borderRadius: 8 }}>
                  <i className="ti ti-lock" style={{ color: 'var(--slate)' }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Intern</span>
                </div>
                {ctIntern.map(c => (
                  <ContorCard key={c.id} contor={c} citiri={citiriMap[c.id] || []}
                    preturi={preturi} onSave={loadContoare} onDelete={handleDeleteContor}
                    onExportIstoric={exportIstoricContor} />
                ))}
              </div>
            )}

            {/* ── TOTAL CHIRIAȘ ─────────────────────────────── */}
            {(ctChirias.length > 0 || ctBloc.length > 0) && (
              <div style={{ background: 'var(--blue)', borderRadius: 10, padding: '14px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'white' }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>TOTAL DE COMUNICAT CHIRIAȘULUI</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>Din ultima citire per contor</div>
                </div>
                <div style={{ color: 'white', fontSize: 24, fontWeight: 700 }}>{fmt(totalChirias)} RON</div>
              </div>
            )}

            {/* Acțiuni finale */}
            {contoare.length > 0 && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {modUtilitati === 'nota' ? (
                  <button className="btn btn-primary" onClick={() => navigate(`/nota-calcul?spatiuId=${spatiuId}`)}>
                    <i className="ti ti-calculator" /> Generează notă chiriaș
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => navigate(`/emite-utilitati?spatiuId=${spatiuId}`)}>
                    <i className="ti ti-receipt" /> Generează factură utilități
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {!spatiuId && imobilId && !loading && (
          <div className="empty"><i className="ti ti-building" /><p>Selectează un spațiu.</p></div>
        )}
        {!imobilId && !loading && (
          <div className="empty"><i className="ti ti-home" /><p>Selectează un imobil pentru a începe.</p></div>
        )}
      </div>

      {/* Modal contor nou */}
      {modalContor && (
        <ModalContorNou
          spatiu={spatiu}
          imobil={imobilCurent}
          contoareExistente={contoare}
          allSpatiiImobil={spatiiImobil}
          onSave={loadContoare}
          onClose={() => setModalContor(false)}
        />
      )}
    </>
  )
}
