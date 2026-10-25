import emailjs from 'emailjs-com'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const TPL_FACTURA = import.meta.env.VITE_EMAILJS_TEMPLATE_FACTURA
const TPL_MESAJ   = import.meta.env.VITE_EMAILJS_TEMPLATE_MESAJ

// ── TRIMITE FACTURĂ PE EMAIL ───────────────────────────────────
// Apelat după emitere FGO — trimite emailul cu detalii factură
export async function trimiteMail({ toEmail, toName, nrFactura, suma, scadenta, observatii }) {
  return emailjs.send(
    SERVICE_ID,
    TPL_FACTURA,
    {
      to_email:   toEmail,
      to_name:    toName,
      nr_factura: nrFactura,
      suma:       suma,
      scadenta:   scadenta,
      observatii: observatii || '',
      from_email: 'kado.excelsior@yahoo.com',
    },
    PUBLIC_KEY
  )
}

// ── TRIMITE MESAJ LIBER ────────────────────────────────────────
export async function trimiteMesaj({ toEmail, toName, subiect, mesaj }) {
  return emailjs.send(
    SERVICE_ID,
    TPL_MESAJ,
    {
      to_email: toEmail,
      to_name:  toName,
      subiect:  subiect,
      mesaj:    mesaj,
      from_email: 'kado.excelsior@yahoo.com',
    },
    PUBLIC_KEY
  )
}
