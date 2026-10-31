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

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const textLaHtml = (text) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#2A2A30">${esc(text).replace(/\n/g, '<br>')}</div>`

// Culorile aplicației, pentru emailuri
const C = { navy: '#14213D', deep: '#0C1630', gold: '#B8975A', goldDark: '#8A6D3B', cream: '#F3EEE3', bg: '#F7F5F0', ink: '#2A2A30', slate: '#6B6B70', border: '#E8E3D8' }
const SERIF = "Georgia,'Times New Roman',serif"
const SANS = "Arial,Helvetica,sans-serif"
const urlOk = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(String(u || '').trim())

// Textul simplu → paragrafe; liniile care încep cu „- ” devin listă
function corpHtml(text) {
  const esteLi = (l) => /^\s*[-•]\s+/.test(l)
  return String(text || '').replace(/\r/g, '').split(/\n{2,}/).map(bloc => {
    const linii = bloc.split('\n'), out = []
    let i = 0
    while (i < linii.length) {
      const li = esteLi(linii[i]); const grup = []
      while (i < linii.length && esteLi(linii[i]) === li) grup.push(linii[i++])
      out.push(li
        ? `<ul style="margin:0 0 16px 0;padding-left:20px;color:${C.ink}">${grup.map(l => `<li style="margin:0 0 6px 0">${esc(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('')}</ul>`
        : `<p style="margin:0 0 ${linii[i] !== undefined && esteLi(linii[i]) ? 8 : 16}px 0">${grup.map(esc).join('<br>')}</p>`)
    }
    return out.join('')
  }).join('')
}

// Email elegant, în culorile aplicației (bleumarin + auriu). Tabele și stiluri inline, pentru compatibilitate cu Gmail/Outlook/Yahoo.
export const htmlProfesional = ({ brand = '', titlu = '', text = '', butonText = '', butonUrl = '', semnatura = '' }) => {
  const arataButon = butonText && urlOk(butonUrl)
  return `<!doctype html><html lang="ro"><body style="margin:0;padding:0;background:${C.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${C.border};border-radius:4px;overflow:hidden">
    <tr><td style="background:${C.navy};padding:26px 32px;text-align:left">
      <div style="font-family:${SERIF};font-size:22px;letter-spacing:.5px;color:${C.cream}">${esc(brand || 'Administrare')}</div>
    </td></tr>
    <tr><td style="background:${C.gold};height:3px;line-height:3px;font-size:0">&nbsp;</td></tr>
    <tr><td style="padding:34px 32px 8px 32px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.ink}">
      ${titlu ? `<h1 style="margin:0 0 20px 0;font-family:${SERIF};font-weight:normal;font-size:26px;line-height:1.25;color:${C.navy}">${esc(titlu)}</h1>` : ''}
      ${corpHtml(text)}
      ${arataButon ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px 0"><tr><td style="background:${C.navy};border-radius:3px"><a href="${esc(butonUrl.trim())}" style="display:inline-block;padding:13px 28px;font-family:${SANS};font-size:14px;font-weight:bold;letter-spacing:.4px;color:${C.cream};text-decoration:none">${esc(butonText)}</a></td></tr></table>
      <p style="margin:0 0 16px 0;font-size:12px;color:${C.slate}">Dacă butonul nu se deschide, copiază acest link în browser:<br><a href="${esc(butonUrl.trim())}" style="color:${C.goldDark};word-break:break-all">${esc(butonUrl.trim())}</a></p>` : ''}
    </td></tr>
    ${semnatura ? `<tr><td style="padding:0 32px 30px 32px;font-family:${SANS}">
      <div style="border-top:1px solid ${C.gold};width:48px;margin:6px 0 14px 0;font-size:0;line-height:0">&nbsp;</div>
      <div style="font-size:13px;line-height:1.6;color:${C.slate}">${String(semnatura).replace(/\r/g, '').split('\n').map(esc).join('<br>')}</div>
    </td></tr>` : '<tr><td style="padding-bottom:24px;font-size:0">&nbsp;</td></tr>'}
    <tr><td style="background:${C.bg};border-top:1px solid ${C.border};padding:16px 32px;font-family:${SANS};font-size:11px;line-height:1.5;color:${C.slate}">
      Mesaj trimis de ${esc(brand || 'administrare')}. Dacă ai întrebări, răspunde direct la acest email.
    </td></tr>
  </table>
</td></tr></table></body></html>`
}

// Varianta text simplă (pentru clienții de email fără HTML)
export const textProfesional = ({ titlu = '', text = '', butonText = '', butonUrl = '', semnatura = '' }) =>
  [titlu, text, butonText && urlOk(butonUrl) ? `${butonText}: ${butonUrl.trim()}` : '', semnatura ? `-- \n${semnatura}` : ''].filter(Boolean).join('\n\n')

export const VARIABILE = [
  ['nume', 'Nume client / firmă'], ['administrator', 'Administrator / persoană de contact'],
  ['numar_contract', 'Nr. contract'], ['data_start', 'Data început contract'], ['data_final', 'Data final contract'],
  ['chirie', 'Chirie lunară'], ['spatiu', 'Spațiu'], ['entitate', 'Cine facturează'], ['expeditor', 'Nume expeditor'],
  ['link_utilitati', 'Link personal pentru transmiterea indexurilor (portalul spațiului)'], ['luna', 'Luna curentă'], ['an', 'Anul curent'],
]

// Șabloane recomandate. Textul dintre [paranteze drepte] se completează înainte de trimitere (aplicația avertizează dacă a rămas).
export const SABLOANE_EXEMPLU = [
  { nume: 'Informare generală', categorie: 'Informări', titlu: '[Titlul informării]',
    subiect: 'Informare — {{spatiu}}',
    corp: 'Bună ziua, {{nume}},\n\n[Scrie aici mesajul.]\n\nVă mulțumim pentru înțelegere.' },
  { nume: 'Urare — Crăciun și Anul Nou', categorie: 'Urări', titlu: 'Sărbători fericite!',
    subiect: 'Sărbători fericite!',
    corp: 'Bună ziua, {{nume}},\n\nÎn pragul sărbătorilor, vă mulțumim pentru colaborarea din acest an și vă dorim sănătate, liniște și un An Nou plin de realizări.\n\nCrăciun fericit și La mulți ani!' },
  { nume: 'Urare — Paște', categorie: 'Urări', titlu: 'Paște fericit!',
    subiect: 'Paște fericit!',
    corp: 'Bună ziua, {{nume}},\n\nVă dorim un Paște luminat, alături de cei dragi, cu sănătate, pace și bucurie.\n\nHristos a înviat!' },
  { nume: 'Transmitere indexuri (link utilități)', categorie: 'Utilități', titlu: 'Transmiterea indexurilor',
    subiect: 'Indexuri utilități — {{spatiu}} ({{luna}} {{an}})',
    corp: 'Bună ziua, {{nume}},\n\nVă rugăm să ne transmiteți indexurile contoarelor pentru spațiul {{spatiu}}, aferente lunii {{luna}} {{an}}.\n\nO puteți face în câteva secunde, din telefon sau calculator, folosind linkul personal de mai jos. Nu necesită cont sau parolă.\n\nVă mulțumim!',
    butonText: 'Transmite indexurile', butonUrl: '{{link_utilitati}}' },
  { nume: 'Bun venit (cu link utilități)', categorie: 'Utilități', titlu: 'Bine ați venit!',
    subiect: 'Bine ați venit — {{spatiu}}',
    corp: 'Bună ziua, {{nume}},\n\nVă urăm bun venit și vă mulțumim pentru încredere!\n\nPentru spațiul {{spatiu}} aveți la dispoziție un link personal prin care puteți:\n- transmite lunar indexurile contoarelor;\n- trimite o sesizare sau un document.\n\nSalvați linkul pentru lunile următoare.',
    butonText: 'Deschide portalul meu', butonUrl: '{{link_utilitati}}' },
  { nume: 'Întrerupere programată / lucrări', categorie: 'Informări', titlu: 'Informare privind lucrări programate',
    subiect: 'Informare: [tipul lucrării] — [data]',
    corp: 'Bună ziua, {{nume}},\n\nVă informăm că în data de [data], între orele [interval orar], vor avea loc [descrierea lucrării]. În acest interval pot apărea [efecte: întreruperea apei / curentului / accesului].\n\nNe cerem scuze pentru disconfort și vă mulțumim pentru înțelegere.' },
  { nume: 'Expirare contract', categorie: 'Contracte', titlu: 'Contractul dumneavoastră se apropie de final',
    subiect: 'Contract {{numar_contract}} — expiră la {{data_final}}',
    corp: 'Bună ziua, {{nume}},\n\nVă informăm că contractul {{numar_contract}} pentru spațiul {{spatiu}} expiră la data de {{data_final}}.\n\nVă rugăm să ne comunicați dacă doriți prelungirea, pentru a pregăti documentele din timp.\n\nVă mulțumim!' },
]
