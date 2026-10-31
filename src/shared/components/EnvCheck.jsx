// Verificare environment variables la pornire aplicație
// Dacă lipsește orice variabilă critică → afișează ecran de eroare clar
// în loc să lase aplicația să crape silențios sau cu mesaje criptice.

const VARS_REQUIRED = [
  { key: 'VITE_FIREBASE_API_KEY',            label: 'Firebase API Key',            grup: 'Firebase' },
  { key: 'VITE_FIREBASE_AUTH_DOMAIN',        label: 'Firebase Auth Domain',        grup: 'Firebase' },
  { key: 'VITE_FIREBASE_PROJECT_ID',         label: 'Firebase Project ID',         grup: 'Firebase' },
  { key: 'VITE_FIREBASE_STORAGE_BUCKET',     label: 'Firebase Storage Bucket',     grup: 'Firebase' },
  { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID',label: 'Firebase Messaging Sender ID',grup: 'Firebase' },
  { key: 'VITE_FIREBASE_APP_ID',             label: 'Firebase App ID',             grup: 'Firebase' },
]

const VARS_OPTIONAL = [
  { key: 'VITE_EMAILJS_SERVICE_ID',      label: 'EmailJS Service ID',      grup: 'EmailJS',    functie: 'trimitere email facturi' },
  { key: 'VITE_EMAILJS_TEMPLATE_FACTURA',label: 'EmailJS Template Factură',grup: 'EmailJS',    functie: 'trimitere email facturi' },
  { key: 'VITE_EMAILJS_PUBLIC_KEY',      label: 'EmailJS Public Key',      grup: 'EmailJS',    functie: 'trimitere email facturi' },
]

function checkVars() {
  const missing  = VARS_REQUIRED.filter(v => !import.meta.env[v.key])
  const optional = VARS_OPTIONAL.filter(v => !import.meta.env[v.key])
  return { missing, optional, ok: missing.length === 0 }
}

export default function EnvCheck({ children }) {
  const { missing, optional, ok } = checkVars()

  if (ok) {
    // Toate variabilele obligatorii sunt prezente — pornește normal
    // Dacă există variabile opționale lipsă, afișează doar un avertisment mic în consolă
    if (optional.length > 0) {
      console.warn('[Rentis] Variabile opționale lipsă (funcționalitate redusă):', optional.map(v => v.key).join(', '))
    }
    return children
  }

  // Variabile obligatorii lipsă — afișează ecran de eroare complet
  const grupuri = [...new Set(missing.map(v => v.grup))]

  return (
    <div style={{
      minHeight: '100vh', background: '#1B1B1F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 20 }}>Rentis</div>
            <div style={{ color: '#6B6B70', fontSize: 13 }}>Configurare incompletă</div>
          </div>
        </div>

        {/* Eroare principală */}
        <div style={{ background: '#2A2A30', borderRadius: 12, padding: 24, marginBottom: 20, border: '1px solid #2A2A30' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <div style={{ color: '#B24A4A', fontWeight: 700, fontSize: 16 }}>
                {missing.length} {missing.length === 1 ? 'variabilă lipsă' : 'variabile lipsă'}
              </div>
              <div style={{ color: '#6B6B70', fontSize: 13, marginTop: 2 }}>
                Aplicația nu poate porni fără aceste variabile de mediu.
              </div>
            </div>
          </div>

          {/* Lista variabilelor lipsă grupate */}
          {grupuri.map(grup => (
            <div key={grup} style={{ marginBottom: 14 }}>
              <div style={{ color: '#9A978C', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                {grup}
              </div>
              {missing.filter(v => v.grup === grup).map(v => (
                <div key={v.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ color: '#B24A4A', fontSize: 16 }}>✗</span>
                  <code style={{ color: '#B8975A', fontSize: 13, background: '#1B1B1F', padding: '2px 8px', borderRadius: 4 }}>
                    {v.key}
                  </code>
                  <span style={{ color: '#4A4A50', fontSize: 12 }}>{v.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Instrucțiuni */}
        <div style={{ background: '#2A2A30', borderRadius: 12, padding: 24, marginBottom: 20, border: '1px solid #2A2A30' }}>
          <div style={{ color: '#9A978C', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Cum se rezolvă
          </div>
          {[
            { nr: 1, text: 'Deschide Netlify → Site configuration → Environment variables' },
            { nr: 2, text: 'Adaugă variabilele lipsă cu valorile din Firebase Console' },
            { nr: 3, text: 'Redeploy: Deploys → Trigger deploy → Deploy site' },
          ].map(step => (
            <div key={step.nr} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#14213D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'white' }}>
                {step.nr}
              </div>
              <div style={{ color: '#D8D2C4', fontSize: 13, paddingTop: 3 }}>{step.text}</div>
            </div>
          ))}
        </div>

        {/* Variabile opționale lipsă */}
        {optional.length > 0 && (
          <div style={{ background: '#2A2A30', borderRadius: 12, padding: 20, border: '1px solid #2A2A30', opacity: 0.8 }}>
            <div style={{ color: '#9A978C', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Variabile opționale lipsă (funcționalitate redusă)
            </div>
            {optional.map(v => (
              <div key={v.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#B8975A', fontSize: 14 }}>⚠</span>
                <code style={{ color: '#9A978C', fontSize: 12 }}>{v.key}</code>
                <span style={{ color: '#4A4A50', fontSize: 11 }}>— afectează: {v.functie}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, color: '#2A2A30', fontSize: 12 }}>
          Rentis — verificare automată la pornire
        </div>
      </div>
    </div>
  )
}
