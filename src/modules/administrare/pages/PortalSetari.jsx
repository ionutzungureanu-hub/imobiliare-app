import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { getSpatii, getContoareSpatiu, getPortalBySpatiu, savePortal } from '../../../shared/firebase/firestore'

function genToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

export default function PortalSetari() {
  const { spatiuId } = useParams()
  const navigate     = useNavigate()
  const toast        = useToast()

  const [spatiu,    setSpatiu]    = useState(null)
  const [contoare,  setContoare]  = useState([])
  const [portal,    setPortal]    = useState(null)
  const [titlu,     setTitlu]     = useState('')
  const [adresare,  setAdresare]  = useState('')
  const [active,    setActive]    = useState([])
  const [token,     setToken]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [copied,    setCopied]    = useState(false)

  useEffect(() => {
    Promise.all([getSpatii(), getContoareSpatiu(spatiuId), getPortalBySpatiu(spatiuId)])
      .then(([sp, ct, p]) => {
        const s = sp.find(s => s.id === spatiuId)
        setSpatiu(s)
        const ctIndex = ct.filter(c => c.mod === 'index')
        setContoare(ctIndex)
        if (p) {
          setPortal(p)
          setTitlu(p.titlu || '')
          setAdresare(p.adresare || '')
          setActive(p.utilitatiActive || ctIndex.map(c => c.tip))
          setToken(p.token || '')
        } else {
          setTitlu(s?.denumire || '')
          setAdresare('Bună ziua! Vă rugăm să introduceți indexurile lunare:')
          setActive(ctIndex.map(c => c.tip))
          setToken(genToken())
        }
      })
  }, [spatiuId])

  const portalUrl = `${window.location.origin}/portal/${token}`

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await savePortal({ spatiuId, titlu, adresare, utilitatiActive: active, token, activ: true })
      toast('Portal salvat!')
    } catch { toast('Eroare.', 'error') }
    finally { setSaving(false) }
  }

  const toggleUtilitate = (tip) =>
    setActive(a => a.includes(tip) ? a.filter(t => t !== tip) : [...a, tip])

  const iconForTip = (tip) => {
    if (tip.includes('Energie')) return '⚡'
    if (tip.includes('rece'))    return '💧'
    if (tip.includes('cald'))    return '🌡️'
    if (tip.includes('Gaze'))    return '🔥'
    return '📊'
  }

  return (
    <>
      <Topbar title="Portal chiriaș" subtitle={spatiu?.denumire}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/spatii')}>← Înapoi</button>
      </Topbar>

      <div className="content" style={{ maxWidth: 600 }}>

        {/* Link portal */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Link pentru chiriaș</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input
                value={portalUrl}
                readOnly
                style={{ flex: 1, fontSize: 12, color: 'var(--slate)', background: 'var(--slate-light)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleCopy}>
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
                {copied ? 'Copiat!' : 'Copiază'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={`https://wa.me/?text=${encodeURIComponent('Bună ziua! Vă rugăm să introduceți indexurile lunare folosind acest link: ' + portalUrl)}`}
                target="_blank" rel="noreferrer" className="btn btn-success btn-sm">
                <i className="ti ti-brand-whatsapp" /> Trimite WhatsApp
              </a>
              <a href={`mailto:?subject=Citire contoare&body=${encodeURIComponent('Bună ziua!\n\nVă rugăm să introduceți indexurile lunare folosind link-ul de mai jos:\n' + portalUrl)}`}
                className="btn btn-ghost btn-sm">
                <i className="ti ti-mail" /> Trimite Email
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => setToken(genToken())}>
                <i className="ti ti-refresh" /> Regenerează token
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--slate)' }}>
              <i className="ti ti-info-circle" style={{ fontSize: 12 }} /> Linkul rămâne permanent. Chiriașul îl poate folosi în fiecare lună.
            </div>
          </div>
        </div>

        {/* Template */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Personalizare portal</div></div>
          <div className="card-body">
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Titlu afișat chiriașului</label>
              <input value={titlu} onChange={e => setTitlu(e.target.value)}
                placeholder={`ex. ${spatiu?.denumire || 'Apartament 3'}`} />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Mesaj / adresare</label>
              <textarea
                value={adresare}
                onChange={e => setAdresare(e.target.value)}
                rows={3}
                placeholder="ex. Bună ziua! Vă rugăm să introduceți indexurile lunare:"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* Utilități active */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Utilități afișate pe portal</div>
            <div className="card-subtitle">Bifează ce trebuie să completeze chiriașul</div>
          </div>
          <div className="card-body">
            {contoare.length === 0 ? (
              <div style={{ color: 'var(--slate)', fontSize: 13 }}>
                Niciun contor cu index configurat pentru acest spațiu.
                Adaugă contoare din secțiunea Utilități.
              </div>
            ) : contoare.map(c => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 12, padding: '10px 12px', background: active.includes(c.tip) ? 'var(--blue-light)' : 'var(--slate-light)', borderRadius: 8, border: `1px solid ${active.includes(c.tip) ? 'var(--blue-mid)' : 'var(--border)'}` }}>
                <input
                  type="checkbox"
                  checked={active.includes(c.tip)}
                  onChange={() => toggleUtilitate(c.tip)}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontSize: 20 }}>{iconForTip(c.tip)}</span>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{c.tip}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate)' }}>unitate: {c.um}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="card" style={{ marginBottom: 16, border: '2px dashed var(--border)' }}>
          <div className="card-header">
            <div className="card-title" style={{ fontSize: 13 }}>Preview portal</div>
            <a href={portalUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              <i className="ti ti-external-link" /> Deschide
            </a>
          </div>
          <div className="card-body" style={{ fontSize: 13 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{titlu || 'Titlu portal'}</div>
            <div style={{ color: 'var(--slate)', marginBottom: 10 }}>{adresare}</div>
            {active.map(tip => (
              <div key={tip} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: 'var(--slate)' }}>
                <span>{iconForTip(tip)}</span> {tip}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <i className="ti ti-device-floppy" />
            {saving ? 'Se salvează...' : 'Salvează portal'}
          </button>
        </div>
      </div>
    </>
  )
}
