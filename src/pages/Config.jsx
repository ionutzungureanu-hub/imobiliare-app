import { useState, useEffect } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { getConfig, saveConfig } from '../firebase/firestore'

export default function Config() {
  const toast   = useToast()
  const [cfg,   setCfg]    = useState({ token: '', cif: '', serie: 'FC', env: 'test' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getConfig().then(data => { if (data) setCfg(c => ({ ...c, ...data })) })
  }, [])

  const set = k => e => setCfg(c => ({ ...c, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveConfig(cfg)
      toast('Configurare salvată în Firestore!')
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const endpoint = cfg.env === 'prod' ? 'https://api.fgo.ro/v1' : 'https://api-testuat.fgo.ro/v1'

  return (
    <>
      <Topbar title="Configurare" subtitle="API FGO, EmailJS și informații integrare" />

      <div className="content" style={{ maxWidth: 680 }}>

        {/* FGO */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Conexiune FGO</div>
              <div className="card-subtitle">Token și setări API — salvate în Firestore, comune pentru toți utilizatorii</div>
            </div>
          </div>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <i className="ti ti-info-circle" aria-hidden="true" />
              <span>
                Variabilele de mediu din <code>.env</code> sunt folosite pentru build Netlify.
                Valorile de aici sunt salvate în Firestore și pot fi actualizate fără redeploy.
              </span>
            </div>
            <div className="form-grid">
              <div className="form-group full">
                <label>Token API FGO</label>
                <input
                  type="password" value={cfg.token} onChange={set('token')}
                  placeholder="Token din FGO → Setări → Utilizatori → User API"
                />
              </div>
              <div className="form-group">
                <label>CIF Firmă (fără RO)</label>
                <input value={cfg.cif} onChange={set('cif')} placeholder="12345678" />
              </div>
              <div className="form-group">
                <label>Serie documente</label>
                <input value={cfg.serie} onChange={set('serie')} placeholder="FC" />
              </div>
              <div className="form-group">
                <label>Mediu</label>
                <select value={cfg.env} onChange={set('env')}>
                  <option value="test">Test — api-testuat.fgo.ro</option>
                  <option value="prod">Producție — api.fgo.ro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Endpoint activ</label>
                <input value={endpoint} readOnly style={{ background: 'var(--slate-light)', color: 'var(--slate)', fontSize: 12 }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <i className="ti ti-device-floppy" aria-hidden="true" />
                {saving ? 'Se salvează…' : 'Salvează configurarea'}
              </button>
            </div>
          </div>
        </div>

        {/* EmailJS */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">EmailJS — trimitere emailuri</div>
            <div className="card-subtitle">Configurat prin variabile de mediu Netlify</div>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.7 }}>
            <p style={{ marginBottom: 10 }}>
              <strong style={{ color: 'var(--text)' }}>Pași configurare EmailJS:</strong>
            </p>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Creează cont gratuit la <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>emailjs.com</a> (200 emailuri/lună gratuit)</li>
              <li>Adaugă un <strong>Service</strong> → Yahoo Mail cu adresa <code>kado.excelsior@yahoo.com</code></li>
              <li>Creează două <strong>Templates</strong>:
                <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                  <li><code>template_factura</code> — pentru trimitere factură după emitere</li>
                  <li><code>template_mesaj</code> — pentru mesaje libere din conversație</li>
                </ul>
              </li>
              <li>Copiază <strong>Service ID</strong>, <strong>Template IDs</strong> și <strong>Public Key</strong></li>
              <li>Adaugă în <strong>Netlify → Site configuration → Environment variables</strong>:
                <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                  <li><code>VITE_EMAILJS_SERVICE_ID</code></li>
                  <li><code>VITE_EMAILJS_TEMPLATE_FACTURA</code></li>
                  <li><code>VITE_EMAILJS_TEMPLATE_MESAJ</code></li>
                  <li><code>VITE_EMAILJS_PUBLIC_KEY</code></li>
                </ul>
              </li>
            </ol>

            <div style={{ marginTop: 16, padding: 14, background: 'var(--slate-light)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
              <strong>Template variabile disponibile:</strong><br />
              <code>{'{{to_email}}'}</code> <code>{'{{to_name}}'}</code> <code>{'{{nr_factura}}'}</code>{' '}
              <code>{'{{suma}}'}</code> <code>{'{{scadenta}}'}</code> <code>{'{{subiect}}'}</code>{' '}
              <code>{'{{mesaj}}'}</code> <code>{'{{from_email}}'}</code>
            </div>
          </div>
        </div>

        {/* Firebase */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Firebase — autentificare și date</div>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.7 }}>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Creează proiect la <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>console.firebase.google.com</a></li>
              <li>Activează <strong>Authentication → Email/Password</strong></li>
              <li>Adaugă utilizatorii (2-5 persoane) manual din consolă</li>
              <li>Activează <strong>Firestore Database</strong> în modul producție</li>
              <li>Copiază config-ul din <strong>Project Settings → Your apps</strong></li>
              <li>Adaugă toate variabilele <code>VITE_FIREBASE_*</code> în Netlify Environment Variables</li>
            </ol>
            <div style={{ marginTop: 14, padding: 14, background: 'var(--slate-light)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
              <strong>Reguli Firestore recomandate:</strong>
              <pre style={{ marginTop: 6, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{`rules_version = '2';
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

        {/* Netlify + GitHub */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Deploy Netlify + GitHub</div>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.7 }}>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Push proiectul pe GitHub: <code>git init → git add . → git commit → git push</code></li>
              <li>Pe <a href="https://app.netlify.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>netlify.com</a> → <strong>Add new site → Import from GitHub</strong></li>
              <li>Build command: <code>npm run build</code> · Publish directory: <code>dist</code></li>
              <li>Adaugă toate variabilele de mediu în <strong>Site configuration → Environment variables</strong></li>
              <li>Deploy! Orice push pe main redeploy automat.</li>
            </ol>
          </div>
        </div>

      </div>
    </>
  )
}
