export const fmt = (n) =>
  Number(n).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtDate = (ts) => {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const defaultScadenta = (days = 30) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export const whatsappLink = (phone, msg = '') => {
  const clean = phone.replace(/\D/g, '')
  const num = clean.startsWith('0') ? '4' + clean : clean
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}
