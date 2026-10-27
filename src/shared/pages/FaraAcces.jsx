import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { bootstrapAdmin } from '../firebase/firestore'

// Afișat când contul e autentificat dar nu are niciun acces (nici administrator, nici pe vreun imobil)
export default function FaraAcces() {
  const { user, logout, reload } = useAuth()
  const navigate = useNavigate()
  const [lucrez, setLucrez] = useState(false)
  const [msg, setMsg] = useState('')
  const [arataInit, setArataInit] = useState(false)

  const initial = async () => {
    setLucrez(true); setMsg('')
    try { await bootstrapAdmin(user.uid, user.email, user.email); await reload() }
    catch (e) { console.error(e); setMsg(e?.message?.includes('deja') ? e.message : 'Configurarea inițială nu este disponibilă pentru acest cont. Cere accesul administratorului.') }
    setLucrez(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-logo"><img src="/logo-rentis.png" alt="Rentis" style={{ width: 240, maxWidth: '100%', height: 'auto' }} /></div>
        <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--blue)', marginBottom: 8 }}>Cont fără acces</h2>
        <p style={{ color: 'var(--slate)', fontSize: 14, marginBottom: 6 }}>
          Contul <strong>{user?.email}</strong> nu are acces la niciun imobil.
        </p>
        <p style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 18 }}>
          Contul este creat și așteaptă aprobarea. Administratorul îți poate acorda acces din Setări → Acces imobile; apoi reîncarcă pagina.
        </p>
        {msg && <div className="login-err">{msg}</div>}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
          onClick={async () => { await logout(); navigate('/login') }}>Ieși din cont</button>
        <div style={{ marginTop: 18 }}>
          {!arataInit
            ? <button className="btn btn-ghost btn-sm" onClick={() => setArataInit(true)}>Sunt proprietarul aplicației (prima configurare)</button>
            : (
              <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                <p style={{ marginBottom: 8 }}>Folosește doar la prima configurare, când nu există încă niciun administrator. Funcționează o singură dată.</p>
                <button className="btn btn-ghost btn-sm" onClick={initial} disabled={lucrez}>{lucrez ? 'Se configurează…' : 'Devino administrator'}</button>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
