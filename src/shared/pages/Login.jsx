import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const [nou, setNou] = useState(false)
  const [password2, setPassword2] = useState('')
  const navigate  = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (nou) {
        if (password.length < 8) { setError('Parola trebuie să aibă minim 8 caractere.'); setLoading(false); return }
        if (password !== password2) { setError('Parolele nu coincid.'); setLoading(false); return }
        await register(email.trim(), password)
      } else {
        await login(email, password)
      }
      navigate('/dashboard')
    } catch (err) {
      const c = err?.code || ''
      setError(nou
        ? (c === 'auth/email-already-in-use' ? 'Există deja un cont cu acest email.' : c === 'auth/weak-password' ? 'Parola este prea slabă.' : 'Contul nu a putut fi creat.')
        : 'Email sau parolă incorectă.')
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
            <label htmlFor="login-email">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@firma.ro"
              required
              name="email"
              id="login-email"
              autoComplete="username"
              inputMode="email"
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
              autoComplete={nou ? 'new-password' : 'current-password'}
              enterKeyHint="go"
            />
          </div>
          {nou && (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label htmlFor="login-password2">Repetă parola</label>
              <input type="password" id="login-password2" name="password2" autoComplete="new-password"
                value={password2} onChange={e => setPassword2(e.target.value)} required />
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Se procesează…' : nou ? 'Creează cont' : 'Intră în cont'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
            onClick={() => { setNou(n => !n); setError('') }}>
            {nou ? 'Am deja cont' : 'Cont nou (necesită aprobarea administratorului)'}
          </button>
        </form>
      </div>
    </div>
  )
}
