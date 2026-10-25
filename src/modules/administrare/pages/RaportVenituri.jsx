import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../../shared/components/Toast'
import { getRegistru } from '../../../shared/firebase/firestore'
import { mesajEroare } from '../../../shared/utils/eroare'
import { listaEntitati, NESPECIFICAT } from '../services/registruUtils'

const LUNI = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const nr = v => (Number(v) || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const luniInterval = (de, pana) => {
  const out = []
  if (!de || !pana || de > pana) return out
  let [y, m] = de.split('-').map(Number)
  const [y2, m2] = pana.split('-').map(Number)
  while ((y < y2 || (y === y2 && m <= m2)) && out.length < 36) {
    const prima = new Date(y, m - 1, 1), ultima = new Date(y, m, 0)
    out.push({ key: `${y}-${String(m).padStart(2, '0')}`, eticheta: `${LUNI[m - 1]} ${y}`, start: iso(prima), end: iso(ultima), zile: ultima.getDate() })
    m++; if (m > 12) { m = 1; y++ }
  }
  return out
}

// Fracțiunea din lună în care contractul este în vigoare (1 = luna întreagă)
const fractiune = (r, luna, prorata) => {
  const start = r.dataStart || '0000-01-01'
  const end = r.dataFinal || (r.activManual === false ? '0000-01-01' : '9999-12-31') // inactiv fără dată final: exclus
  if (start > luna.end || end < luna.start) return 0
  if (!prorata) return 1
  const de = start > luna.start ? start : luna.start
  const pana = end < luna.end ? end : luna.end
  const zile = Math.round((new Date(pana + 'T00:00:00') - new Date(de + 'T00:00:00')) / 86400000) + 1
  return Math.max(0, Math.min(1, zile / luna.zile))
}

export default function RaportVenituri() {
  const toast = useToast()
  const an = new Date().getFullYear()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [de, setDe] = useState(`${an}-01`)
  const [pana, setPana] = useState(`${an}-12`)
  const [registru, setRegistru] = useState('toate')
  const [entitate, setEntitate] = useState('toate')
  const [grupare, setGrupare] = useState('entitate_registru')
  const [prorata, setProrata] = useState(false)
  const [curs, setCurs] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const [c, r] = await Promise.all([getRegistru('comercial'), getRegistru('rezidential')])
        setRows([...c, ...r])
      } catch (e) { console.error(e); toast(mesajEroare(e, 'Încărcarea registrelor a eșuat'), 'error') }
      setLoading(false)
    })()
  }, [])

  const entitati = useMemo(() => listaEntitati(rows), [rows])
  const luni = useMemo(() => luniInterval(de, pana), [de, pana])

  const { grupuri, totaluri, faraChirie, faraEntitate } = useMemo(() => {
    const filtrate = rows
      .filter(r => registru === 'toate' || r.registru === registru)
      .filter(r => entitate === 'toate' || (r.entitate || NESPECIFICAT) === entitate)
    const faraChirie = filtrate.filter(r => !(Number(r.chirie) > 0)).length
    const faraEntitate = filtrate.filter(r => !r.entitate).length
    const g = {}
    filtrate.filter(r => Number(r.chirie) > 0).forEach(r => {
      const ent = r.entitate || NESPECIFICAT
      const reg = r.registru === 'comercial' ? 'Comercial' : 'Rezidențial'
      const nume = grupare === 'entitate' ? ent : grupare === 'registru' ? reg
        : grupare === 'contract' ? `${r.numar || 's.n.'} · ${r.nume}${grupare === 'contract' ? ` (${ent})` : ''}`
        : `${ent} · ${reg}`
      const moneda = r.moneda || 'EUR'
      luni.forEach(l => {
        const f = fractiune(r, l, prorata)
        if (!f) return
        const k = nume
        g[k] = g[k] || { nume: k, luni: {}, total: {} }
        g[k].luni[l.key] = g[k].luni[l.key] || {}
        const val = Number(r.chirie) * f
        g[k].luni[l.key][moneda] = (g[k].luni[l.key][moneda] || 0) + val
        g[k].total[moneda] = (g[k].total[moneda] || 0) + val
      })
    })
    const lista = Object.values(g).sort((a, b) => a.nume.localeCompare(b.nume, 'ro'))
    const tot = { luni: {}, total: {} }
    lista.forEach(x => {
      Object.entries(x.luni).forEach(([lk, m]) => Object.entries(m).forEach(([mon, v]) => {
        tot.luni[lk] = tot.luni[lk] || {}; tot.luni[lk][mon] = (tot.luni[lk][mon] || 0) + v
      }))
      Object.entries(x.total).forEach(([mon, v]) => { tot.total[mon] = (tot.total[mon] || 0) + v })
    })
    return { grupuri: lista, totaluri: tot, faraChirie, faraEntitate }
  }, [rows, registru, entitate, grupare, prorata, luni])

  const monede = [...new Set(Object.values(totaluri.total ? Object.keys(totaluri.total) : []))]
  const cursNum = Number(String(curs).replace(',', '.')) || 0
  const echivRon = m => (m.RON || 0) + (m.EUR || 0) * cursNum

  const Celula = ({ m }) => {
    const k = m ? Object.keys(m) : []
    if (!k.length) return <span style={{ color: 'var(--slate)' }}>—</span>
    return <>{k.sort().map(mon => <div key={mon}>{nr(m[mon])} <span style={{ fontSize: 10, color: 'var(--slate)' }}>{mon}</span></div>)}</>
  }

  const exportCsv = () => {
    const sep = ';'
    const linii = [['Grup', 'Moneda', ...luni.map(l => l.eticheta), 'Total']]
    ;[...grupuri, { nume: 'TOTAL', luni: totaluri.luni, total: totaluri.total }].forEach(x => {
      const mon = [...new Set([...Object.keys(x.total), ...Object.values(x.luni).flatMap(o => Object.keys(o))])].sort()
      mon.forEach(mm => linii.push([x.nume, mm, ...luni.map(l => (x.luni[l.key]?.[mm] || 0).toFixed(2).replace('.', ',')), (x.total[mm] || 0).toFixed(2).replace('.', ',')]))
    })
    const csv = '﻿' + linii.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(sep)).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `venituri_${de}_${pana}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (loading) return <div className="empty"><i className="ti ti-refresh" /><p>Se încarcă...</p></div>

  return (
    <>
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label>De la luna</label><input type="month" value={de} onChange={e => setDe(e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label>Până la luna</label><input type="month" value={pana} onChange={e => setPana(e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label>Registru</label>
            <select value={registru} onChange={e => setRegistru(e.target.value)}>
              <option value="toate">Comercial + rezidențial</option><option value="comercial">Doar comercial</option><option value="rezidential">Doar rezidențial</option>
            </select></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label>Entitate</label>
            <select value={entitate} onChange={e => setEntitate(e.target.value)}>
              <option value="toate">Toate</option>
              {[...entitati, NESPECIFICAT].map(n => <option key={n} value={n}>{n}</option>)}
            </select></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label>Grupare</label>
            <select value={grupare} onChange={e => setGrupare(e.target.value)}>
              <option value="entitate_registru">Entitate + registru</option><option value="entitate">Entitate</option>
              <option value="registru">Registru</option><option value="contract">Pe contract</option>
            </select></div>
          <div className="form-group" style={{ marginBottom: 0, maxWidth: 120 }}><label>Curs EUR→RON</label>
            <input value={curs} onChange={e => setCurs(e.target.value)} placeholder="opțional" /></div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, paddingBottom: 8 }}>
            <input type="checkbox" checked={prorata} onChange={e => setProrata(e.target.checked)} /> Proporțional pe zile
          </label>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!grupuri.length}><i className="ti ti-download" /> Export CSV</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 10 }}>
          Un contract intră în lună dacă perioada lui (început–final) se suprapune cu luna. Contractele marcate inactiv fără dată de final nu sunt incluse. Sumele sunt chiria lunară din registru, fără conversie între monede.
        </div>
      </div>

      {(faraChirie > 0 || faraEntitate > 0) && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {faraChirie > 0 && <div>⚠ {faraChirie} contracte nu au chiria completată și nu sunt incluse.</div>}
          {faraEntitate > 0 && <div>⚠ {faraEntitate} contracte nu au entitatea setată și apar la „{NESPECIFICAT}”. Le poți seta din Contracte → Registru.</div>}
        </div>
      )}

      {luni.length === 0 ? (
        <div className="card"><div className="empty"><i className="ti ti-calendar" /><p>Alege o perioadă validă (max. 36 de luni).</p></div></div>
      ) : grupuri.length === 0 ? (
        <div className="card"><div className="empty"><i className="ti ti-cash" /><p>Niciun venit în perioada și filtrele alese.</p></div></div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {Object.keys(totaluri.total).sort().map(mon => (
              <div key={mon} className="card" style={{ padding: '12px 18px' }}>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>Total perioadă ({mon})</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{nr(totaluri.total[mon])}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>medie {nr(totaluri.total[mon] / luni.length)} / lună</div>
              </div>
            ))}
            {cursNum > 0 && (
              <div className="card" style={{ padding: '12px 18px' }}>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>Total echivalent RON</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{nr(echivRon(totaluri.total))}</div>
              </div>
            )}
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>
                <th>{grupare === 'contract' ? 'Contract' : 'Grup'}</th>
                {luni.map(l => <th key={l.key} style={{ textAlign: 'right' }}>{l.eticheta}</th>)}
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr></thead>
              <tbody>
                {grupuri.map(x => (
                  <tr key={x.nume}>
                    <td style={{ fontWeight: 600 }}>{x.nume}</td>
                    {luni.map(l => <td key={l.key} style={{ textAlign: 'right' }}><Celula m={x.luni[l.key]} /></td>)}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}><Celula m={x.total} /></td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--slate-light)', fontWeight: 700 }}>
                  <td>TOTAL</td>
                  {luni.map(l => <td key={l.key} style={{ textAlign: 'right' }}><Celula m={totaluri.luni[l.key]} /></td>)}
                  <td style={{ textAlign: 'right' }}><Celula m={totaluri.total} /></td>
                </tr>
                {cursNum > 0 && (
                  <tr style={{ fontWeight: 600 }}>
                    <td>Echivalent RON (curs {cursNum})</td>
                    {luni.map(l => <td key={l.key} style={{ textAlign: 'right' }}>{nr(echivRon(totaluri.luni[l.key] || {}))}</td>)}
                    <td style={{ textAlign: 'right' }}>{nr(echivRon(totaluri.total))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
