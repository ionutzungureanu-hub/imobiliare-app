import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMeniu } from '../context/MeniuContext'
import { adreseaza } from '../utils/apelativ'

// Blochează paginile ascunse din „Administrare meniu” — chiar și când cineva îi știe adresa.
export function NuEDisponibil() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  return (
    <div className="content" style={{ paddingTop: 70, textAlign: 'center', color: 'var(--slate)' }}>
      <i className="ti ti-eye-off" style={{ fontSize: 44, display: 'block', marginBottom: 12, color: 'var(--gold)' }} />
      <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--blue)', marginBottom: 6 }}>Nu este disponibil</h2>
      <p style={{ fontSize: 14, maxWidth: 380, margin: '0 auto 18px' }}>
        {adreseaza('Această pagină nu este disponibilă pentru contul sau dispozitivul tău.')}
        {isAdmin && ' O poți reactiva din Setări → Administrare meniu.'}
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Înapoi la Dashboard</button>
    </div>
  )
}

export default function Garda({ k, children }) {
  const { vizibil } = useMeniu()
  return vizibil(k) ? children : <NuEDisponibil />
}
