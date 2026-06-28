import jsPDF from 'jspdf'

export async function exportDateContoare(allContoare, spatii, imobile) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, ml = 15, mr = 195
  let y = 15

  const setF = (size, style = 'normal') => { doc.setFontSize(size); doc.setFont('helvetica', style) }
  const color = (r, g, b) => doc.setTextColor(r, g, b)
  const fill  = (r, g, b) => doc.setFillColor(r, g, b)
  const draw  = (r, g, b) => doc.setDrawColor(r, g, b)
  const newPage = () => { doc.addPage(); y = 15 }
  const checkPage = (needed = 20) => { if (y + needed > 280) newPage() }

  // Titlu
  setF(16, 'bold'); color(27, 79, 216)
  doc.text('EXPORT DATE CONTOARE', W / 2, y, { align: 'center' }); y += 7
  setF(9, 'normal'); color(100, 100, 100)
  doc.text(`Generat: ${new Date().toLocaleDateString('ro-RO')} · AdminChirie`, W / 2, y, { align: 'center' }); y += 8
  draw(200, 200, 200); doc.line(ml, y, mr, y); y += 6

  // Grupare pe imobil → spațiu
  const byImobil = {}
  allContoare.forEach(c => {
    const sp = spatii.find(s => s.id === c.spatiuId)
    if (!sp) return
    const im = imobile.find(i => i.id === sp.imobilId)
    const imKey = im?.id || 'fara_imobil'
    if (!byImobil[imKey]) byImobil[imKey] = { imobil: im, spatii: {} }
    const spKey = sp.id
    if (!byImobil[imKey].spatii[spKey]) byImobil[imKey].spatii[spKey] = { spatiu: sp, contoare: [] }
    byImobil[imKey].spatii[spKey].contoare.push(c)
  })

  Object.values(byImobil).forEach(({ imobil, spatii: spatiiGrup }) => {
    checkPage(12)
    // Header imobil
    fill(27, 79, 216); doc.rect(ml, y, mr - ml, 8, 'F')
    setF(10, 'bold'); color(255, 255, 255)
    doc.text(`🏢 ${imobil?.nume || 'Imobil necunoscut'}`, ml + 3, y + 5.5); y += 10

    Object.values(spatiiGrup).forEach(({ spatiu, contoare }) => {
      checkPage(10)
      // Header spațiu
      fill(238, 242, 255); doc.rect(ml, y, mr - ml, 7, 'F')
      draw(199, 210, 254); doc.rect(ml, y, mr - ml, 7, 'S')
      setF(9, 'bold'); color(27, 79, 216)
      doc.text(`  📍 ${spatiu.denumire}${spatiu.etaj ? ` — ${spatiu.etaj}` : ''}`, ml + 3, y + 4.8); y += 9

      contoare.forEach(contor => {
        checkPage(8)
        setF(8, 'bold'); color(15, 23, 42)
        const dest = contor.destinatie === 'administratie' ? '[Bloc]' : contor.destinatie === 'chirias' ? '[Chiriaș]' : '[Intern]'
        doc.text(`    ${contor.denumire} (${contor.um}) — ${contor.mod} ${dest}`, ml + 3, y)
        y += 5

        if (contor.citiri?.length > 0) {
          // Header tabel citiri
          fill(248, 250, 252); doc.rect(ml + 5, y, mr - ml - 5, 6, 'F')
          setF(7, 'bold'); color(100, 100, 100)
          doc.text('Data', ml + 8, y + 4)
          doc.text('Index', ml + 38, y + 4)
          doc.text('Consum', ml + 68, y + 4)
          doc.text('Valoare RON', ml + 98, y + 4)
          doc.text('Notă', ml + 138, y + 4)
          y += 7

          contor.citiri.forEach((cit, i) => {
            checkPage(6)
            fill(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252)
            doc.rect(ml + 5, y - 1, mr - ml - 5, 5.5, 'F')
            setF(7, 'normal'); color(30, 30, 30)
            doc.text(cit.data || '—', ml + 8, y + 3)
            doc.text(cit.index != null ? String(cit.index) : '—', ml + 38, y + 3)
            doc.text(cit.consum != null ? String(cit.consum) : '—', ml + 68, y + 3)
            doc.text(cit.valoare != null ? Number(cit.valoare).toFixed(2) : '—', ml + 98, y + 3)
            doc.text((cit.nota || '').slice(0, 25), ml + 138, y + 3)
            y += 5.5
          })
          y += 2
        } else {
          setF(7, 'normal'); color(150, 150, 150)
          doc.text('    Nicio citire înregistrată.', ml + 8, y); y += 5
        }
        y += 2
      })
      y += 3
    })
    y += 4
  })

  doc.save(`Export_Contoare_${new Date().toISOString().split('T')[0]}.pdf`)
}

export async function exportIstoricContor(contor, citiri) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, ml = 15, mr = 195
  let y = 15

  const setF = (size, style = 'normal') => { doc.setFontSize(size); doc.setFont('helvetica', style) }
  const color = (r, g, b) => doc.setTextColor(r, g, b)
  const fill  = (r, g, b) => doc.setFillColor(r, g, b)

  setF(14, 'bold'); color(27, 79, 216)
  doc.text(`Istoric — ${contor.denumire}`, W / 2, y, { align: 'center' }); y += 7
  setF(9, 'normal'); color(100, 100, 100)
  doc.text(`Unitate: ${contor.um} · Mod: ${contor.mod} · Export: ${new Date().toLocaleDateString('ro-RO')}`, W / 2, y, { align: 'center' }); y += 10

  // Header tabel
  fill(27, 79, 216); doc.rect(ml, y, mr - ml, 8, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); color(255, 255, 255)
  doc.text('Data', ml + 3, y + 5.5)
  doc.text('Index', ml + 38, y + 5.5)
  doc.text('Index precedent', ml + 68, y + 5.5)
  doc.text('Consum', ml + 108, y + 5.5)
  doc.text('Preț/um', ml + 133, y + 5.5)
  doc.text('Valoare RON', ml + 158, y + 5.5)
  y += 10

  citiri.forEach((cit, i) => {
    if (y > 275) { doc.addPage(); y = 15 }
    fill(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 249, i % 2 === 0 ? 255 : 252)
    doc.rect(ml, y, mr - ml, 7, 'F')
    doc.setDrawColor(230, 230, 230); doc.rect(ml, y, mr - ml, 7, 'S')
    setF(8, 'normal'); color(15, 23, 42)
    doc.text(cit.data || '—', ml + 3, y + 4.5)
    doc.text(cit.index != null ? String(cit.index) : '—', ml + 38, y + 4.5)
    doc.text(cit.indexPrecedent != null ? String(cit.indexPrecedent) : '—', ml + 68, y + 4.5)
    setF(8, 'bold'); color(27, 79, 216)
    doc.text(cit.consum != null ? `${cit.consum} ${contor.um}` : '—', ml + 108, y + 4.5)
    setF(8, 'normal'); color(15, 23, 42)
    doc.text(cit.pret != null ? String(cit.pret) : '—', ml + 133, y + 4.5)
    setF(8, 'bold'); color(34, 197, 94)
    doc.text(cit.valoare != null ? Number(cit.valoare).toFixed(2) : '—', ml + 158, y + 4.5)
    y += 7
  })

  doc.save(`Istoric_${contor.denumire.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}
