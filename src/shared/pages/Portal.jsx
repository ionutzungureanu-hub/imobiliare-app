import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ref as stRef, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase/config'
import { getPortalPublic, saveIndexPrimit, saveCererePortal } from '../firebase/firestore'
import { extractIndexFromImage, fileToBase64 } from '../../modules/administrare/services/ocrService'

export default function Portal() {
  const { token }     = useParams()
  const [portal,      setPortal]      = useState(null)
  const [contoare,    setContoare]    = useState([])
  const [ultimeCitiri,setUltimeCitiri]= useState({}) // contorId → ultima citire
  const [valori,      setValori]      = useState({})  // contorId → index introdus
  const [poze,        setPoze]        = useState({})  // contorId → { preview, status }
  const [loading,     setLoading]     = useState(true)
  const [sending,     setSending]     = useState(false)
  const [trimis,      setTrimis]      = useState(false)
  const [error,       setError]       = useState('')
  const cameraRefs    = useRef({})

  // ── Documente + sesizări ─────────────────────────────────────
  const [tipMsg,   setTipMsg]   = useState('sesizare')
  const [textMsg,  setTextMsg]  = useState('')
  const [numeMsg,  setNumeMsg]  = useState('')
  const [contactMsg, setContactMsg] = useState('')
  const [fisiere,  setFisiere]  = useState([])
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgTrimis, setMsgTrimis]   = useState(false)
  const [errMsg,   setErrMsg]   = useState('')
  const MAX_FIS = 5, MAX_MB = 10
  const TIPURI_OK = /^(image\/|application\/pdf|application\/msword|application\/vnd\.openxmlformats|text\/plain)/

  const adaugaFisiere = (lista) => {
    const noi = []
    for (const f of Array.from(lista || [])) {
      if (!TIPURI_OK.test(f.type)) { setErrMsg(`„${f.name}”: tip de fișier neacceptat (poze, PDF, Word).`); continue }
      if (f.size > MAX_MB * 1024 * 1024) { setErrMsg(`„${f.name}” depășește ${MAX_MB} MB.`); continue }
      noi.push(f)
    }
    setFisiere(prev => [...prev, ...noi].slice(0, MAX_FIS))
  }

  const handleTrimiteMsg = async () => {
    if (!textMsg.trim() && fisiere.length === 0) { setErrMsg('Scrieți un mesaj sau atașați un document.'); return }
    setSendingMsg(true); setErrMsg('')
    try {
      const urcate = []
      for (const f of fisiere) {
        const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `portal/${token}/${Date.now()}_${safe}`
        await uploadBytes(stRef(storage, path), f, { contentType: f.type })
        urcate.push({ nume: f.name, path, tip: f.type, marime: f.size })
      }
      await saveCererePortal({
        token, spatiuId: portal.spatiuId, imobilId: portal.imobilId,
        tip: urcate.length > 0 && !textMsg.trim() ? 'document' : tipMsg,
        text: textMsg.trim(), fisiere: urcate,
        chiriasNume: numeMsg.trim(), contact: contactMsg.trim(),
      })
      setMsgTrimis(true); setTextMsg(''); setFisiere([])
    } catch (e) { console.error(e); setErrMsg('Eroare la trimitere. Încercați din nou.') }
    finally { setSendingMsg(false) }
  }

  useEffect(() => {
    if (!token) { setError('Link invalid.'); setLoading(false); return }
    getPortalPublic(token).then(async p => {
      if (!p || p.activ === false) { setError('Acest link nu este valid sau a fost dezactivat.'); setLoading(false); return }
      if (p.valabilPanaTs?.seconds && p.valabilPanaTs.seconds * 1000 < Date.now()) {
        setError('Acest link nu mai este valabil (contractul a expirat). Contactați administratorul.'); setLoading(false); return
      }
      setPortal(p)
      // Contoarele și ultimele indexuri vin din „instantaneul” salvat în portal (nu citim direct din baza de date)
      const active = (p.contoare || []).filter(c => (p.utilitatiActive?.includes(c.denumire || c.tip) ?? true))
      setContoare(active)
      const map = {}
      for (const c of active) if (c.ultimIndex != null) map[c.id] = { index: c.ultimIndex, data: c.ultimaData }
      setUltimeCitiri(map)
      setLoading(false)
    }).catch(() => { setError('Eroare la încărcarea portalului.'); setLoading(false) })
  }, [token])

  // ── OCR din poză ────────────────────────────────────────────
  const handlePoza = async (contorId, file) => {
    if (!file) return
    const preview = URL.createObjectURL(file)
    setPoze(p => ({ ...p, [contorId]: { preview, status: 'processing' } }))
    try {
      const base64   = await fileToBase64(file)
      const mimeType = file.type || 'image/jpeg'
      const result   = await extractIndexFromImage(base64, mimeType)
      if (result.success && result.value !== null) {
        setValori(v => ({ ...v, [contorId]: result.value }))
        setPoze(p => ({ ...p, [contorId]: { preview, status: 'ok', detected: result.value } }))
      } else {
        setPoze(p => ({ ...p, [contorId]: { preview, status: 'fail' } }))
      }
    } catch {
      setPoze(p => ({ ...p, [contorId]: { preview, status: 'fail' } }))
    }
  }

  // ── Trimitere ────────────────────────────────────────────────
  const handleTrimite = async () => {
    const completate = contoare.filter(c => valori[c.id] !== undefined && valori[c.id] !== '')
    if (completate.length === 0) { setError('Introduceți cel puțin un index.'); return }
    setSending(true); setError('')
    try {
      for (const c of completate) {
        const ultima = ultimeCitiri[c.id]
        const indexNou = Number(valori[c.id])
        const consum = ultima?.index != null ? Math.max(0, indexNou - Number(ultima.index)) : null
        await saveIndexPrimit({
          token,
          spatiuId:  portal.spatiuId,
          imobilId:  portal.imobilId,
          contorId:  c.id,
          tip:       c.denumire || c.tip,
          um:        c.um,
          indexNou,
          indexPrecedent: ultima?.index ?? null,
          consum,
          status:    'asteptare',
          avePoza:   !!poze[c.id]?.preview,
          // Poza NU se salvează — rămâne doar în memorie
        })
      }
      setTrimis(true)
      // Eliberează pozele din memorie
      Object.values(poze).forEach(p => p.preview && URL.revokeObjectURL(p.preview))
    } catch { setError('Eroare la trimitere. Încearcă din nou.') }
    finally { setSending(false) }
  }

  const iconForTip = (tip) => {
    if (!tip) return '📊'
    if (tip.includes('Energie')) return '⚡'
    if (tip.includes('Apă rece')) return '💧'
    if (tip.includes('Apă caldă')) return '🌡️'
    if (tip.includes('Gaze')) return '🔥'
    if (tip.includes('Internet')) return '📶'
    return '📊'
  }

  // ── Loading / Error ───────────────────────────────────────────
  if (loading) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
      <p style={{ color: '#6B6B70', marginTop: 16 }}>Se încarcă...</p>
    </div>
  )

  if (error && !portal) return (
    <div style={styles.center}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h2 style={{ color: '#B24A4A', margin: '12px 0 8px' }}>Link invalid</h2>
      <p style={{ color: '#6B6B70' }}>{error}</p>
    </div>
  )

  // ── Confirmare trimitere ───────────────────────────────────────
  if (trimis) return (
    <div style={styles.center}>
      <div style={{ fontSize: 64 }}>✅</div>
      <h2 style={{ color: '#14213D', margin: '16px 0 8px' }}>Indexuri trimise!</h2>
      <p style={{ color: '#6B6B70', textAlign: 'center', maxWidth: 300 }}>
        Indexurile au fost transmise cu succes și vor fi verificate.
        <br /><br />
        Dacă ați greșit, puteți retrimite folosind același link.
      </p>
      <button style={styles.btnSecondary} onClick={() => setTrimis(false)}>
        Corectează și retrimite
      </button>
    </div>
  )

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <img src="/logo-rentis-mark.png" alt="Rentis" style={{ height: 40, width: 'auto' }} />
        </div>
        <h1 style={styles.titlu}>{portal?.titlu || 'Citire contoare'}</h1>
        <p style={styles.adresare}>{portal?.adresare || 'Vă rugăm să introduceți indexurile lunare:'}</p>
      </div>

      {/* Contoare */}
      <div style={styles.content}>
        {contoare.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6B6B70', padding: 32 }}>
            Niciun contor configurat pentru acest spațiu.
          </div>
        ) : contoare.map(c => {
          const numeContor = c.denumire || c.tip || 'Contor fără nume'
          const ultima   = ultimeCitiri[c.id]
          const poza     = poze[c.id]
          const valoare  = valori[c.id]

          return (
            <div key={c.id} style={styles.card}>
              {/* Header utilitate */}
              <div style={styles.cardHeader}>
                <span style={{ fontSize: 24 }}>{iconForTip(numeContor)}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1B1B1F' }}>{numeContor}</div>
                  {ultima && (
                    <div style={{ fontSize: 13, color: '#6B6B70' }}>
                      Index anterior: <strong>{ultima.index} {c.um}</strong>
                      {ultima.data && ` (${ultima.data})`}
                    </div>
                  )}
                </div>
              </div>

              {/* Input index */}
              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>Index nou ({c.um})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={valoare ?? ''}
                  onChange={e => setValori(v => ({ ...v, [c.id]: e.target.value }))}
                  placeholder={ultima ? `ex. ${Number(ultima.index) + 50}` : '0'}
                  style={styles.input}
                />
                {valoare && ultima?.index != null && (
                  <div style={styles.consumPreview}>
                    Consum calculat: <strong>{Math.max(0, Number(valoare) - Number(ultima.index))} {c.um}</strong>
                  </div>
                )}
              </div>

              {/* Poză contor */}
              <div>
                <label style={styles.label}>Fotografie contor <span style={{ color: '#9A978C' }}>(opțional)</span></label>

                {poza?.preview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={poza.preview} alt="Contor" style={styles.pozaPreview} />
                    <div style={styles.ocrStatus}>
                      {poza.status === 'processing' && '🔍 Se analizează...'}
                      {poza.status === 'ok' && `✅ Detectat: ${poza.detected} ${c.um}`}
                      {poza.status === 'fail' && '⚠️ Nu am putut citi — introduceți manual'}
                    </div>
                    <button style={styles.removePoza}
                      onClick={() => { URL.revokeObjectURL(poza.preview); setPoze(p => ({ ...p, [c.id]: null })) }}>
                      ✕ Elimină poza
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {/* Camera */}
                    <button style={styles.btnPoza}
                      onClick={() => cameraRefs.current[c.id]?.click()}>
                      📷 Fotografiați
                    </button>
                    {/* Upload */}
                    <button style={{ ...styles.btnPoza, background: '#F3F0E8' }}
                      onClick={() => {
                        const inp = document.createElement('input')
                        inp.type = 'file'; inp.accept = 'image/*'
                        inp.onchange = e => handlePoza(c.id, e.target.files[0])
                        inp.click()
                      }}>
                      🖼️ Din galerie
                    </button>
                    <input
                      ref={el => cameraRefs.current[c.id] = el}
                      type="file" accept="image/*" capture="environment"
                      onChange={e => handlePoza(c.id, e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Eroare */}
        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {/* Buton trimitere */}
        <button
          style={{ ...styles.btnPrimary, opacity: sending ? 0.7 : 1 }}
          onClick={handleTrimite}
          disabled={sending}
        >
          {sending ? '⏳ Se trimite...' : '📤 Trimite indexurile'}
        </button>

        <p style={{ textAlign: 'center', color: '#9A978C', fontSize: 12, marginTop: 12 }}>
          Puteți retrimite oricând dacă ați greșit.
        </p>

        {/* Documente, sesizări, informări */}
        <div style={{ ...styles.card, marginTop: 28 }}>
          <div style={styles.cardHeader}>
            <span style={{ fontSize: 24 }}>✉️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1B1B1F' }}>Mesaj sau documente</div>
              <div style={{ fontSize: 13, color: '#6B6B70' }}>Sesizări, informări, documente pentru administrator</div>
            </div>
          </div>

          {msgTrimis ? (
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ fontSize: 40 }}>✅</div>
              <p style={{ color: '#14213D', fontWeight: 600, margin: '8px 0 4px' }}>Mesajul a fost trimis.</p>
              <button style={styles.btnSecondary} onClick={() => setMsgTrimis(false)}>Trimite altul</button>
            </div>
          ) : (
            <>
              <label style={styles.label}>Tip</label>
              <select value={tipMsg} onChange={e => setTipMsg(e.target.value)}
                style={{ ...styles.inputText, marginBottom: 14 }}>
                <option value="sesizare">Sesizare / problemă</option>
                <option value="informare">Informare</option>
                <option value="document">Document</option>
              </select>

              <label style={styles.label}>Mesaj</label>
              <textarea value={textMsg} onChange={e => setTextMsg(e.target.value)} rows={4} maxLength={3000}
                placeholder="Descrieți pe scurt…" style={{ ...styles.inputText, resize: 'vertical', marginBottom: 14 }} />

              <label style={styles.label}>Documente / poze <span style={{ color: '#9A978C' }}>(opțional, max {MAX_FIS} fișiere, {MAX_MB} MB)</span></label>
              <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.txt"
                onChange={e => { setErrMsg(''); adaugaFisiere(e.target.files); e.target.value = '' }}
                style={{ marginBottom: 8, fontSize: 14 }} />
              {fisiere.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 4 }}>
                  <span>📎 {f.name}</span>
                  <button style={{ ...styles.removePoza, padding: '2px 8px' }} onClick={() => setFisiere(l => l.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 10, margin: '12px 0 14px' }}>
                <input value={numeMsg} onChange={e => setNumeMsg(e.target.value)} placeholder="Numele dvs. (opțional)" style={{ ...styles.inputText, flex: 1 }} />
                <input value={contactMsg} onChange={e => setContactMsg(e.target.value)} placeholder="Telefon (opțional)" inputMode="tel" style={{ ...styles.inputText, flex: 1 }} />
              </div>

              {errMsg && <div style={styles.errorBox}>{errMsg}</div>}
              <button style={{ ...styles.btnPrimary, fontSize: 16, opacity: sendingMsg ? 0.7 : 1 }} onClick={handleTrimiteMsg} disabled={sendingMsg}>
                {sendingMsg ? '⏳ Se trimite...' : '📤 Trimite mesajul'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stiluri inline (fără dependențe CSS) ───────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#F7F5F0',
    fontFamily: "'Inter', system-ui, sans-serif",
    paddingBottom: 40,
  },
  header: {
    background: 'white',
    borderBottom: '1px solid #E8E3D8',
    padding: '20px 20px 16px',
    marginBottom: 20,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 12,
  },
  titlu: {
    fontSize: 22, fontWeight: 700, color: '#1B1B1F',
    margin: '0 0 6px', lineHeight: 1.3,
  },
  adresare: {
    fontSize: 14, color: '#4A4A50', margin: 0, lineHeight: 1.5,
  },
  content: {
    maxWidth: 480, margin: '0 auto', padding: '0 16px',
  },
  card: {
    background: 'white', borderRadius: 12,
    border: '1px solid #E8E3D8',
    padding: 20, marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,.05)',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: 16, paddingBottom: 14,
    borderBottom: '1px solid #F3F0E8',
  },
  inputText: {
    width: '100%', padding: '12px 14px', fontSize: 16,
    border: '2px solid #E8E3D8', borderRadius: 10,
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
    background: 'white', color: '#1B1B1F',
  },
  label: {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#2A2A30', marginBottom: 8,
  },
  input: {
    width: '100%', padding: '14px 16px',
    fontSize: 24, fontWeight: 700,
    border: '2px solid #E8E3D8', borderRadius: 10,
    textAlign: 'center', color: '#14213D',
    boxSizing: 'border-box', outline: 'none',
    transition: 'border-color .2s',
  },
  consumPreview: {
    marginTop: 8, padding: '6px 12px',
    background: '#E4E8F2', borderRadius: 6,
    fontSize: 13, color: '#14213D', textAlign: 'center',
  },
  btnPoza: {
    flex: 1, padding: '12px 8px',
    background: '#14213D', color: 'white',
    border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600,
    cursor: 'pointer',
  },
  pozaPreview: {
    width: '100%', borderRadius: 10,
    maxHeight: 220, objectFit: 'cover',
    marginBottom: 8,
  },
  ocrStatus: {
    padding: '8px 12px', background: '#F7F5F0',
    borderRadius: 8, fontSize: 13,
    color: '#2A2A30', marginBottom: 8,
    border: '1px solid #E8E3D8',
  },
  removePoza: {
    background: 'none', border: '1px solid #E0AEAA',
    color: '#B24A4A', borderRadius: 6,
    padding: '6px 12px', fontSize: 12,
    cursor: 'pointer',
  },
  btnPrimary: {
    width: '100%', padding: '16px',
    background: '#14213D', color: 'white',
    border: 'none', borderRadius: 12,
    fontSize: 18, fontWeight: 700,
    cursor: 'pointer', marginTop: 8,
  },
  btnSecondary: {
    padding: '12px 24px', background: 'white',
    color: '#14213D', border: '2px solid #14213D',
    borderRadius: 10, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 16,
  },
  errorBox: {
    padding: '12px 16px', background: '#F8EAE8',
    border: '1px solid #E0AEAA', borderRadius: 10,
    color: '#B24A4A', fontSize: 14, marginBottom: 16,
  },
  center: {
    minHeight: '100vh', display: 'flex',
    flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 24,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  spinner: {
    width: 40, height: 40,
    border: '4px solid #E8E3D8',
    borderTop: '4px solid #14213D',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}
