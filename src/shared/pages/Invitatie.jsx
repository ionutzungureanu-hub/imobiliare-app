import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getInvitatie, folosesteInvitatie, curataCod, formateazaCod, NIVELURI } from '../firebase/firestore'

const mesajAuth = (e) => {
  const c = e?.code || ''
  if (c === 'auth/email-already-in-use') return 'Există deja un cont cu acest email. Alege „Am deja cont”.'
  if (c === 'auth/weak-password') return 'Parola este prea slabă (minim 8 caractere).'
  if (c === 'auth/invalid-email') return 'Adresa de email nu este validă.'
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found') return 'Email sau parolă incorectă.'
  if (c === 'auth/network-request-failed') return 'Fără conexiune la internet.'
  if (c === 'permission-denied' || c === 'firestore/permission-denied') return 'Nu s-a putut acorda accesul (invitație invalidă sau expirată).'
  return e?.message || 'A apărut o eroare. Încearcă din nou.'
}

export default function Invitatie() {
  const { cod: codUrl } = useParams()
  const cod = curataCod(codUrl)
  const navigate = useNavigate()
  const { user, profile, login, register, logout, reload } = useAuth()

  const [inv, setInv]         = useState(null)
  const [stare, setStare]     = useState('incarc')   // incarc | ok | invalid | folosit | expirat
  const [mod, setMod]         = useState('nou')      // nou | existent
  const [nume, setNume]       = useState('')
  const [email, setEmail]     = useState('')
  const [parola, setParola]   = useState('')
  const [parola2, setParola2] = useState('')
  const [eroare, setEroare]   = useState('')
  const [lucrez, setLucrez]   = useState(false)

  useEffect(() => {
    if (!cod) { setStare('invalid'); return }
    getInvitatie(cod).then(i => {
      if (!i) return setStare('invalid')
      setInv(i)
      if (i.folosit) return setStare('folosit')
      if (i.expiraLa?.toDate && i.expiraLa.toDate() < new Date()) return setStare('expirat')
      setStare('ok')
    }).catch(() => setStare('invalid'))
  }, [cod])

  const finalizeaza = async (u, numeFolosit) => {
    await folosesteInvitatie({ cod, uid: u.uid, nume: numeFolosit || u.email, email: u.email })
    await reload()
    navigate('/dashboard', { replace: true })
  }

  const submit = async (e) => {
    e.preventDefault()
    setEroare('')
    if (mod === 'nou') {
      if (!nume.trim()) return setEroare('Completează numele.')
      if (parola.length < 8) return setEroare('Parola trebuie să aibă minim 8 caractere.')
      if (parola !== parola2) return setEroare('Parolele nu coincid.')
    }
    setLucrez(true)
    try {
      const cred = mod === 'nou' ? await register(email.trim(), parola) : await login(email.trim(), parola)
      await finalizeaza(cred.user, nume.trim() || cred.user.displayName)
    } catch (err) { console.error(err); setEroare(mesajAuth(err)) }
    setLucrez(false)
  }

  const folosesteContCurent = async () => {
    setEroare(''); setLucrez(true)
    try { await finalizeaza(user, profile?.nume) }
    catch (err) { console.error(err); setEroare(mesajAuth(err)) }
    setLucrez(false)
  }

  const Mesaj = ({ titlu, text }) => (
    <div className="login-wrap"><div className="login-card" style={{ textAlign: 'center' }}>
      <div className="login-logo"><img src="/logo-rentis.png" alt="Rentis" style={{ width: 240, maxWidth: '100%', height: 'auto' }} /></div>
      <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--blue)', marginBottom: 8 }}>{titlu}</h2>
      <p style={{ color: 'var(--slate)', fontSize: 14 }}>{text}</p>
      <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => navigate('/login')}>Mergi la autentificare</button>
    </div></div>
  )

  if (stare === 'incarc') return <div className="login-wrap"><div className="login-card" style={{ textAlign: 'center' }}>Se verifică invitația…</div></div>
  if (stare === 'invalid') return <Mesaj titlu="Invitație invalidă" text="Codul nu există. Verifică linkul primit sau cere o invitație nouă." />
  if (stare === 'folosit') return <Mesaj titlu="Invitație folosită" text="Acest cod a fost deja folosit. Cere o invitație nouă administratorului imobilului." />
  if (stare === 'expirat') return <Mesaj titlu="Invitație expirată" text="Codul nu mai este valabil. Cere o invitație nouă administratorului imobilului." />

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo-rentis.png" alt="Rentis" style={{ width: 240, maxWidth: '100%', height: 'auto' }} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--blue)' }}>Ai fost invitat în <strong>{inv.imobilNume || 'imobil'}</strong></div>
          <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 4 }}>Nivel de acces: {NIVELURI[inv.nivel]} · cod {formateazaCod(cod)}</div>
        </div>

        {eroare && <div className="login-err">{eroare}</div>}

        {user ? (
          <>
            <p style={{ fontSize: 14, textAlign: 'center', marginBottom: 14 }}>
              Ești conectat ca <strong>{user.email}</strong>. Primești accesul pe acest cont.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={folosesteContCurent} disabled={lucrez}>
              {lucrez ? 'Se acordă accesul…' : 'Acceptă invitația'}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => logout()}>
              Folosește alt cont
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button type="button" className={`btn btn-sm ${mod === 'nou' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMod('nou')}>Cont nou</button>
              <button type="button" className={`btn btn-sm ${mod === 'existent' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMod('existent')}>Am deja cont</button>
            </div>
            {mod === 'nou' && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label htmlFor="inv-nume">Nume</label>
                <input id="inv-nume" name="name" autoComplete="name" value={nume} onChange={e => setNume(e.target.value)} required />
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label htmlFor="inv-email">Email</label>
              <input id="inv-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label htmlFor="inv-parola">Parolă</label>
              <input id="inv-parola" name="password" type="password" autoComplete={mod === 'nou' ? 'new-password' : 'current-password'}
                value={parola} onChange={e => setParola(e.target.value)} required />
            </div>
            {mod === 'nou' && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="inv-parola2">Repetă parola</label>
                <input id="inv-parola2" name="password2" type="password" autoComplete="new-password"
                  value={parola2} onChange={e => setParola2(e.target.value)} required />
              </div>
            )}
            <button className="btn btn-primary" type="submit" disabled={lucrez} style={{ width: '100%', justifyContent: 'center' }}>
              {lucrez ? 'Se procesează…' : mod === 'nou' ? 'Creează cont și acceptă' : 'Autentifică-te și acceptă'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
