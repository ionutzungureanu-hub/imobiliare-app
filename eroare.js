// Mesaj de eroare clar pentru utilizator, pornind de la erorile Firebase
export const mesajEroare = (e, actiune = 'Eroare') => {
  const cod = e?.code || ''
  if (cod.includes('permission-denied') || cod.includes('unauthorized')) return `${actiune}: acces refuzat (verifică regulile Firebase / autentificarea).`
  if (cod.includes('quota-exceeded')) return `${actiune}: cota Firebase depășită (verifică planul Blaze / facturarea).`
  if (cod.includes('unauthenticated')) return `${actiune}: sesiune expirată, autentifică-te din nou.`
  if (cod.includes('unavailable') || cod.includes('network')) return `${actiune}: fără conexiune la server.`
  return `${actiune}: ${e?.message || 'eroare necunoscută'}`
}
