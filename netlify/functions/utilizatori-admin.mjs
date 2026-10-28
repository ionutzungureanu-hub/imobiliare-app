// Administrarea conturilor de utilizator — DOAR pentru administratorul general.
// Variabile de mediu (Netlify → Site configuration → Environment variables):
//   FIREBASE_PROJECT_ID     ID-ul proiectului Firebase
//   FIREBASE_CLIENT_EMAIL   client_email din cheia de serviciu
//   FIREBASE_PRIVATE_KEY    private_key din cheia de serviciu (cu \n păstrate)
//   USERNAME_DOMAIN         opțional, implicit rentis.app (username-ul scurt devine username@rentis.app)
//
// Acțiuni: create | resetPassword | setDisabled | delete

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const DOMENIU = (process.env.USERNAME_DOMAIN || 'rentis.app').toLowerCase()
const USER_RE = /^[a-z0-9._-]{2,32}$/
const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/

const emailDin = (u) => {
  const x = String(u || '').trim().toLowerCase()
  return x.includes('@') ? x : `${x}@${DOMENIU}`
}

const init = () => {
  if (getApps().length) return
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env
  if (!projectId || !clientEmail || !key) throw new Error('config')
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key.replace(/\\n/g, '\n') }) })
}

const mesajAuth = (e) => {
  const c = e?.code || ''
  if (c === 'auth/email-already-exists') return 'Există deja un utilizator cu acest username.'
  if (c === 'auth/invalid-password') return 'Parola nu este acceptată de Firebase (minim 6 caractere).'
  if (c === 'auth/invalid-email') return 'Username invalid.'
  if (c === 'auth/user-not-found') return 'Utilizatorul nu există.'
  return e?.message || 'Eroare necunoscută.'
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Metodă nepermisă.' })
  let p
  try { p = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Cerere invalidă.' }) }

  try { init() } catch { return json(500, { error: 'Funcția nu este configurată: lipsesc variabilele FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY din Netlify.' }) }

  // 1) Autentificare + verificare administrator general
  let caller
  try { caller = await getAuth().verifyIdToken(String(p.idToken || '')) }
  catch { return json(401, { error: 'Sesiune invalidă. Autentifică-te din nou.' }) }
  const db = getFirestore()
  const prof = await db.doc(`users/${caller.uid}`).get()
  if (!prof.exists || prof.data().rol !== 'admin' || prof.data().activ === false) {
    return json(403, { error: 'Doar administratorul poate gestiona conturile.' })
  }

  const auth = getAuth()
  try {
    switch (p.actiune) {
      case 'create': {
        const user = String(p.username || '').trim().toLowerCase()
        if (!(user.includes('@') ? EMAIL_RE.test(user) : USER_RE.test(user))) {
          return json(400, { error: 'Username invalid: 2–32 caractere, doar litere mici, cifre, punct, minus sau underscore.' })
        }
        const parola = String(p.password || '')
        if (!parola) return json(400, { error: 'Introdu o parolă.' })
        if (parola.length < 6) return json(400, { error: 'Firebase cere minim 6 caractere pentru parolă (nu pot fi mai puține).' })
        const email = emailDin(user)
        const nume = String(p.nume || '').trim().slice(0, 80) || user
        const rec = await auth.createUser({ email, password: parola, displayName: nume, disabled: false })
        await db.doc(`users/${rec.uid}`).set({
          nume, email, username: user.includes('@') ? user.split('@')[0] : user, rol: 'manager', activ: true, creatLa: FieldValue.serverTimestamp(),
        })
        // Acces inițial pe imobile: { imobilId: 1|2|3 }
        const imobile = {}
        for (const [k, v] of Object.entries(p.imobile || {})) {
          const n = Number(v)
          if (n >= 1 && n <= 3 && typeof k === 'string' && k && !k.includes('/')) imobile[k] = n
        }
        await db.doc(`acces/${rec.uid}`).set({ imobile, adm: [], nume, email, updatedAt: FieldValue.serverTimestamp() })
        return json(200, { ok: true, uid: rec.uid, email })
      }

      case 'resetPassword': {
        const parola = String(p.password || '')
        if (!parola) return json(400, { error: 'Introdu o parolă.' })
        if (parola.length < 6) return json(400, { error: 'Firebase cere minim 6 caractere pentru parolă (nu pot fi mai puține).' })
        await auth.updateUser(String(p.uid), { password: parola })
        return json(200, { ok: true })
      }

      case 'setDisabled': {
        if (p.uid === caller.uid) return json(400, { error: 'Nu îți poți dezactiva propriul cont.' })
        const dezactivat = !!p.disabled
        await auth.updateUser(String(p.uid), { disabled: dezactivat })
        await db.doc(`users/${p.uid}`).set({ activ: !dezactivat }, { merge: true })
        return json(200, { ok: true })
      }

      case 'delete': {
        if (p.uid === caller.uid) return json(400, { error: 'Nu îți poți șterge propriul cont.' })
        try { await auth.deleteUser(String(p.uid)) } catch (e) { if (e?.code !== 'auth/user-not-found') throw e }
        await db.doc(`users/${p.uid}`).delete()
        await db.doc(`acces/${p.uid}`).delete()
        return json(200, { ok: true })
      }

      default:
        return json(400, { error: 'Acțiune necunoscută.' })
    }
  } catch (e) {
    console.error('utilizatori-admin', p.actiune, e)
    return json(500, { error: mesajAuth(e) })
  }
}
