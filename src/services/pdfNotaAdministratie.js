import jsPDF from 'jspdf'
import { fmt } from '../utils'

export function genereazaNotaAdministratie({ spatiu, imobil, client, citiri, perioada, userNume }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W   = 210
  const ml  = 20
  const mr  = 190
  let   y   = 20

  const setF  = (size, style = 'normal') => { doc.setFontSize(size); doc.setFont('helvetica', style) }
  const color = (r, g, b) => doc.setTextColor(r, g, b)
  const draw  = (r, g, b) => doc.setDrawColor(r, g, b)
  const fill  = (r, g, b) => doc.setFillColor(r, g, b)
  const line  = (x1, y1, x2, y2) => doc.line(x1, y1, x2, y2)

  // ── Antet ─────────────────────────────────────────────────────
  if (imobil?.antetNota) {
    setF(13, 'bold'); color(30, 30, 30)
    doc.text(imobil.antetNota, W / 2, y, { align: 'center' }); y += 6
  }
  if (imobil?.adresa) {
    setF(10, 'normal'); color(100, 100, 100)
    doc.text(imobil.adresa, W / 2, y, { align: 'center' }); y += 5
  }

  y += 4; draw(200, 200, 200); line(ml, y, mr, y); y += 8

  // ── Titlu ─────────────────────────────────────────────────────
  setF(15, 'bold'); color(27, 79, 216)
  doc.text('NOTĂ DE CONSUM APĂ', W / 2, y, { align: 'center' }); y += 6
  setF(9, 'normal'); color(100, 100, 100)
  doc.text('Comunicare către administrația blocului', W / 2, y, { align: 'center' }); y += 5
  const nr   = 'NA-' + Date.now().toString().slice(-6)
  const data = new Date().toLocaleDateString('ro-RO')
  doc.text(`Nr. ${nr}  ·  Data: ${data}  ·  Perioada: ${perioada}`, W / 2, y, { align: 'center' }); y += 8

  // ── Spațiu (fără date chiriaș) ───────────────────────────────
  fill(245, 247, 250); doc.rect(ml, y, mr - ml, 12, 'F')
  draw(220, 220, 220); doc.rect(ml, y, mr - ml, 12, 'S')
  y += 8
  setF(9, 'normal'); color(100, 100, 100)
  doc.text('Spațiu:', ml + 4, y)
  setF(10, 'bold'); color(15, 23, 42)
  doc.text(`${spatiu?.denumire || '—'}${spatiu?.etaj ? `, ${spatiu.etaj}` : ''}`, ml + 28, y); y += 10

  // ── Tabel consum ──────────────────────────────────────────────
  const TIPURI_APA = [
    'Apă rece baie',
    'Apă caldă baie',
    'Apă rece bucătărie',
    'Apă caldă bucătărie',
  ]

  const citiriApa = citiri.filter(c => TIPURI_APA.includes(c.tip))

  if (citiriApa.length === 0) {
    setF(11, 'normal'); color(150, 150, 150)
    doc.text('Nu există citiri de apă înregistrate pentru această perioadă.', ml, y)
    y += 10
  } else {
    // Header tabel
    fill(27, 79, 216); doc.rect(ml, y, mr - ml, 9, 'F')
    setF(9, 'bold'); color(255, 255, 255)
    doc.text('Tip utilitate', ml + 4, y + 6)
    doc.text('Index anterior', ml + 70, y + 6)
    doc.text('Index nou', ml + 110, y + 6)
    doc.text('Consum (mc)', ml + 140, y + 6)
    doc.text('Data', mr - 4, y + 6, { align: 'right' })
    y += 11

    // Rânduri
    let totalRece = 0, totalCald = 0
    citiriApa.forEach((cit, i) => {
      fill(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 249, i % 2 === 0 ? 255 : 252)
      doc.rect(ml, y, mr - ml, 9, 'F')
      draw(230, 230, 230); doc.rect(ml, y, mr - ml, 9, 'S')

      setF(9, 'normal'); color(15, 23, 42)
      doc.text(cit.tip, ml + 4, y + 6)
      doc.text(cit.indexPrecedent != null ? String(cit.indexPrecedent) : '—', ml + 70, y + 6)
      doc.text(cit.index != null ? String(cit.index) : '—', ml + 110, y + 6)

      setF(9, 'bold'); color(27, 79, 216)
      doc.text(cit.consum != null ? `${cit.consum} mc` : '—', ml + 140, y + 6)

      setF(8, 'normal'); color(100, 100, 100)
      doc.text(cit.data || '—', mr - 4, y + 6, { align: 'right' })

      // Totale
      if (cit.tip.includes('rece') && cit.consum) totalRece += Number(cit.consum)
      if (cit.tip.includes('cald') && cit.consum) totalCald += Number(cit.consum)

      y += 9
    })

    // Totale
    y += 4
    fill(238, 242, 255); doc.rect(ml, y, mr - ml, 18, 'F')
    draw(199, 210, 254); doc.rect(ml, y, mr - ml, 18, 'S')
    y += 6
    setF(9, 'bold'); color(15, 23, 42)
    doc.text('TOTAL APĂ RECE:', ml + 4, y)
    setF(10, 'bold'); color(27, 79, 216)
    doc.text(`${totalRece.toFixed(2)} mc`, ml + 60, y)

    setF(9, 'bold'); color(15, 23, 42)
    doc.text('TOTAL APĂ CALDĂ:', ml + 90, y)
    setF(10, 'bold'); color(239, 68, 68)
    doc.text(`${totalCald.toFixed(2)} mc`, ml + 150, y)
    y += 7

    setF(9, 'normal'); color(100, 100, 100)
    doc.text(`Total general: ${(totalRece + totalCald).toFixed(2)} mc`, ml + 4, y)
    y += 10
  }

  // ── Semnătură ─────────────────────────────────────────────────
  y += 6
  draw(200, 200, 200); line(ml, y, mr, y); y += 8
  setF(8, 'normal'); color(150, 150, 150)
  doc.text(`Întocmit: ${userNume || ''}   ·   Data: ${data}`, ml, y)
  doc.text('Document generat — AdminChirie', mr, y, { align: 'right' })

  return { doc, nr }
}

export function descarcaNotaAdministratie(params) {
  const { doc, nr } = genereazaNotaAdministratie(params)
  doc.save(`Nota_Apa_Administratie_${nr}.pdf`)
}
