import jsPDF from 'jspdf'
import { fmt } from '../../../shared/utils'

export function genereazaNotaCalcul({ imobil, spatiu, client, chirie, liniiUtilitati, scadenta, perioada, userNume }) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' })
  const W    = 210
  const ml   = 20  // margin left
  const mr   = 190 // margin right
  let   y    = 20

  const line  = (x1, y1, x2, y2) => doc.line(x1, y1, x2, y2)
  const text  = (t, x, yy, opts = {}) => doc.text(t, x, yy, opts)
  const setF  = (size, style = 'normal') => doc.setFontSize(size) || doc.setFont('helvetica', style)
  const color = (r, g, b) => doc.setTextColor(r, g, b)
  const draw  = (r, g, b) => doc.setDrawColor(r, g, b)
  const fill  = (r, g, b) => doc.setFillColor(r, g, b)

  // ── Antet imobil ──────────────────────────────────────────────
  if (imobil?.antetNota) {
    setF(14, 'bold'); color(30, 30, 30)
    text(imobil.antetNota, W / 2, y, { align: 'center' }); y += 6
  }
  if (imobil?.subAntetNota) {
    setF(10, 'normal'); color(100, 100, 100)
    text(imobil.subAntetNota, W / 2, y, { align: 'center' }); y += 5
  }
  if (imobil?.adresa && !imobil?.subAntetNota) {
    setF(10, 'normal'); color(100, 100, 100)
    text(imobil.adresa, W / 2, y, { align: 'center' }); y += 5
  }

  y += 4
  draw(200, 200, 200); line(ml, y, mr, y); y += 8

  // ── Titlu ─────────────────────────────────────────────────────
  setF(16, 'bold'); color(27, 79, 216)
  text('NOTĂ DE CALCUL', W / 2, y, { align: 'center' }); y += 7
  setF(9, 'normal'); color(100, 100, 100)
  const nr   = 'NC-' + Date.now().toString().slice(-6)
  const data = new Date().toLocaleDateString('ro-RO')
  text(`Nr. ${nr}   |   Data: ${data}   |   Perioadă: ${perioada}`, W / 2, y, { align: 'center' }); y += 8

  // ── Date chiriaș ──────────────────────────────────────────────
  fill(245, 247, 250); doc.rect(ml, y, mr - ml, 22, 'F')
  draw(220, 220, 220); doc.rect(ml, y, mr - ml, 22, 'S')
  y += 6
  setF(9, 'normal'); color(100, 100, 100)
  text('Chiriaș:', ml + 4, y)
  setF(10, 'bold'); color(15, 23, 42)
  text(client?.nume || '—', ml + 28, y); y += 5

  setF(9, 'normal'); color(100, 100, 100)
  text('Spațiu:', ml + 4, y)
  setF(9, 'normal'); color(15, 23, 42)
  text(`${spatiu?.denumire || '—'}${spatiu?.suprafata ? ` (${spatiu.suprafata} mp)` : ''}`, ml + 28, y); y += 5

  setF(9, 'normal'); color(100, 100, 100)
  text('Scadență:', ml + 4, y)
  setF(9, 'bold'); color(220, 38, 38)
  text(scadenta || '—', ml + 28, y); y += 10

  // ── Chirie ────────────────────────────────────────────────────
  if (chirie && Number(chirie) > 0) {
    fill(238, 242, 255); doc.rect(ml, y, mr - ml, 9, 'F')
    draw(199, 210, 254); doc.rect(ml, y, mr - ml, 9, 'S')
    y += 6
    setF(10, 'bold'); color(15, 23, 42)
    text('CHIRIE LUNARĂ', ml + 4, y)
    text(`${fmt(chirie)} RON`, mr - 4, y, { align: 'right' })
    y += 7
  }

  // ── Utilități ─────────────────────────────────────────────────
  const liniiActive = liniiUtilitati.filter(l => l.activ && (l.total > 0 || l.valoare > 0))
  if (liniiActive.length > 0) {
    y += 2
    fill(245, 247, 250); doc.rect(ml, y, mr - ml, 7, 'F')
    draw(220, 220, 220); doc.rect(ml, y, mr - ml, 7, 'S')
    y += 5
    setF(9, 'bold'); color(100, 100, 100)
    text('UTILITĂȚI', ml + 4, y); y += 5

    liniiActive.forEach(l => {
      draw(235, 235, 235); line(ml, y + 3, mr, y + 3)
      setF(9, 'normal'); color(15, 23, 42)
      text(l.tip, ml + 4, y)
      if (l.fix || l.mod === 'valoare') {
        setF(8, 'normal'); color(100, 100, 100)
        text('sumă fixă', ml + 70, y)
      } else {
        setF(8, 'normal'); color(100, 100, 100)
        text(`${l.consum} ${l.um} × ${l.pret} RON/${l.um}`, ml + 4, y + 4)
      }
      setF(9, 'bold'); color(15, 23, 42)
      text(`${fmt(l.total || l.valoare)} RON`, mr - 4, y, { align: 'right' })
      y += (l.fix || l.mod === 'valoare') ? 6 : 9
    })
  }

  // ── Total ─────────────────────────────────────────────────────
  const totalChirie  = Number(chirie) || 0
  const totalUtil    = liniiActive.reduce((s, l) => s + (l.total || Number(l.valoare) || 0), 0)
  const totalGeneral = totalChirie + totalUtil

  y += 4
  fill(27, 79, 216); doc.rect(ml, y, mr - ml, 11, 'F')
  y += 7
  setF(12, 'bold'); color(255, 255, 255)
  text('TOTAL DE PLATĂ', ml + 4, y)
  text(`${fmt(totalGeneral)} RON`, mr - 4, y, { align: 'right' })
  y += 12

  // ── Footer ────────────────────────────────────────────────────
  setF(8, 'normal'); color(150, 150, 150)
  text(`Întocmit: ${userNume || ''}   |   Data: ${data}`, ml, y)
  text('Document generat automat — Imobiliare Admin', mr, y, { align: 'right' })

  return { doc, nr }
}

export function descarcaNotaCalcul(params) {
  const { doc, nr } = genereazaNotaCalcul(params)
  doc.save(`Nota_Calcul_${nr}.pdf`)
}
