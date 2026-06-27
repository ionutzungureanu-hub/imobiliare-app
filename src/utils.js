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
  if (!phone) return '#'
  const clean = phone.replace(/\D/g, '')
  // Romanian numbers: 07xx -> 407xx, already has 40 -> keep, has + -> strip
  let num = clean
  if (num.startsWith('00')) num = num.slice(2)
  if (num.startsWith('0'))  num = '40' + num.slice(1)
  if (!num.startsWith('40') && num.length === 9) num = '40' + num
  const text = msg ? `?text=${encodeURIComponent(msg)}` : ''
  return `https://wa.me/${num}${text}`
}
