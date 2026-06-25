const BASE = {
  test: 'https://api-testuat.fgo.ro/v1',
  prod: 'https://api.fgo.ro/v1',
}

function getEndpoint() {
  return BASE[import.meta.env.VITE_FGO_ENV || 'test']
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_FGO_TOKEN}`,
  }
}

// ── EMITE FACTURĂ ──────────────────────────────────────────────
export async function emiteFactura(payload) {
  const body = {
    Token:  import.meta.env.VITE_FGO_TOKEN,
    CIF:    import.meta.env.VITE_FGO_CIF,
    Serie:  import.meta.env.VITE_FGO_SERIE || 'FC',
    ...payload,
  }
  const res = await fetch(`${getEndpoint()}/facturi/emite`, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`FGO HTTP ${res.status}`)
  return res.json()
}

// ── LISTARE FACTURI EMISE ──────────────────────────────────────
export async function getFacturiEmise({ luna, an } = {}) {
  const params = new URLSearchParams({
    Token: import.meta.env.VITE_FGO_TOKEN,
    CIF:   import.meta.env.VITE_FGO_CIF,
    ...(luna && { Luna: luna }),
    ...(an   && { An: an }),
  })
  const res = await fetch(`${getEndpoint()}/facturi/lista?${params}`, {
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error(`FGO HTTP ${res.status}`)
  return res.json()
}

// ── LISTARE FACTURI FURNIZORI ──────────────────────────────────
export async function getFacturiFurnizori({ luna, an } = {}) {
  const params = new URLSearchParams({
    Token: import.meta.env.VITE_FGO_TOKEN,
    CIF:   import.meta.env.VITE_FGO_CIF,
    ...(luna && { Luna: luna }),
    ...(an   && { An: an }),
  })
  const res = await fetch(`${getEndpoint()}/facturi/furnizori?${params}`, {
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error(`FGO HTTP ${res.status}`)
  return res.json()
}

// ── HELPER: formatează payload din formular ────────────────────
export function buildPayload({ client, linii, scadenta, observatii }) {
  return {
    Client: {
      Denumire: client.nume,
      CUI:      client.cui,
      Email:    client.email,
      Adresa:   client.adresa,
      NrRegCom: client.regCom || '',
    },
    Continut: linii.map(l => ({
      Denumire:   l.desc,
      NrProduse:  l.cant,
      PretUnitar: l.pret,
      CotaTVA:    19,
    })),
    DataScadenta: scadenta,
    Observatii:   observatii || '',
    TrimiteEmail: true,
  }
}
