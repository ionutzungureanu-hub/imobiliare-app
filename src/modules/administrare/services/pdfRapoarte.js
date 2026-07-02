import jsPDF from 'jspdf'

const TODAY = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })

function initDoc() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, ml = 14, mr = 196
  doc.setFont('helvetica')
  return { doc, W, ml, mr }
}

function header(doc, W, ml, mr, titlu, subtitlu, perioada) {
  let y = 14
  // Antet
  doc.setFillColor(27, 79, 216)
  doc.rect(ml, y, mr - ml, 12, 'F')
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('AdminChirie — ' + titlu, ml + 4, y + 8)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(TODAY, mr - 2, y + 8, { align: 'right' })
  y += 16

  if (subtitlu) {
    doc.setFontSize(10); doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'bold')
    doc.text(subtitlu, ml, y); y += 5
  }
  if (perioada) {
    doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.setFont('helvetica', 'normal')
    doc.text('Perioada: ' + perioada, ml, y); y += 6
  }
  doc.setDrawColor(220, 220, 220); doc.line(ml, y, mr, y); y += 4
  return y
}

function tableHeader(doc, ml, mr, y, cols) {
  doc.setFillColor(240, 244, 255)
  doc.rect(ml, y, mr - ml, 7, 'F')
  doc.setDrawColor(200, 210, 240); doc.rect(ml, y, mr - ml, 7, 'S')
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 70, 150)
  cols.forEach(c => doc.text(c.label, c.x, y + 5))
  return y + 8
}

function tableRow(doc, ml, mr, y, cols, values, shade, bold = false) {
  if (shade) { doc.setFillColor(250, 251, 255); doc.rect(ml, y, mr - ml, 6.5, 'F') }
  doc.setDrawColor(235, 235, 235); doc.line(ml, y + 6.5, mr, y + 6.5)
  doc.setFontSize(7.5); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(20, 20, 20)
  cols.forEach((c, i) => {
    const val = String(values[i] ?? '—')
    doc.text(val.slice(0, c.maxLen || 40), c.x, y + 4.8, { align: c.align || 'left' })
  })
  return y + 7
}

function checkPage(doc, y, needed = 16) {
  if (y + needed > 280) { doc.addPage(); return 16 }
  return y
}

function fmt(n) {
  if (n == null || n === '') return '—'
  return Number(n).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON'
}

// ── RAPORT PER CLIENT ─────────────────────────────────────────
export function exportRaportClient({ client, spatii, contoare, citiri, perioada }) {
  const { doc, W, ml, mr } = initDoc()
  let y = header(doc, W, ml, mr, 'Raport indici per client', client?.nume || '—', perioada)

  const spatiuNume = (spatiuId) => spatii.find(s => s.id === spatiuId)?.denumire || spatiuId
  const contorNume = (contorId) => contoare.find(c => c.id === contorId)?.denumire || contoare.find(c => c.id === contorId)?.tip || contorId

  // Grupare citiri pe contor
  const byContor = {}
  citiri.forEach(cit => {
    if (!byContor[cit.contorId]) byContor[cit.contorId] = []
    byContor[cit.contorId].push(cit)
  })

  const COLS = [
    { label: 'Data',    x: ml + 1,  maxLen: 12 },
    { label: 'Spațiu', x: ml + 22, maxLen: 20 },
    { label: 'Contor', x: ml + 60, maxLen: 25 },
    { label: 'Index',  x: ml + 110, maxLen: 10, align: 'right' },
    { label: 'Prec.',  x: ml + 128, maxLen: 10, align: 'right' },
    { label: 'Consum', x: ml + 148, maxLen: 12, align: 'right' },
    { label: 'Valoare',x: mr - 1,  maxLen: 14, align: 'right' },
  ]

  y = tableHeader(doc, ml, mr, y, COLS)
  let totalValoare = 0, rowIdx = 0

  Object.entries(byContor).forEach(([contorId, rows]) => {
    const ct = contoare.find(c => c.id === contorId)
    let consumTotal = 0
    rows.forEach(cit => {
      y = checkPage(doc, y)
      y = tableRow(doc, ml, mr, y, COLS, [
        cit.data || '—',
        spatiuNume(cit.spatiuId),
        contorNume(contorId),
        cit.index != null ? `${cit.index} ${ct?.um || ''}` : (cit.valoare != null ? `${cit.valoare} RON` : '—'),
        cit.indexPrecedent != null ? `${cit.indexPrecedent} ${ct?.um || ''}` : '—',
        cit.consum != null ? `${cit.consum} ${ct?.um || ''}` : (ct?.mod !== 'index' ? 'fix' : '—'),
        cit.valoare != null ? fmt(cit.valoare) : '—',
      ], rowIdx % 2 === 0)
      if (cit.consum) consumTotal += Number(cit.consum)
      if (cit.valoare) totalValoare += Number(cit.valoare)
      rowIdx++
    })
    // Subtotal per contor
    y = checkPage(doc, y)
    doc.setFillColor(232, 240, 255); doc.rect(ml, y, mr - ml, 6, 'F')
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(27, 79, 216)
    doc.text(`Subtotal ${contorNume(contorId)}:`, ml + 2, y + 4.2)
    if (consumTotal > 0) doc.text(`${consumTotal.toFixed(2)} ${ct?.um || ''}`, ml + 148, y + 4.2, { align: 'right' })
    y += 7
  })

  // Total general
  y = checkPage(doc, y)
  doc.setFillColor(27, 79, 216); doc.rect(ml, y, mr - ml, 8, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('TOTAL VALOARE PERIOADĂ:', ml + 2, y + 5.5)
  doc.text(fmt(totalValoare), mr - 2, y + 5.5, { align: 'right' })
  y += 10

  doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal')
  doc.text('Raport generat automat — AdminChirie', W / 2, y, { align: 'center' })

  doc.save(`Raport_${client?.nume?.replace(/\s+/g, '_') || 'client'}_${TODAY.replace(/\s/g, '_')}.pdf`)
}

// ── RAPORT GENERAL TOȚI CLIENȚII ─────────────────────────────
export function exportRaportGeneral({ clienti, spatii, contoare, citiri, perioada, tip }) {
  const { doc, W, ml, mr } = initDoc()
  let y = header(doc, W, ml, mr, 'Raport general indici', tip === 'PF' ? 'Persoane Fizice' : tip === 'PJ' ? 'Persoane Juridice' : 'Toți clienții', perioada)

  const spatiuPentruClient = (clientId) => spatii.find(s => s.clienti?.find(sc => sc.clientId === clientId) || s.clientId === clientId)
  const contorNume = (contorId) => contoare.find(c => c.id === contorId)?.denumire || contoare.find(c => c.id === contorId)?.tip || '—'
  const clientiFiltered = tip === 'PF' ? clienti.filter(c => c.tip === 'PF') : tip === 'PJ' ? clienti.filter(c => (c.tip || 'PJ') === 'PJ') : clienti

  const COLS = [
    { label: 'Client',  x: ml + 1,  maxLen: 28 },
    { label: 'Spațiu',  x: ml + 52, maxLen: 18 },
    { label: 'Contor',  x: ml + 88, maxLen: 22 },
    { label: 'Index',   x: ml + 128, maxLen: 10, align: 'right' },
    { label: 'Consum',  x: ml + 150, maxLen: 12, align: 'right' },
    { label: 'Valoare', x: mr - 1,  maxLen: 14, align: 'right' },
  ]

  // PF section
  if (tip !== 'PJ') {
    const pf = clientiFiltered.filter(c => c.tip === 'PF')
    if (pf.length > 0) {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74)
      doc.text('PERSOANE FIZICE', ml, y); y += 5
      y = tableHeader(doc, ml, mr, y, COLS)
      pf.forEach((cl, ci) => {
        const sp = spatiuPentruClient(cl.id)
        const ctCitiri = citiri.filter(c => c.spatiuId === sp?.id)
        ctCitiri.forEach((cit, ri) => {
          y = checkPage(doc, y)
          y = tableRow(doc, ml, mr, y, COLS, [
            ri === 0 ? cl.nume : '',
            ri === 0 ? (sp?.denumire || '—') : '',
            contorNume(cit.contorId),
            cit.index != null ? `${cit.index} ${cit.um || ''}` : (cit.valoare != null ? `${cit.valoare} RON` : '—'),
            cit.consum != null ? `${cit.consum} ${cit.um || ''}` : '—',
            cit.valoare != null ? fmt(cit.valoare) : '—',
          ], ci % 2 === 0)
        })
        if (ctCitiri.length === 0) {
          y = checkPage(doc, y)
          y = tableRow(doc, ml, mr, y, COLS, [cl.nume, sp?.denumire || '—', 'Fără citiri în perioadă', '', '', ''], ci % 2 === 0)
        }
      })
      y += 4
    }
  }

  // PJ section
  if (tip !== 'PF') {
    const pj = clientiFiltered.filter(c => (c.tip || 'PJ') === 'PJ')
    if (pj.length > 0) {
      y = checkPage(doc, y, 20)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(27, 79, 216)
      doc.text('PERSOANE JURIDICE', ml, y); y += 5
      y = tableHeader(doc, ml, mr, y, COLS)
      pj.forEach((cl, ci) => {
        const sp = spatiuPentruClient(cl.id)
        const ctCitiri = citiri.filter(c => c.spatiuId === sp?.id)
        ctCitiri.forEach((cit, ri) => {
          y = checkPage(doc, y)
          y = tableRow(doc, ml, mr, y, COLS, [
            ri === 0 ? cl.nume : '',
            ri === 0 ? (sp?.denumire || '—') : '',
            contorNume(cit.contorId),
            cit.index != null ? `${cit.index} ${cit.um || ''}` : (cit.valoare != null ? `${cit.valoare} RON` : '—'),
            cit.consum != null ? `${cit.consum} ${cit.um || ''}` : '—',
            cit.valoare != null ? fmt(cit.valoare) : '—',
          ], ci % 2 === 0)
        })
        if (ctCitiri.length === 0) {
          y = checkPage(doc, y)
          y = tableRow(doc, ml, mr, y, COLS, [cl.nume, sp?.denumire || '—', 'Fără citiri în perioadă', '', '', ''], ci % 2 === 0)
        }
      })
    }
  }

  doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal')
  doc.text('Raport generat automat — AdminChirie', W / 2, 285, { align: 'center' })
  doc.save(`Raport_General_${TODAY.replace(/\s/g, '_')}.pdf`)
}

// ── RAPORT CONSUM PE IMOBIL ───────────────────────────────────
export function exportRaportImobil({ imobile, spatii, clienti, contoare, citiri, perioada }) {
  const { doc, W, ml, mr } = initDoc()
  let y = header(doc, W, ml, mr, 'Raport consum pe imobil', null, perioada)

  const clientNume = (spatiuId) => {
    const sp = spatii.find(s => s.id === spatiuId)
    const principal = sp?.clienti?.find(sc => sc.rol === 'Chiriaș principal') || sp?.clienti?.[0]
    const cl = clienti.find(c => c.id === (principal?.clientId || sp?.clientId))
    return cl?.nume || '—'
  }

  const COLS = [
    { label: 'Spațiu',  x: ml + 1,  maxLen: 20 },
    { label: 'Client',  x: ml + 42, maxLen: 25 },
    { label: 'Contor',  x: ml + 88, maxLen: 22 },
    { label: 'Data',    x: ml + 128, maxLen: 11 },
    { label: 'Consum',  x: ml + 150, maxLen: 12, align: 'right' },
    { label: 'Valoare', x: mr - 1,  maxLen: 14, align: 'right' },
  ]

  imobile.forEach(im => {
    const spatiiIm = spatii.filter(s => s.imobilId === im.id)
    const citiriIm = citiri.filter(c => spatiiIm.map(s => s.id).includes(c.spatiuId))
    if (citiriIm.length === 0 && spatiiIm.length === 0) return

    y = checkPage(doc, y, 20)
    doc.setFillColor(27, 79, 216); doc.rect(ml, y, mr - ml, 7, 'F')
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
    doc.text(`🏢 ${im.nume}${im.adresa ? '  —  ' + im.adresa : ''}`, ml + 2, y + 5)
    y += 9

    y = tableHeader(doc, ml, mr, y, COLS)

    let totalIm = 0
    spatiiIm.forEach((sp, si) => {
      const citiriSp = citiriIm.filter(c => c.spatiuId === sp.id)
      if (citiriSp.length === 0) {
        y = checkPage(doc, y)
        y = tableRow(doc, ml, mr, y, COLS, [sp.denumire, clientNume(sp.id), 'Fără citiri', '', '', ''], si % 2 === 0)
        return
      }
      citiriSp.forEach((cit, ri) => {
        y = checkPage(doc, y)
        y = tableRow(doc, ml, mr, y, COLS, [
          ri === 0 ? sp.denumire : '',
          ri === 0 ? clientNume(sp.id) : '',
          contoare.find(c => c.id === cit.contorId)?.denumire || contoare.find(c => c.id === cit.contorId)?.tip || '—',
          cit.data || '—',
          cit.consum != null ? `${cit.consum} ${cit.um || ''}` : '—',
          cit.valoare != null ? fmt(cit.valoare) : '—',
        ], si % 2 === 0)
        if (cit.valoare) totalIm += Number(cit.valoare)
      })
    })

    // Total imobil
    y = checkPage(doc, y)
    doc.setFillColor(232, 240, 255); doc.rect(ml, y, mr - ml, 6.5, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(27, 79, 216)
    doc.text(`Total ${im.nume}:`, ml + 2, y + 4.5)
    doc.text(fmt(totalIm), mr - 2, y + 4.5, { align: 'right' })
    y += 10
  })

  doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal')
  doc.text('Raport generat automat — AdminChirie', W / 2, 285, { align: 'center' })
  doc.save(`Raport_Imobil_${TODAY.replace(/\s/g, '_')}.pdf`)
}
