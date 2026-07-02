import mammoth from 'mammoth'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

// ── Import: Word (.docx) → HTML ────────────────────────────────
export async function docxToHtml(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return result.value // HTML string
}

// ── Export: HTML editor content → Word (.docx) ─────────────────
export async function htmlToDocx(htmlContent, fileName = 'Contract') {
  // Parse simplu HTML → paragrafe docx (suportă: p, h1, h2, h3, strong/b, em/i, u, ul/li, ol/li)
  const parser = new DOMParser()
  const docHtml = parser.parseFromString(htmlContent, 'text/html')
  const children = []

  const parseInline = (node) => {
    const runs = []
    const walk = (n, style = {}) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const text = n.textContent
        if (text) runs.push(new TextRun({ text, bold: style.bold, italics: style.italic, underline: style.underline ? {} : undefined }))
        return
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return
      const tag = n.tagName.toLowerCase()
      const newStyle = { ...style }
      if (tag === 'strong' || tag === 'b') newStyle.bold = true
      if (tag === 'em' || tag === 'i') newStyle.italic = true
      if (tag === 'u') newStyle.underline = true
      if (tag === 'br') { runs.push(new TextRun({ text: '', break: 1 })); return }
      n.childNodes.forEach(child => walk(child, newStyle))
    }
    node.childNodes.forEach(child => walk(child))
    return runs.length > 0 ? runs : [new TextRun({ text: '' })]
  }

  const processNode = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const tag = node.tagName.toLowerCase()

    if (tag === 'h1') {
      children.push(new Paragraph({ children: parseInline(node), heading: HeadingLevel.HEADING_1 }))
    } else if (tag === 'h2') {
      children.push(new Paragraph({ children: parseInline(node), heading: HeadingLevel.HEADING_2 }))
    } else if (tag === 'h3') {
      children.push(new Paragraph({ children: parseInline(node), heading: HeadingLevel.HEADING_3 }))
    } else if (tag === 'p') {
      const align = node.style?.textAlign
      children.push(new Paragraph({
        children: parseInline(node),
        alignment: align === 'center' ? AlignmentType.CENTER : align === 'right' ? AlignmentType.RIGHT : align === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
        spacing: { after: 120 }
      }))
    } else if (tag === 'ul' || tag === 'ol') {
      Array.from(node.children).forEach((li, i) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: (tag === 'ol' ? `${i + 1}. ` : '• ') }), ...parseInline(li)],
          spacing: { after: 80 }, indent: { left: 360 }
        }))
      })
    } else if (tag === 'div') {
      Array.from(node.childNodes).forEach(processNode)
    } else if (tag === 'br') {
      children.push(new Paragraph({ children: [] }))
    }
  }

  Array.from(docHtml.body.childNodes).forEach(processNode)
  if (children.length === 0) children.push(new Paragraph({ children: [new TextRun({ text: docHtml.body.textContent || '' })] }))

  const doc = new Document({
    sections: [{ properties: {}, children }]
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName.replace(/[^a-zA-Z0-9_\- ăâîșțĂÂÎȘȚ]/g, '')}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
