import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { fmt } from '../../../shared/utils'
import { mesajEroare } from '../../../shared/utils/eroare'
import {
  getRegistru, getClienti, getEntitatiEmitente, getFacturariLuna, saveFacturareLuna,
  updateFacturareLuna, deleteFacturareLuna, updateRegistruCampuri,
} from '../../../shared/firebase/firestore'
import {
  luna0, numeLuna, fmtD, inLuna, lunaIncompleta, asteaptaIndexare, parametriScadenta, scadenta,
  textFactura, calcul, construiesteCsv, descarca, emailClient, rotunjeste,
} from '../services/facturareUtils'

const suma0 = (r) => Number(r.chirie) || 0

export default function FacturareLunara() {
  const toast = useToast()
  const navigate = useNavigate()
  const [luna, setLuna] = useState(luna0())
  const [zi, setZi] = useState('05')
  const [curs, setCurs] = useState('')
  const [rows, setRows] = useState([])
  const [clienti, setClienti] = useState([])
  const [entitati, setEntitati] = useState([])
  const [facturate, setFacturate] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState({})
  const [sumeMod, setSumeMod] = useState({})      // suma modificată doar pentru luna aceasta
  const [busy, setBusy] = useState(false)

  const dataEmitere = `${luna}-${String(Math.min(Number(zi) || 1, 28)).padStart(2, '0')}`

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c, e, f] = await Promise.all([getRegistru('comercial'), getClienti(), getEntitatiEmitente(), getFacturariLuna(luna)])
      setRows(r); setClienti(c); setEntitati(e); setFacturate(f)
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
    setLoading(false)
  }, [luna])
  useEffect(() => { load(); setSel({}); setSumeMod({}) }, [load])

  const an = Number(luna.slice(0, 4))
  const entDe = (r) => entitati.find(e => e.nume === r.entitate)
  const facDe = (r) => facturate.find(f => f.contractId === r.id)
  const clientDe = (r) => clienti.find(c => c.id === r.clientId)

  // Clasificare contracte pentru luna aleasă
  const { pregatite, blocate, neactivate } = useMemo(() => {
    const p = [], b = [], n = []
    for (const r of rows) {
      const fac = facDe(r)
      if (!inLuna(r, luna) && !fac) continue
      if (!suma0(r) && !fac) continue
      if (!r.factActiv && !fac) { n.push(r); continue }
      const ent = entDe(r)
      let motiv = ''
      if (!fac) {
        if (!r.entitate) motiv = 'Contractul nu are entitate emitentă (Contracte → Registru).'
        else if (!ent) motiv = `Entitatea „${r.entitate}” nu este configurată (Setări → Entități emitente).`
        else if (ent.activ === false) motiv = `Entitatea „${r.entitate}” este inactivă.`
        else if (asteaptaIndexare(r, an)) motiv = 'Așteaptă indexarea anuală.'
        else if (!r.clientId) motiv = 'Contractul nu are client legat.'
      }
      const item = { r, ent, fac, motiv }
      if (motiv) b.push(item); else p.push(item)
    }
    const dupa = (x, y) => String(x.r.entitate).localeCompare(String(y.r.entitate)) || String(x.r.numar).localeCompare(String(y.r.numar))
    return { pregatite: p.sort(dupa), blocate: b.sort(dupa), neactivate: n }
  }, [rows, entitati, facturate, luna])

  const sumaRand = (it) => it.fac ? Number(it.fac.suma) : (sumeMod[it.r.id] !== undefined ? Number(sumeMod[it.r.id]) : suma0(it.r))
  const calc = (it) => it.fac
    ? { baza: it.fac.baza, tvaProc: it.fac.tvaProc, tva: it.fac.tva, total: it.fac.total, lipsaCurs: false }
    : calcul(it.r, it.ent, sumaRand(it), curs)
  const scad = (it) => it.fac ? it.fac.dataScadenta : scadenta(dataEmitere, parametriScadenta(it.r, it.ent))

  const grupuri = useMemo(() => {
    const m = new Map()
    pregatite.forEach(it => { const k = it.r.entitate; if (!m.has(k)) m.set(k, []); m.get(k).push(it) })
    return [...m.entries()]
  }, [pregatite])

  const deEmis = pregatite.filter(it => !it.fac)
  const selectate = deEmis.filter(it => sel[it.r.id])
  const comutaToate = (items, on) => setSel(s => { const n = { ...s }; items.filter(i => !i.fac).forEach(i => { n[i.r.id] = on }); return n })

  // ── CSV (un fișier pe entitate) ──
  const exporta = (ent, items) => {
    const alese = items.filter(it => !it.fac && sel[it.r.id])
    if (alese.length === 0) { toast('Bifează cel puțin un contract.', 'error'); return }
    if (alese.some(it => calc(it).lipsaCurs)) { toast('Completează cursul RON pentru contractele în EUR.', 'error'); return }
    const coloane = ['Entitate', 'Serie', 'Nr. contract', 'Client', 'CUI client', 'Email client', 'Descriere', 'Valoare fără TVA (RON)', 'TVA %', 'TVA (RON)', 'Total (RON)', 'Monedă contract', 'Sumă contract', 'Curs', 'Data emitere', 'Data scadență']
    const randuri = alese.map(it => {
      const c = calc(it), cl = clientDe(it.r)
      return [ent.nume, ent.serie, it.r.numar || '', cl?.nume || it.r.nume, cl?.cui || it.r.identificator || '', emailClient(cl),
        textFactura(it.r.textFactura || ent.text, luna, it.r), c.baza, c.tvaProc, c.tva, c.total,
        it.r.moneda || 'RON', sumaRand(it), (it.r.moneda || 'RON') === 'RON' ? '' : Number(curs), dataEmitere, scad(it)]
    })
    descarca(`facturi-${ent.serie}-${luna}.csv`, construiesteCsv(coloane, randuri))
    toast(`Fișier descărcat (${alese.length} facturi).`)
  }

  // ── Marcare ca emise ──
  const marcheazaEmise = async () => {
    if (selectate.length === 0) { toast('Bifează cel puțin un contract.', 'error'); return }
    if (selectate.some(it => calc(it).lipsaCurs)) { toast('Completează cursul RON pentru contractele în EUR.', 'error'); return }
    if (!confirm(`Marchezi ${selectate.length} chirii ca emise pentru ${numeLuna(luna)}? Nu vor mai apărea în lista „De emis”.`)) return
    setBusy(true)
    try {
      for (const it of selectate) {
        const c = calc(it)
        await saveFacturareLuna({
          contractId: it.r.id, luna, imobilId: it.r.imobilId || '', contractNr: it.r.numar || '',
          clientId: it.r.clientId, clientNume: clientDe(it.r)?.nume || it.r.nume || '',
          entitate: it.ent.nume, serie: it.ent.serie, numar: '',
          dataEmitere, dataScadenta: scad(it), suma: sumaRand(it), moneda: it.r.moneda || 'RON',
          curs: (it.r.moneda || 'RON') === 'RON' ? 1 : Number(curs), baza: c.baza, tvaProc: c.tvaProc, tva: c.tva, total: c.total,
          text: textFactura(it.r.textFactura || it.ent.text, luna, it.r), status: 'emis',
        })
      }
      toast(`${selectate.length} chirii marcate ca emise.`); setSel({}); load()
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Marcarea a eșuat'), 'error') }
    setBusy(false)
  }

  const salveazaNumar = async (it, val) => {
    if ((it.fac.numar || '') === val.trim()) return
    try { await updateFacturareLuna(it.fac.id, { numar: val.trim() }); setFacturate(l => l.map(f => f.id === it.fac.id ? { ...f, numar: val.trim() } : f)) }
    catch (e) { toast(mesajEroare(e, 'Nu s-a putut salva numărul'), 'error') }
  }
  const anuleaza = async (it) => {
    if (!confirm('Anulezi marcajul de emitere? Chiria revine în lista „De emis”.')) return
    try { await deleteFacturareLuna(it.fac.id); toast('Marcaj anulat.'); load() } catch (e) { toast(mesajEroare(e), 'error') }
  }
  const activeaza = async (items) => {
    try { for (const r of items) await updateRegistruCampuri(r.id, { factActiv: true }); toast('Facturare activată.'); load() }
    catch (e) { toast(mesajEroare(e, 'Activarea a eșuat'), 'error') }
  }

  const totalSel = selectate.reduce((s, it) => s + (calc(it).total || 0), 0)
  const areEur = deEmis.some(it => (it.r.moneda || 'RON') !== 'RON')

  return (
    <>
      <Topbar title="De emis luna asta" subtitle="Chirii lunare pregătite pentru facturare" />
      <div className="content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}><label>Luna facturată</label>
              <input type="month" value={luna} onChange={e => e.target.value && setLuna(e.target.value)} /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Ziua emiterii</label>
              <input type="number" min="1" max="28" value={zi} onChange={e => setZi(e.target.value)} style={{ width: 80 }} /></div>
            {areEur && (
              <div className="form-group" style={{ margin: 0 }}><label>Curs RON pentru 1 EUR (BNR, ziua emiterii)</label>
                <input type="number" step="0.0001" value={curs} onChange={e => setCurs(e.target.value)} placeholder="ex. 5.0900" style={{ width: 150 }} /></div>
            )}
            <div style={{ fontSize: 13, color: 'var(--slate)' }}>Data emiterii: <strong>{fmtD(dataEmitere)}</strong></div>
          </div>
        </div>

        {loading ? <div className="empty"><p>Se încarcă…</p></div> : (
          <>
            {blocate.length > 0 && (
              <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #E3A53A' }}>
                <div className="card-header"><div className="card-title">Nu se pot emite încă ({blocate.length})</div></div>
                <div className="card-body">
                  {blocate.map(({ r, motiv }) => (
                    <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', flexWrap: 'wrap' }}>
                      <strong style={{ minWidth: 120 }}>{r.numar || r.identificator}</strong>
                      <span style={{ flex: 1 }}>{r.nume}</span>
                      <span style={{ color: '#8A5A12', fontSize: 13 }}>{motiv}</span>
                      {motiv.startsWith('Așteaptă indexarea') && <button className="btn btn-ghost btn-sm" onClick={() => navigate('/facturi?tab=indexare')}>Mergi la indexare</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {grupuri.length === 0 ? (
              <div className="card"><div className="empty"><i className="ti ti-receipt" /><p>Nicio chirie pregătită pentru {numeLuna(luna)}.</p></div></div>
            ) : grupuri.map(([numeEnt, items]) => {
              const ent = items[0].ent
              const dePe = items.filter(i => !i.fac)
              return (
                <div className="card" key={numeEnt} style={{ marginBottom: 16 }}>
                  <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div className="card-title">{numeEnt}</div>
                      <div className="card-subtitle">Seria {ent.serie} · {items.length} contracte · {dePe.length} de emis</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => comutaToate(items, !dePe.every(i => sel[i.r.id]))} disabled={!dePe.length}>Bifează / debifează</button>
                    <button className="btn btn-primary btn-sm" onClick={() => exporta(ent, items)} disabled={!dePe.length}><i className="ti ti-download" /> Descarcă CSV</button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead><tr><th></th><th>Contract</th><th>Client</th><th style={{ textAlign: 'right' }}>Chirie</th><th style={{ textAlign: 'right' }}>Fără TVA (RON)</th><th style={{ textAlign: 'right' }}>Total (RON)</th><th>Scadență</th><th>Stare</th></tr></thead>
                      <tbody>
                        {items.map(it => {
                          const c = calc(it), r = it.r, eur = (r.moneda || 'RON') !== 'RON'
                          return (
                            <tr key={r.id} style={it.fac ? { background: 'var(--green-light, #EEF7F0)' } : undefined}>
                              <td>{!it.fac && <input type="checkbox" checked={!!sel[r.id]} onChange={e => setSel(s => ({ ...s, [r.id]: e.target.checked }))} style={{ width: 18, height: 18 }} />}</td>
                              <td style={{ fontWeight: 600 }}>{r.numar || r.identificator}</td>
                              <td>{r.nume}{!it.fac && lunaIncompleta(r, luna) && <div style={{ fontSize: 11, color: '#8A5A12' }}>Lună incompletă — verifică suma</div>}</td>
                              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {it.fac ? `${fmt(it.fac.suma)} ${it.fac.moneda}` : (
                                  <input type="number" step="0.01" value={sumeMod[r.id] ?? suma0(r)} onChange={e => setSumeMod(m => ({ ...m, [r.id]: e.target.value }))} style={{ width: 100, textAlign: 'right' }} />
                                )}{!it.fac && ` ${r.moneda || 'RON'}`}
                              </td>
                              <td style={{ textAlign: 'right' }}>{c.lipsaCurs ? <span style={{ color: '#8A5A12', fontSize: 12 }}>lipsă curs</span> : fmt(c.baza)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.lipsaCurs ? '—' : fmt(c.total)}<div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 400 }}>TVA {c.tvaProc}%</div></td>
                              <td style={{ whiteSpace: 'nowrap' }}>{fmtD(scad(it))}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {it.fac ? (
                                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                    <span className="badge badge-green">Emisă</span>
                                    <input defaultValue={it.fac.numar || ''} placeholder={`${it.fac.serie}-nr`} onBlur={e => salveazaNumar(it, e.target.value)} style={{ width: 110 }} title="Numărul facturii din FGO (opțional)" />
                                    <button className="btn btn-ghost btn-sm" onClick={() => anuleaza(it)} title="Anulează marcajul"><i className="ti ti-arrow-back-up" /></button>
                                  </span>
                                ) : <span className="badge badge-gray">De emis{eur ? ' · EUR' : ''}</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}

            {deEmis.length > 0 && (
              <div className="card" style={{ position: 'sticky', bottom: 8 }}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <strong>{selectate.length}</strong> selectate · total <strong>{fmt(rotunjeste(totalSel))} RON</strong>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>Descarcă fișierul pentru emitere, apoi marchează chiriile ca emise ca să nu se dubleze.</div>
                  </div>
                  <button className="btn btn-primary" onClick={marcheazaEmise} disabled={busy || !selectate.length}><i className="ti ti-check" /> Marchează emise</button>
                </div>
              </div>
            )}

            {neactivate.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div className="card-title">Contracte fără facturare lunară activată ({neactivate.length})</div>
                    <div className="card-subtitle">Au chirie și sunt în vigoare, dar nu sunt incluse în listă. Activează-le aici sau din Registru.</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => confirm(`Activezi facturarea pentru toate cele ${neactivate.length} contracte?`) && activeaza(neactivate)}>Activează toate</button>
                </div>
                <div className="card-body">
                  {neactivate.map(r => (
                    <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 0', flexWrap: 'wrap' }}>
                      <strong style={{ minWidth: 120 }}>{r.numar || r.identificator}</strong>
                      <span style={{ flex: 1 }}>{r.nume}</span>
                      <span style={{ fontSize: 13 }}>{fmt(suma0(r))} {r.moneda}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => activeaza([r])}>Activează</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
