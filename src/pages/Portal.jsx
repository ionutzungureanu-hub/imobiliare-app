import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getPortal, getContoareSpatiu, getCitiriContor, saveIndexPrimit, getIndexuriPentruSpatiu } from '../firebase/firestore'
import { extractIndexFromImage, fileToBase64 } from '../services/ocrService'

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

  useEffect(() => {
    if (!token) { setError('Link invalid.'); setLoading(false); return }
    getPortal(token).then(async p => {
      if (!p || !p.activ) { setError('Acest link nu este valid sau a expirat.'); setLoading(false); return }
      setPortal(p)
      // Încarcă contoarele active
      const ct = await getContoareSpatiu(p.spatiuId)
      const active = ct.filter(c => c.mod === 'index' && (p.utilitatiActive?.includes(c.tip) ?? true))
      setContoare(active)
      // Încarcă ultima citire per contor
      const map = {}
      for (const c of active) {
        const citiri = await getCitiriContor(c.id)
        if (citiri.length > 0) map[c.id] = citiri[0]
      }
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
          tip:       c.tip,
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
      <p style={{ color: '#64748b', marginTop: 16 }}>Se încarcă...</p>
    </div>
  )

  if (error && !portal) return (
    <div style={styles.center}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h2 style={{ color: '#ef4444', margin: '12px 0 8px' }}>Link invalid</h2>
      <p style={{ color: '#64748b' }}>{error}</p>
    </div>
  )

  // ── Confirmare trimitere ───────────────────────────────────────
  if (trimis) return (
    <div style={styles.center}>
      <div style={{ fontSize: 64 }}>✅</div>
      <h2 style={{ color: '#1B4FD8', margin: '16px 0 8px' }}>Indexuri trimise!</h2>
      <p style={{ color: '#64748b', textAlign: 'center', maxWidth: 300 }}>
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
          <svg width="36" height="36" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="16" fill="#1B4FD8"/>
            <polygon points="50,18 80,40 80,75 20,75 20,40" fill="white"/>
            <rect x="40" y="55" width="20" height="20" rx="2" fill="#1B4FD8"/>
            <polyline points="16,43 50,15 84,43" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <span style={{ fontWeight: 700, color: '#1B4FD8', fontSize: 18 }}>AdminChirie</span>
        </div>
        <h1 style={styles.titlu}>{portal?.titlu || 'Citire contoare'}</h1>
        <p style={styles.adresare}>{portal?.adresare || 'Vă rugăm să introduceți indexurile lunare:'}</p>
      </div>

      {/* Contoare */}
      <div style={styles.content}>
        {contoare.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 32 }}>
            Niciun contor configurat pentru acest spațiu.
          </div>
        ) : contoare.map(c => {
          const ultima   = ultimeCitiri[c.id]
          const poza     = poze[c.id]
          const valoare  = valori[c.id]

          return (
            <div key={c.id} style={styles.card}>
              {/* Header utilitate */}
              <div style={styles.cardHeader}>
                <span style={{ fontSize: 24 }}>{iconForTip(c.tip)}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{c.tip}</div>
                  {ultima && (
                    <div style={{ fontSize: 13, color: '#64748b' }}>
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
                <label style={styles.label}>Fotografie contor <span style={{ color: '#94a3b8' }}>(opțional)</span></label>

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
                    <button style={{ ...styles.btnPoza, background: '#f1f5f9' }}
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

        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 12 }}>
          Puteți retrimite oricând dacă ați greșit.
        </p>
      </div>
    </div>
  )
}

// ── Stiluri inline (fără dependențe CSS) ───────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Inter', system-ui, sans-serif",
    paddingBottom: 40,
  },
  header: {
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    padding: '20px 20px 16px',
    marginBottom: 20,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 12,
  },
  titlu: {
    fontSize: 22, fontWeight: 700, color: '#0f172a',
    margin: '0 0 6px', lineHeight: 1.3,
  },
  adresare: {
    fontSize: 14, color: '#475569', margin: 0, lineHeight: 1.5,
  },
  content: {
    maxWidth: 480, margin: '0 auto', padding: '0 16px',
  },
  card: {
    background: 'white', borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 20, marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,.05)',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: 16, paddingBottom: 14,
    borderBottom: '1px solid #f1f5f9',
  },
  label: {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#374151', marginBottom: 8,
  },
  input: {
    width: '100%', padding: '14px 16px',
    fontSize: 24, fontWeight: 700,
    border: '2px solid #e2e8f0', borderRadius: 10,
    textAlign: 'center', color: '#1B4FD8',
    boxSizing: 'border-box', outline: 'none',
    transition: 'border-color .2s',
  },
  consumPreview: {
    marginTop: 8, padding: '6px 12px',
    background: '#eff6ff', borderRadius: 6,
    fontSize: 13, color: '#1d4ed8', textAlign: 'center',
  },
  btnPoza: {
    flex: 1, padding: '12px 8px',
    background: '#1B4FD8', color: 'white',
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
    padding: '8px 12px', background: '#f8fafc',
    borderRadius: 8, fontSize: 13,
    color: '#374151', marginBottom: 8,
    border: '1px solid #e2e8f0',
  },
  removePoza: {
    background: 'none', border: '1px solid #fca5a5',
    color: '#ef4444', borderRadius: 6,
    padding: '6px 12px', fontSize: 12,
    cursor: 'pointer',
  },
  btnPrimary: {
    width: '100%', padding: '16px',
    background: '#1B4FD8', color: 'white',
    border: 'none', borderRadius: 12,
    fontSize: 18, fontWeight: 700,
    cursor: 'pointer', marginTop: 8,
  },
  btnSecondary: {
    padding: '12px 24px', background: 'white',
    color: '#1B4FD8', border: '2px solid #1B4FD8',
    borderRadius: 10, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 16,
  },
  errorBox: {
    padding: '12px 16px', background: '#fef2f2',
    border: '1px solid #fca5a5', borderRadius: 10,
    color: '#ef4444', fontSize: 14, marginBottom: 16,
  },
  center: {
    minHeight: '100vh', display: 'flex',
    flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 24,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  spinner: {
    width: 40, height: 40,
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1B4FD8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}
