import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Afișat când contul e autentificat dar nu are acces la niciun imobil
export default function FaraAcces() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="login-wrap">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-logo"><img src="/logo-rentis.png" alt="Rentis" style={{ width: 240, maxWidth: '100%', height: 'auto' }} /></div>
        <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--blue)', marginBottom: 8 }}>Cont în așteptare</h2>
        <p style={{ color: 'var(--slate)', fontSize: 14, marginBottom: 6 }}>
          Contul <strong>{user?.email}</strong> nu are încă acces la niciun imobil.
        </p>
        <p style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 18 }}>
          {profile?.activ === false
            ? 'Contul este dezactivat. Contactează administratorul.'
            : 'Administratorul îți poate acorda acces din Setări → Acces imobile. După aceea reîncarcă pagina.'}
        </p>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
          onClick={async () => { await logout(); navigate('/login') }}>Ieși din cont</button>
      </div>
    </div>
  )
}
