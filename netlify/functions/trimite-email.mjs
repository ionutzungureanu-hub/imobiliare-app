// Trimitere email prin Resend, doar pentru utilizatori autentificați în aplicație.
// Variabile de mediu necesare (Netlify → Site configuration → Environment variables):
//   RESEND_API_KEY   cheia API din Resend
//   EMAIL_DOMAIN     domeniul verificat în Resend (ex. kadoexcelsior.ro) — adresele "De la" trebuie să fie pe acest domeniu
//   EMAIL_TEST_MODE  opțional, "1" = permite onboarding@resend.dev (doar pentru teste, trimite doar către adresa ta din Resend)
//   FIREBASE_API_KEY opțional (se folosește VITE_FIREBASE_API_KEY dacă lipsește)

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/
const curata = s => String(s || '').replace(/[\r\n<>"]/g, ' ').trim()

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Metodă nepermisă.' })

  let p
  try { p = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Cerere invalidă.' }) }

  // 1) Verifică utilizatorul (token Firebase)
  const fbKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY
  if (!fbKey || !p.idToken) return json(401, { error: 'Neautentificat.' })
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${fbKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: p.idToken }),
    })
    if (!r.ok) return json(401, { error: 'Sesiune invalidă. Autentifică-te din nou.' })
  } catch { return json(502, { error: 'Nu am putut verifica autentificarea.' }) }

  const apiKey = process.env.RESEND_API_KEY
  const domeniu = (process.env.EMAIL_DOMAIN || '').toLowerCase()
  const test = process.env.EMAIL_TEST_MODE === '1'

  if (p.actiune === 'status') {
    return json(200, { ok: true, cheie: !!apiKey, domeniu: domeniu || null, test })
  }

  if (!apiKey) return json(500, { error: 'Serverul de email nu este configurat (lipsește RESEND_API_KEY).' })

  // 2) Validări
  const fromEmail = curata(p.fromEmail).toLowerCase()
  if (!EMAIL_RE.test(fromEmail)) return json(400, { error: 'Adresa expeditorului este invalidă.' })
  const fromDomain = fromEmail.split('@')[1]
  const permis = (domeniu && fromDomain === domeniu) || (test && fromEmail === 'onboarding@resend.dev')
  if (!permis) return json(400, { error: `Adresa expeditorului trebuie să fie pe domeniul configurat (${domeniu || 'neconfigurat'}).` })

  const to = (Array.isArray(p.to) ? p.to : []).map(curata).filter(a => EMAIL_RE.test(a))
  if (!to.length || to.length > 5) return json(400, { error: 'Destinatari invalizi (1–5 adrese).' })
  const subject = curata(p.subject).slice(0, 200)
  if (!subject) return json(400, { error: 'Subiect lipsă.' })
  const html = String(p.html || '')
  if (!html || html.length > 200000) return json(400, { error: 'Conținut lipsă sau prea mare.' })

  const body = {
    from: `${curata(p.fromName) || fromEmail} <${fromEmail}>`,
    to, subject, html,
    text: String(p.text || '').slice(0, 200000) || undefined,
  }
  const reply = curata(p.replyTo)
  if (reply && EMAIL_RE.test(reply)) body.reply_to = reply

  // 3) Trimite
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) return json(r.status === 429 ? 429 : 502, { error: d.message || 'Furnizorul de email a refuzat mesajul.' })
    return json(200, { ok: true, id: d.id })
  } catch { return json(502, { error: 'Nu am putut contacta furnizorul de email.' }) }
}
