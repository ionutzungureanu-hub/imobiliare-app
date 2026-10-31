// Memento zilnic prin email: contracte care expiră în ≤ 7 zile (sau au expirat în ultimele 60 de zile)
// și nu sunt marcate „tratate” în Registru. Se trimite zilnic, până la bifare sau până la prelungirea contractului.
// Destinatari: administratorii + toți utilizatorii cu acces la imobilul contractului (cu „Email pentru notificări” completat).
//
// Programat zilnic (vezi `config`). Apelabil și de administrator din aplicație (previzualizare / test către sine).
// Variabile de mediu: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
//   RESEND_API_KEY, EMAIL_DOMAIN, opțional MEMENTO_FROM (implicit notificari@EMAIL_DOMAIN), MEMENTO_FROM_NAME (implicit „Rentis”)

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export const config = { schedule: '0 5 * * *' } // 05:00 UTC = 07:00/08:00 ora României

const ZILE_ANTERIOR = 7
const ZILE_DUPA = 60
const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const pauza = ms => new Promise(r => setTimeout(r, ms))

const init = () => {
  if (getApps().length) return
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env
  if (!projectId || !clientEmail || !key) throw new Error('config')
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key.replace(/\\n/g, '\n') }) })
}

const aziRO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date()) // YYYY-MM-DD
const diferentaZile = (data, azi) => Math.round((new Date(data + 'T00:00:00Z') - new Date(azi + 'T00:00:00Z')) / 86400000)
const fmt = d => d.split('-').reverse().join('.')

// Construiește, pentru fiecare destinatar, lista de contracte de semnalat
async function calculeaza(db) {
  const azi = aziRO()
  const [reg, imo, usr, acc] = await Promise.all([
    db.collection('registru_contracte').get(), db.collection('imobile').get(),
    db.collection('users').get(), db.collection('acces').get(),
  ])
  const numeImobil = Object.fromEntries(imo.docs.map(d => [d.id, d.data().nume || d.data().denumire || d.id]))
  const acces = Object.fromEntries(acc.docs.map(d => [d.id, d.data().imobile || {}]))

  const contracte = []
  for (const d of reg.docs) {
    const r = d.data()
    if (!r.dataFinal || r.activManual != null) continue            // doar cele cu stare „automată”
    if (r.expirareTratata && r.expirareTratata === r.dataFinal) continue // bifat „tratat” pentru data curentă
    const zile = diferentaZile(r.dataFinal, azi)
    if (zile > ZILE_ANTERIOR || zile < -ZILE_DUPA) continue
    contracte.push({ id: d.id, imobilId: r.imobilId, numar: r.numar || '', nume: r.nume || '', dataFinal: r.dataFinal, zile })
  }
  contracte.sort((a, b) => a.zile - b.zile)

  const destinatari = []
  for (const u of usr.docs) {
    const x = u.data()
    if (x.activ === false) continue
    const email = String(x.emailContact || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email)) continue
    const admin = x.rol === 'admin'
    const lista = contracte.filter(c => admin || (acces[u.id]?.[c.imobilId] || 0) >= 1)
    if (lista.length) destinatari.push({ uid: u.id, nume: x.nume || '', email, lista })
  }
  return { azi, contracte, destinatari, numeImobil }
}

const compune = (lista, numeImobil, azi, test) => {
  const grup = {}
  lista.forEach(c => { (grup[c.imobilId] = grup[c.imobilId] || []).push(c) })
  const txt = c => c.zile < 0 ? `a expirat acum ${-c.zile} ${-c.zile === 1 ? 'zi' : 'zile'}` : c.zile === 0 ? 'expiră ASTĂZI' : `expiră în ${c.zile} ${c.zile === 1 ? 'zi' : 'zile'}`
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a202c">
    <p>${test ? '<strong>[TEST]</strong> ' : ''}Contracte care necesită atenție (${fmt(azi)}):</p>
    ${Object.entries(grup).map(([im, cs]) => `<p style="margin:14px 0 4px"><strong>${esc(numeImobil[im] || 'Imobil')}</strong></p>
      <ul style="margin:0;padding-left:18px">${cs.map(c => `<li>Contract ${esc(c.numar || '—')} · ${esc(c.nume)} — ${esc(fmt(c.dataFinal))} (<strong style="color:${c.zile < 0 ? '#9B2C2C' : '#8A5A12'}">${txt(c)}</strong>)</li>`).join('')}</ul>`).join('')}
    <p style="margin-top:18px;color:#64748b;font-size:12px">Primești acest email zilnic până când contractul este prelungit (data de final modificată) sau bifat „tratat” în Registru contracte.</p></div>`
  const text = `Contracte care necesită atenție (${fmt(azi)}):\n` + Object.entries(grup).map(([im, cs]) =>
    `\n${numeImobil[im] || 'Imobil'}\n` + cs.map(c => ` - Contract ${c.numar || '—'} · ${c.nume} — ${fmt(c.dataFinal)} (${txt(c)})`).join('\n')).join('\n')
  const n = lista.length
  return { subject: `${test ? '[TEST] ' : ''}Memento: ${n} ${n === 1 ? 'contract' : 'contracte'} de verificat`, html, text }
}

async function trimite(to, { subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY
  const domeniu = (process.env.EMAIL_DOMAIN || '').toLowerCase()
  if (!apiKey || (!domeniu && !process.env.MEMENTO_FROM)) throw new Error('Lipsesc RESEND_API_KEY / EMAIL_DOMAIN din Netlify.')
  const from = (process.env.MEMENTO_FROM || `notificari@${domeniu}`).replace(/[\r\n<>"]/g, '')
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${(process.env.MEMENTO_FROM_NAME || 'Rentis').replace(/[\r\n<>"]/g, '')} <${from}>`, to: [to], subject, html, text }),
  })
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || `Resend ${r.status}`) }
}

export default async (req) => {
  try { init() } catch { return json(500, { error: 'Funcția nu este configurată (variabilele FIREBASE_* lipsesc din Netlify).' }) }
  const db = getFirestore()

  // Apel manual din aplicație: doar administrator, cu token Firebase
  const auth = req.headers.get('authorization') || ''
  if (auth.startsWith('Bearer ')) {
    let uid
    try { uid = (await getAuth().verifyIdToken(auth.slice(7))).uid } catch { return json(401, { error: 'Sesiune invalidă.' }) }
    const me = (await db.collection('users').doc(uid).get()).data()
    if (!me || me.rol !== 'admin' || me.activ === false) return json(403, { error: 'Doar administratorul.' })
    let p = {}; try { p = await req.json() } catch { /* fără corp */ }
    const { azi, contracte, destinatari, numeImobil } = await calculeaza(db)
    const rezumat = destinatari.map(d => ({ nume: d.nume, email: d.email, contracte: d.lista.length }))
    if (p.actiune === 'test') {
      const mine = destinatari.find(d => d.uid === uid)
      const email = String(me.emailContact || '').trim()
      if (!EMAIL_RE.test(email)) return json(400, { error: 'Completează mai întâi „Email pentru notificări” la contul tău în Utilizatori.' })
      const lista = mine ? mine.lista : contracte
      if (!lista.length) return json(200, { ok: true, trimis: false, mesaj: 'Niciun contract de semnalat astăzi.', contracte: 0 })
      try { await trimite(email, compune(lista, numeImobil, azi, true)) } catch (e) { return json(502, { error: e.message }) }
      return json(200, { ok: true, trimis: true, contracte: lista.length })
    }
    return json(200, { ok: true, azi, contracte: contracte.length, destinatari: rezumat })
  }

  // Rulare programată: o singură dată pe zi
  const azi = aziRO()
  const logRef = db.collection('memento_log').doc(azi)
  try { await logRef.create({ start: FieldValue.serverTimestamp() }) } catch { return json(200, { ok: true, deja: true }) }
  try {
    const { contracte, destinatari, numeImobil } = await calculeaza(db)
    let trimise = 0; const erori = []
    for (const d of destinatari) {
      try { await trimite(d.email, compune(d.lista, numeImobil, azi, false)); trimise++ }
      catch (e) { erori.push(`${d.email}: ${e.message}`) }
      await pauza(600)
    }
    await logRef.set({ contracte: contracte.length, destinatari: destinatari.length, trimise, erori: erori.slice(0, 10), final: FieldValue.serverTimestamp() }, { merge: true })
    return json(200, { ok: true, trimise })
  } catch (e) {
    await logRef.set({ eroare: String(e.message || e) }, { merge: true }).catch(() => {})
    return json(500, { error: 'Eroare la memento.' })
  }
}
