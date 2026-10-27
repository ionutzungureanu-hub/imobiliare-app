// Apelativul utilizatorului (ex. „Ionuț”) — folosit în salut, mesaje de eroare și confirmări.
let _apelativ = ''
export const setApelativ = (v) => { _apelativ = (v || '').trim() }
export const getApelativ = () => _apelativ

const incepeMic = (t) => {
  if (!t) return t
  // păstrează siglele (ex. „FGO…”, „PDF…”)
  if (t.length > 1 && t[1] === t[1].toUpperCase() && t[1] !== t[1].toLowerCase()) return t
  return t.charAt(0).toLowerCase() + t.slice(1)
}
// „Eroare la salvare.” → „Ionuț, eroare la salvare.”
export const adreseaza = (msg) => (_apelativ && msg) ? `${_apelativ}, ${incepeMic(String(msg))}` : msg
