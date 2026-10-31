// Calcule pentru facturarea lunară a chiriilor (fără legătură cu un furnizor anume)

// Anul de la care se aplică regula „indexare în ianuarie”. Contractele existente se consideră indexate până în acest an.
export const ANUL_START_INDEXARE = 2026

export const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']
export const TVA_IMPLICIT = 21

export const rotunjeste = (n, z = 2) => { const f = 10 ** z; return Math.round((Number(n) || 0) * f) / f }
export const luna0 = () => new Date().toISOString().slice(0, 7)
export const ultimaZi = (luna) => { const [y, m] = luna.split('-').map(Number); return new Date(y, m, 0).getDate() }
export const numeLuna = (luna) => { const [y, m] = luna.split('-').map(Number); return `${LUNI[m - 1]} ${y}` }
export const adaugaZile = (data, n) => { const d = new Date(data + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
export const fmtD = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

// Parametrii de scadență: contractul are prioritate, apoi entitatea, apoi 20 de zile
export const parametriScadenta = (r, ent) => ({
  tip: r.tipScadenta || ent?.tipScadenta || 'zile',
  val: Number(r.valScadenta || ent?.valScadenta || 20),
})

// zile: emitere + N zile · data: ziua N din luna emiterii (dacă a trecut deja, din luna următoare)
export const scadenta = (dataEmitere, { tip, val }) => {
  if (tip === 'data') {
    const [y, m, d] = dataEmitere.split('-').map(Number)
    let an = y, lu = m
    if (val < d) { lu += 1; if (lu > 12) { lu = 1; an += 1 } }
    const zi = Math.min(val, new Date(an, lu, 0).getDate())
    return `${an}-${String(lu).padStart(2, '0')}-${String(zi).padStart(2, '0')}`
  }
  return adaugaZile(dataEmitere, val)
}

// Textul de pe factură: {luna} {anul} {contract}
export const textFactura = (sablon, luna, r) => {
  const [y, m] = luna.split('-').map(Number)
  return String(sablon || 'Chirie {luna} {anul} – contract nr. {contract}')
    .replaceAll('{luna}', LUNI[m - 1]).replaceAll('{anul}', String(y)).replaceAll('{contract}', r.numar || r.identificator || '')
}

// Contractul acoperă luna (cel puțin o zi)?
export const inLuna = (r, luna) => {
  if (r.activManual === false) return false
  const start = `${luna}-01`, end = `${luna}-${String(ultimaZi(luna)).padStart(2, '0')}`
  if (r.dataStart && r.dataStart > end) return false
  if (r.activManual !== true && r.dataFinal && r.dataFinal < start) return false
  return true
}
export const lunaIncompleta = (r, luna) => {
  const start = `${luna}-01`, end = `${luna}-${String(ultimaZi(luna)).padStart(2, '0')}`
  return (r.dataStart && r.dataStart > start) || (r.activManual !== true && r.dataFinal && r.dataFinal < end)
}

// Indexare: ultimul an în care chiria a fost indexată (sau considerată indexată)
export const anIndexat = (r) => {
  if (r.indexatAn) return Number(r.indexatAn)
  const anStart = r.dataStart ? Number(r.dataStart.slice(0, 4)) : 0
  return Math.max(anStart, ANUL_START_INDEXARE)
}
export const asteaptaIndexare = (r, an) => !!r.factActiv && r.indexabil !== false && anIndexat(r) < an

// Calculul unei chirii: bază (RON), TVA, total
export const calcul = (r, ent, suma, curs) => {
  const eur = (r.moneda || 'RON') !== 'RON'
  const c = eur ? Number(curs) || 0 : 1
  const baza = rotunjeste(Number(suma) * c)
  const tvaProc = r.tva !== '' && r.tva != null ? Number(r.tva) : (ent?.tva ?? TVA_IMPLICIT)
  const tva = rotunjeste(baza * tvaProc / 100)
  return { baza, tvaProc, tva, total: rotunjeste(baza + tva), lipsaCurs: eur && !c }
}

// CSV pentru Excel românesc: separator „;”, BOM UTF-8, zecimale cu virgulă
const celula = (v) => {
  const t = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '')
  return /[;"\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t
}
export const construiesteCsv = (coloane, randuri) =>
  '﻿' + [coloane, ...randuri].map(r => r.map(celula).join(';')).join('\r\n')

export const descarca = (nume, continut, tip = 'text/csv;charset=utf-8') => {
  const url = URL.createObjectURL(new Blob([continut], { type: tip }))
  const a = document.createElement('a'); a.href = url; a.download = nume; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// E-mailul clientului (câmp simplu sau listă „emailuri”)
export const emailClient = (c) => {
  if (!c) return ''
  if (c.email) return c.email
  const e = (c.emailuri || []).find(x => (typeof x === 'string' ? x : x?.email))
  return e ? (typeof e === 'string' ? e : e.email) : ''
}

// Sinteză pentru Dashboard: câte chirii sunt de emis în luna dată (aceleași reguli ca în „De emis luna asta”)
export const sumarDeEmis = (rows, luna, entitati, facturate, isAdmin) => {
  const an = Number(luna.slice(0, 4))
  const r0 = { deEmis: 0, indexare: 0, faraEntitate: 0 }
  for (const r of rows) {
    if (!r.factActiv || !inLuna(r, luna) || !Number(r.chirie)) continue
    if (facturate.some(f => f.contractId === r.id)) continue
    const ent = entitati.find(e => e.nume === r.entitate)
    if (!isAdmin && r.entitate && !ent) continue
    if (!r.entitate || !ent || ent.activ === false) { r0.faraEntitate++; continue }
    if (asteaptaIndexare(r, an)) { r0.indexare++; continue }
    r0.deEmis++
  }
  return r0
}
