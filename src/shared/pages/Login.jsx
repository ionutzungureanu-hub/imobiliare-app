import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usernameLaEmail } from '../services/utilizatoriApi'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(usernameLaEmail(username), password)
      navigate('/dashboard')
    } catch (err) {
      const c = err?.code || ''
      console.error('auth', c, err)
      const MSG = {
        'auth/invalid-credential': 'Username sau parolă incorectă.',
        'auth/wrong-password': 'Username sau parolă incorectă.',
        'auth/user-not-found': 'Username sau parolă incorectă.',
        'auth/invalid-email': 'Username invalid.',
        'auth/user-disabled': 'Contul este dezactivat. Contactează administratorul.',
        'auth/network-request-failed': 'Fără conexiune la internet. Încearcă din nou.',
        'auth/too-many-requests': 'Prea multe încercări. Așteaptă câteva minute.',
        'auth/operation-not-allowed': 'Autentificarea cu email și parolă nu este activată în Firebase (Authentication → Sign-in method).',
        'auth/invalid-api-key': 'Configurarea Firebase a aplicației este incorectă (cheie API).',
        'auth/unauthorized-domain': 'Acest domeniu nu este autorizat în Firebase (Authentication → Settings → Authorized domains).',
      }
      setError(MSG[c] || `Autentificarea a eșuat (${c || err?.message || 'eroare necunoscută'}).`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo-rentis.png" alt="Rentis — Intelligent Property Management" style={{ width: 280, maxWidth: '100%', height: 'auto' }} />
        </div>

        {error && <div className="login-err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label htmlFor="login-user">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              required
              name="username"
              id="login-user"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label htmlFor="login-password">Parolă</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              name="password"
              id="login-password"
              autoComplete="current-password"
              enterKeyHint="go"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Se procesează…' : 'Intră în cont'}
          </button>
        </form>
      </div>
    </div>
  )
}
