import { auth } from '../firebase/config'

const apel = async (payload) => {
  const user = auth.currentUser
  if (!user) throw new Error('Nu ești autentificat.')
  const idToken = await user.getIdToken()
  let r
  try {
    r = await fetch('/.netlify/functions/trimite-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, idToken }),
    })
  } catch { throw new Error('Funcția de trimitere nu poate fi contactată.') }
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || `Eroare server (${r.status}).`)
  return d
}

export const statusServerEmail = () => apel({ actiune: 'status' })
export const trimiteEmailServer = (p) => apel(p)

// Înlocuiește {{variabila}} cu valorile; variabilele necunoscute devin goale
export const aplicaVariabile = (text, vars) =>
  String(text || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => vars[k.toLowerCase()] ?? '')

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const textLaHtml = (text) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1e293b">${esc(text).replace(/\n/g, '<br>')}</div>`

export const VARIABILE = [
  ['nume', 'Nume client / firmă'], ['administrator', 'Administrator / persoană de contact'],
  ['numar_contract', 'Nr. contract'], ['data_start', 'Data început contract'], ['data_final', 'Data final contract'],
  ['chirie', 'Chirie lunară'], ['spatiu', 'Spațiu'], ['entitate', 'Cine facturează'], ['expeditor', 'Nume expeditor'],
]

export const SABLOANE_EXEMPLU = [
  { nume: 'Expirare contract', categorie: 'Contracte',
    subiect: 'Contract {{numar_contract}} — expiră la {{data_final}}',
    corp: 'Bună ziua,\n\nVă informăm că contractul {{numar_contract}} pentru spațiul {{spatiu}} expiră la data de {{data_final}}.\nVă rugăm să ne comunicați dacă doriți prelungirea.\n\nCu stimă,\n{{expeditor}}' },
  { nume: 'Reamintire indexuri', categorie: 'Utilități',
    subiect: 'Transmiterea indexurilor — {{spatiu}}',
    corp: 'Bună ziua, {{nume}},\n\nVă rugăm să transmiteți indexurile contoarelor pentru spațiul {{spatiu}}.\n\nMulțumim,\n{{expeditor}}' },
  { nume: 'Informare generală', categorie: 'General',
    subiect: 'Informare',
    corp: 'Bună ziua, {{nume}},\n\n\n\nCu stimă,\n{{expeditor}}' },
]
