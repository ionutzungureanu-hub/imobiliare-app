import { auth } from '../firebase/config'

// Username scurt → adresa internă folosită de Firebase (ex. „maria” → maria@rentis.app). Un username cu „@” rămâne email real.
export const DOMENIU_USERNAME = 'rentis.app'
export const usernameLaEmail = (u) => {
  const x = String(u || '').trim().toLowerCase()
  return x.includes('@') ? x : `${x}@${DOMENIU_USERNAME}`
}

// Apel către funcția Netlify (create | resetPassword | setDisabled | delete) — doar administrator
const apel = async (payload) => {
  const user = auth.currentUser
  if (!user) throw new Error('Nu ești autentificat.')
  const idToken = await user.getIdToken()
  let r
  try {
    r = await fetch('/.netlify/functions/utilizatori-admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, idToken }),
    })
  } catch { throw new Error('Funcția de administrare conturi nu poate fi contactată.') }
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || `Eroare server (${r.status}).`)
  return d
}

export const creeazaUtilizator = ({ username, password, nume, imobile }) => apel({ actiune: 'create', username, password, nume, imobile })
export const reseteazaParola   = (uid, password) => apel({ actiune: 'resetPassword', uid, password })
export const seteazaDezactivat = (uid, disabled) => apel({ actiune: 'setDisabled', uid, disabled })
export const stergeUtilizator  = (uid) => apel({ actiune: 'delete', uid })
