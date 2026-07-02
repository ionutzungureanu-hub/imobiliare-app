// Serviciu generic de facturare — adaptat pe furnizorul configurat în Firestore
// Suportă orice furnizor cu API REST (Oblio, FGO, SmartBill, Facturis, etc.)

export const FURNIZORI = [
  { id: 'oblio',     nume: 'Oblio',     url: 'https://www.oblio.eu/api',          docUrl: 'https://www.oblio.eu/api-docs' },
  { id: 'fgo',       nume: 'FGO',       url: 'https://api.fgo.ro/v1',             docUrl: 'https://api.fgo.ro/v1/testing.html' },
  { id: 'smartbill', nume: 'SmartBill', url: 'https://ws.smartbill.ro/SBORO/api', docUrl: 'https://api.smartbill.ro' },
  { id: 'facturis',  nume: 'Facturis',  url: 'https://api.facturis.ro',           docUrl: 'https://facturis.ro/api' },
  { id: 'custom',    nume: 'Altul (custom)', url: '',                             docUrl: '' },
]

// Testează conexiunea cu furnizorul configurat
export async function testeazaConexiunea(config) {
  if (!config?.token || !config?.furnizorId) {
    return { ok: false, mesaj: 'Token sau furnizor lipsă.' }
  }
  const furnizor = FURNIZORI.find(f => f.id === config.furnizorId)
  const endpoint = config.endpointCustom || furnizor?.url
  if (!endpoint) return { ok: false, mesaj: 'Endpoint nedefinit.' }

  try {
    const res = await fetch(`${endpoint}/ping`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    })
    if (res.ok) return { ok: true, mesaj: 'Conexiune reușită!' }
    return { ok: false, mesaj: `Eroare HTTP ${res.status}` }
  } catch {
    return { ok: false, mesaj: 'Nu s-a putut contacta serverul. Verifică token-ul și endpoint-ul.' }
  }
}

// Emite factură via furnizorul configurat
export async function emiteFactura(config, payload) {
  if (!config?.token || !config?.furnizorId) {
    throw new Error('Furnizor de facturare neconfigurat. Mergi la Configurare → Integrare facturare.')
  }
  const furnizor = FURNIZORI.find(f => f.id === config.furnizorId)
  const endpoint = config.endpointCustom || furnizor?.url

  const res = await fetch(`${endpoint}/facturi/emite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Token:  config.token,
      CIF:    config.cif,
      Serie:  config.serie || 'FC',
      ...payload,
    }),
  })
  if (!res.ok) throw new Error(`Eroare HTTP ${res.status}`)
  return res.json()
}
