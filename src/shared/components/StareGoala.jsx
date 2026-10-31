import { useNavigate } from 'react-router-dom'

// Stare goală: ce înseamnă ecranul gol și care e pasul următor
export default function StareGoala({ icon = 'ti-inbox', titlu, text, label, onClick, to }) {
  const navigate = useNavigate()
  return (
    <div className="empty">
      <i className={`ti ${icon}`} />
      {titlu && <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{titlu}</div>}
      {text && <p style={{ maxWidth: 420, margin: '0 auto' }}>{text}</p>}
      {label && (onClick || to) && (
        <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={onClick || (() => navigate(to))}>{label}</button>
      )}
    </div>
  )
}
