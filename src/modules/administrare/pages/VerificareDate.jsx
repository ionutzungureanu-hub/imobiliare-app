import { useEffect, useMemo, useState, useCallback } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { mesajEroare } from '../../../shared/utils/eroare'
import { SceletTabel } from '../../../shared/components/Schelet'
import StareGoala from '../../../shared/components/StareGoala'
import { getRegistru, getSpatii, getClienti, getImobile, getEntitatiEmitente } from '../../../shared/firebase/firestore'
import { esteActiv } from '../services/registruUtils'

// Verificare doar în citire: găsește nepotriviri între registrul de contracte, spații, clienți și firme.
// Nu modifică nimic; fiecare problemă spune ce de verificat și unde.
const GRAVITATE = { eroare: { l: 'De corectat', c: 'badge-red' }, atentie: { l: 'De verificat', c: 'badge-amber' } }

export default function VerificareDate() {
  const toast = useToast()
  const [d, setD] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtru, setFiltru] = useState('toate')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, b, sp, cl, im, en] = await Promise.all([
        getRegistru('comercial'), getRegistru('rezidential'), getSpatii(), getClienti(), getImobile(), getEntitatiEmitente(),
      ])
      setD({ contracte: [...a.map(r => ({ ...r, _reg: 'comercial' })), ...b.map(r => ({ ...r, _reg: 'rezidențial' }))], spatii: sp, clienti: cl, imobile: im, entitati: en })
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const probleme = useMemo(() => {
    if (!d) return []
    const out = []
    const spatiu = Object.fromEntries(d.spatii.map(s => [s.id, s]))
    const client = Object.fromEntries(d.clienti.map(c => [c.id, c]))
    const numeSp = (id) => spatiu[id]?.denumire || '—'
    const add = (g, r, text) => out.push({ g, id: `${r.id}-${out.length}`, contract: `${r.numar || '—'} · ${r.nume || ''}`.trim(), registru: r._reg, text })

    const pe = {}
    d.contracte.forEach(r => {
      const activ = esteActiv(r)
      if (r.clientId && !client[r.clientId]) add('eroare', r, 'Clientul legat de contract nu mai există în Clienți.')
      if (!r.clientId) add('atentie', r, 'Contractul nu este legat de un client din Clienți.')
      if (r.spatiuId && !spatiu[r.spatiuId]) add('eroare', r, 'Spațiul legat de contract nu mai există.')
      if (!r.spatiuId) add('atentie', r, 'Contractul nu are un spațiu asociat.')
      if (r.dataStart && r.dataFinal && r.dataFinal < r.dataStart) add('eroare', r, 'Data de final este înaintea datei de început.')
      if (activ && r.activManual == null && !r.dataFinal) add('atentie', r, 'Contract fără dată de final (considerat activ nedefinit).')

      // nepotriviri față de asocierea client–spațiu
      const sp = spatiu[r.spatiuId]
      const leg = sp?.clienti?.find(c => c.clientId === r.clientId)
      if (sp && r.clientId && activ) {
        if (!leg) add('atentie', r, `Clientul nu este asociat spațiului „${numeSp(r.spatiuId)}” (Imobile și spații).`)
        else if ((leg.dataStart || '') !== (r.dataStart || '') || (leg.dataFinal || '') !== (r.dataFinal || ''))
          add('atentie', r, `Datele diferă între registru (${r.dataStart || '—'} → ${r.dataFinal || '—'}) și spațiu (${leg.dataStart || '—'} → ${leg.dataFinal || '—'}). Folosește „Sincronizează cu spațiile”.`)
        if (sp.status === 'Liber') add('atentie', r, `Contract activ, dar spațiul „${numeSp(r.spatiuId)}” este marcat Liber.`)
      }
      if (activ && r.spatiuId) (pe[r.spatiuId] = pe[r.spatiuId] || []).push(r)

      // facturare
      if (r.factActiv) {
        if (!Number(r.chirie)) add('eroare', r, 'Facturare activă, dar chiria nu este completată.')
        if (!r.entitate) add('eroare', r, 'Facturare activă, dar nu are firmă emitentă.')
        else if (!d.entitati.some(e => e.nume === r.entitate)) add('eroare', r, `Firma „${r.entitate}” nu este configurată în Firme emitente (sau nu ai acces la ea).`)
        if (!activ) add('atentie', r, 'Facturare activă pe un contract inactiv sau expirat.')
      }
    })

    // contracte active suprapuse pe același spațiu
    Object.entries(pe).forEach(([sid, rs]) => {
      if (rs.length > 1) add('atentie', rs[0], `Spațiul „${numeSp(sid)}” are ${rs.length} contracte active: ${rs.map(x => x.numar || x.nume).join(', ')}.`)
    })

    // numere duplicate în același registru
    const nr = {}
    d.contracte.forEach(r => { if (r.numar) (nr[`${r._reg}|${r.numar}`] = nr[`${r._reg}|${r.numar}`] || []).push(r) })
    Object.values(nr).forEach(rs => { if (rs.length > 1) add('eroare', rs[0], `Numărul ${rs[0].numar} apare de ${rs.length} ori în registrul ${rs[0]._reg}.`) })

    // spații ocupate fără contract activ
    d.spatii.filter(s => s.status === 'Ocupat' && !pe[s.id]).forEach(s => out.push({
      g: 'atentie', id: `sp-${s.id}`, contract: s.denumire || '—', registru: 'spațiu', text: 'Spațiu marcat Ocupat, dar fără niciun contract activ în registre.',
    }))
    return out
  }, [d])

  const vizibile = probleme.filter(p => filtru === 'toate' || p.g === filtru)
  const nE = probleme.filter(p => p.g === 'eroare').length, nA = probleme.filter(p => p.g === 'atentie').length

  return (
    <>
      <Topbar title="Verificare date" subtitle="Nepotriviri între contracte, spații, clienți și firme (doar citire)">
        <button className="btn btn-ghost btn-sm" onClick={load}><i className="ti ti-refresh" /> Verifică din nou</button>
      </Topbar>
      <div className="content">
        {loading ? <SceletTabel /> : probleme.length === 0 ? (
          <div className="card"><StareGoala icon="ti-circle-check" titlu="Totul pare în regulă" text={`Am verificat ${d?.contracte.length || 0} contracte și ${d?.spatii.length || 0} spații.`} /></div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {[['toate', `Toate (${probleme.length})`], ['eroare', `De corectat (${nE})`], ['atentie', `De verificat (${nA})`]].map(([k, l]) => (
                <button key={k} className={`btn btn-sm ${filtru === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFiltru(k)}>{l}</button>
              ))}
            </div>
            <div className="card">
              {vizibile.map(p => (
                <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  <span className={`badge ${GRAVITATE[p.g].c}`}>{GRAVITATE[p.g].l}</span>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.contract} <span style={{ fontWeight: 400, color: 'var(--slate)', fontSize: 12 }}>· {p.registru}</span></div>
                    <div style={{ fontSize: 13 }}>{p.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
