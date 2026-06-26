import { useState, useEffect } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { getConfig, saveConfig } from '../firebase/firestore'
import { FURNIZORI, testeazaConexiunea } from '../services/facturareApi'

const emptyConfig = () => ({
  furnizorId:      '',
  token:           '',
  cif:             '',
  serie:           'FC',
  env:             'test',
  endpointCustom:  '',
})

export default function Config() {
  const toast      = useToast()
  const { isAdmin } = useAuth()

  const [cfg,      setCfg]      = useState(emptyConfig())
  const [saving,   setSaving]   = useState(false)
  const [testing,  setTesting]  = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    getConfig().then(data => { if (data) setCfg(c => ({ ...emptyConfig(), ...data })) })
  }, [])

  if (!isAdmin) return (
    <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>
      <i className="ti ti-lock" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
      <p>Acces restricționat. Doar administratorii pot accesa Configurarea.</p>
    </div>
  )

  const set = k => e => setCfg(c => ({ ...c, [k]: e.target.value }))

  const furnizorSelectat = FURNIZORI.find(f => f.id === cfg.furnizorId)
  const endpointActiv    = cfg.endpointCustom || furnizorSelectat?.url || '—'

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveConfig(cfg)
      toast('Configurare salvată!')
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testeazaConexiunea(cfg)
    setTestResult(result)
    setTesting(false)
    toast(result.mesaj, result.ok ? 'success' : 'error')
  }

  return (
    <>
      <Topbar title="Configurare" subtitle="Setări aplicație și integrare facturare" />

      <div className="content" style={{ maxWidth: 700 }}>

        {/* ── Integrare facturare ─────────────────────────────── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Integrare facturare</div>
              <div className="card-subtitle">Conectare cu furnizorul tău de facturare electronică</div>
            </div>
            {cfg.furnizorId && (
              <span className="badge badge-green">
                <i className="ti ti-plug" style={{ fontSize: 11 }} /> Configurat
              </span>
            )}
          </div>
          <div className="card-body">

            {/* Selector furnizor */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Furnizor facturare</label>
              <select value={cfg.furnizorId} onChange={e => {
                const f = FURNIZORI.find(x => x.id === e.target.value)
                setCfg(c => ({ ...c, furnizorId: e.target.value, endpointCustom: f?.url !== '' ? '' : c.endpointCustom }))
                setTestResult(null)
              }}>
                <option value="">— Alege furnizor —</option>
                {FURNIZORI.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
              </select>
              {furnizorSelectat?.docUrl && (
                <div style={{ marginTop: 6 }}>
                  <a href={furnizorSelectat.docUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-external-link" style={{ fontSize: 13 }} />
                    Documentație API {furnizorSelectat.nume}
                  </a>
                </div>
              )}
            </div>

            {cfg.furnizorId && (
              <>
                <div className="form-grid">
                  {/* Token API */}
                  <div className="form-group full">
                    <label>Token / API Key *</label>
                    <input
                      type="password"
                      value={cfg.token}
                      onChange={set('token')}
                      placeholder={
                        cfg.furnizorId === 'oblio'     ? 'Client Secret din Oblio → Setări → API' :
                        cfg.furnizorId === 'fgo'       ? 'Token din FGO → Setări → Utilizatori → User API' :
                        cfg.furnizorId === 'smartbill' ? 'Token din SmartBill → Cont → API Token' :
                        'API Token / Key'
                      }
                    />
                  </div>

                  {/* CIF */}
                  <div className="form-group">
                    <label>CIF firmă (fără RO)</label>
                    <input value={cfg.cif} onChange={set('cif')} placeholder="12345678" />
                  </div>

                  {/* Serie */}
                  <div className="form-group">
                    <label>Serie documente</label>
                    <input value={cfg.serie} onChange={set('serie')} placeholder="FC" />
                  </div>

                  {/* Mediu */}
                  <div className="form-group">
                    <label>Mediu</label>
                    <select value={cfg.env} onChange={set('env')}>
                      <option value="test">Test / Sandbox</option>
                      <option value="prod">Producție</option>
                    </select>
                  </div>

                  {/* Endpoint custom */}
                  {cfg.furnizorId === 'custom' && (
                    <div className="form-group full">
                      <label>Endpoint API (URL complet) *</label>
                      <input
                        value={cfg.endpointCustom}
                        onChange={set('endpointCustom')}
                        placeholder="https://api.furnizor.ro/v1"
                      />
                    </div>
                  )}

                  {/* Endpoint activ (readonly) */}
                  {cfg.furnizorId !== 'custom' && (
                    <div className="form-group full">
                      <label>Endpoint activ</label>
                      <input
                        value={cfg.env === 'test' && furnizorSelectat?.urlTest ? furnizorSelectat.urlTest : endpointActiv}
                        readOnly
                        style={{ background: 'var(--slate-light)', color: 'var(--slate)', fontSize: 12 }}
                      />
                    </div>
                  )}
                </div>

                {/* Test conexiune */}
                <div style={{ marginTop: 16, padding: 14, background: 'var(--slate-light)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 8 }}>
                    Testare conexiune
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="btn btn-ghost btn-sm" onClick={handleTest} disabled={testing || !cfg.token}>
                      <i className={`ti ${testing ? 'ti-refresh' : 'ti-plug'}`} />
                      {testing ? 'Se testează…' : 'Testează conexiunea'}
                    </button>
                    {testResult && (
                      <span style={{ fontSize: 13, color: testResult.ok ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className={`ti ${testResult.ok ? 'ti-check-circle' : 'ti-alert-circle'}`} />
                        {testResult.mesaj}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {!cfg.furnizorId && (
              <div className="alert alert-info">
                <i className="ti ti-info-circle" />
                <span>
                  Fără integrare configurată, facturile se salvează local și se trimit doar pe email.
                  Nu vor fi transmise în SPV ANAF.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <i className="ti ti-device-floppy" />
                {saving ? 'Se salvează…' : 'Salvează configurarea'}
              </button>
            </div>
          </div>
        </div>

        {/* ── EmailJS ─────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">EmailJS — trimitere emailuri</div>
            <div className="card-subtitle">Configurat prin variabile de mediu Netlify</div>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.8 }}>
            <p style={{ marginBottom: 10 }}>Pași configurare:</p>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Cont gratuit la <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>emailjs.com</a> (200 emailuri/lună gratuit)</li>
              <li>Adaugă un <strong>Service</strong> → Yahoo Mail sau Gmail</li>
              <li>Creează template-uri: <code>template_factura</code> și <code>template_mesaj</code></li>
              <li>Copiază <strong>Service ID</strong>, <strong>Template IDs</strong> și <strong>Public Key</strong></li>
              <li>Adaugă în <strong>Netlify → Environment variables</strong></li>
            </ol>
            <div style={{ marginTop: 12, padding: 12, background: 'var(--slate-light)', borderRadius: 6, fontSize: 12 }}>
              <strong>Variabile necesare în Netlify:</strong><br />
              <code>VITE_EMAILJS_SERVICE_ID</code> &nbsp;
              <code>VITE_EMAILJS_TEMPLATE_FACTURA</code> &nbsp;
              <code>VITE_EMAILJS_TEMPLATE_MESAJ</code> &nbsp;
              <code>VITE_EMAILJS_PUBLIC_KEY</code>
            </div>
          </div>
        </div>

        {/* ── Firebase ────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Firebase — autentificare și date</div>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.8 }}>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Creează proiect la <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>console.firebase.google.com</a></li>
              <li>Activează <strong>Authentication → Email/Password</strong></li>
              <li>Adaugă utilizatorii din <strong>Authentication → Users</strong></li>
              <li>Activează <strong>Firestore Database</strong></li>
              <li>Adaugă variabilele <code>VITE_FIREBASE_*</code> în Netlify</li>
            </ol>
            <div style={{ marginTop: 12, padding: 12, background: 'var(--slate-light)', borderRadius: 6, fontSize: 12 }}>
              <strong>Reguli Firestore:</strong>
              <pre style={{ marginTop: 6, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 11 }}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{doc=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</pre>
            </div>
          </div>
        </div>

        {/* ── Netlify Deploy ──────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Deploy Netlify + GitHub</div>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.8 }}>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Push pe GitHub → Netlify redeploy automat</li>
              <li>Variabile de mediu: <strong>Site configuration → Environment variables</strong></li>
              <li>Build command: <code>npm run build</code> · Publish: <code>dist</code></li>
            </ol>
          </div>
        </div>

      </div>
    </>
  )
}
