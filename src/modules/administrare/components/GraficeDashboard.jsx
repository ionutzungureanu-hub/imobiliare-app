import { useMemo, useState } from 'react'
import { esteActiv } from '../services/registruUtils'

// Grafice simple (fără bibliotecă externă), calculate DOAR din datele la care utilizatorul are acces:
// imobilele, spațiile și contractele vin deja filtrate după drepturile lui (vezi firestore.js → scoped()).
const LUNI = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
const numeIm = (i) => i?.nume || i?.denumire || '—'
const fmtNr = (n) => Number(n).toLocaleString('ro-RO', { maximumFractionDigits: 0 })

function Card({ titlu, sub, children, actiuni }) {
  return (
    <div className="card" style={{ minWidth: 0 }}>
      <div className="card-header">
        <div><div className="card-title">{titlu}</div>{sub && <div className="card-subtitle">{sub}</div>}</div>
        {actiuni}
      </div>
      <div style={{ padding: '4px 16px 16px' }}>{children}</div>
    </div>
  )
}

const Gol = ({ text }) => <div style={{ padding: '18px 0', fontSize: 13, color: 'var(--slate)', textAlign: 'center' }}>{text}</div>

function BareOrizontale({ randuri, culoare }) {
  const max = Math.max(...randuri.map(r => r.val), 1)
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {randuri.map((r, i) => (
        <div key={r.id} title={r.titlu}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.eticheta}</span>
            <span style={{ color: 'var(--slate)', whiteSpace: 'nowrap' }}>{r.valoare}</span>
          </div>
          <div style={{ height: 10, background: 'var(--slate-light)', borderRadius: 4, overflow: 'hidden' }}>
            <div className="gf-bar" style={{ width: `${(r.val / max) * 100}%`, background: culoare, animationDelay: `${i * 70}ms` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GraficeDashboard({ imobile, spatii, contracte, arataVenituri }) {
  const [moneda, setMoneda] = useState(null)

  const ocupare = useMemo(() => {
    if (!spatii?.length) return []
    return imobile.map(i => {
      const sp = spatii.filter(s => s.imobilId === i.id)
      const oc = sp.filter(s => s.status === 'Ocupat').length
      return { id: i.id, eticheta: numeIm(i), total: sp.length, oc }
    }).filter(x => x.total > 0).sort((a, b) => b.total - a.total)
      .map(x => ({ ...x, val: x.oc / x.total, valoare: `${x.oc}/${x.total} · ${Math.round(x.oc / x.total * 100)}%`, titlu: `${x.eticheta}: ${x.oc} ocupate din ${x.total}` }))
  }, [imobile, spatii])

  const expirari = useMemo(() => {
    const acum = new Date()
    const luni = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(acum.getFullYear(), acum.getMonth() + k, 1)
      return { cheie: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, eticheta: LUNI[d.getMonth()], n: 0 }
    })
    contracte.filter(r => esteActiv(r) && r.activManual !== true && r.dataFinal).forEach(r => {
      const l = luni.find(x => x.cheie === r.dataFinal.slice(0, 7)); if (l) l.n++
    })
    return luni
  }, [contracte])

  const chirii = useMemo(() => {
    const per = {}
    contracte.filter(r => esteActiv(r) && Number(r.chirie) > 0).forEach(r => {
      const m = r.moneda || 'EUR'
      const k = r.imobilId || '—'
      per[m] = per[m] || {}; per[m][k] = (per[m][k] || 0) + Number(r.chirie)
    })
    return per
  }, [contracte])

  const monede = Object.keys(chirii)
  const mon = moneda && chirii[moneda] ? moneda : monede[0]
  const randuriChirie = mon ? Object.entries(chirii[mon]).map(([id, v]) => {
    const eticheta = id === '—' ? 'Nespecificat' : numeIm(imobile.find(i => i.id === id))
    return { id, eticheta, val: v, valoare: `${fmtNr(v)} ${mon}`, titlu: `${eticheta}: ${fmtNr(v)} ${mon} / lună` }
  }).sort((a, b) => b.val - a.val) : []
  const totalChirie = randuriChirie.reduce((s, r) => s + r.val, 0)

  const maxExp = Math.max(...expirari.map(x => x.n), 1)
  const totalExp = expirari.reduce((s, x) => s + x.n, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
      <Card titlu="Ocupare pe imobil" sub="Spații ocupate din total">
        {ocupare.length ? <BareOrizontale randuri={ocupare} culoare="var(--blue)" /> : <Gol text="Nu există spații înregistrate în imobilele tale." />}
      </Card>

      <Card titlu="Expirări în următoarele 6 luni" sub={totalExp ? `${totalExp} ${totalExp === 1 ? 'contract' : 'contracte'}` : undefined}>
        {totalExp === 0 ? <Gol text="Niciun contract nu expiră în următoarele 6 luni." /> : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 150, paddingTop: 8 }}>
            {expirari.map((x, i) => (
              <div key={x.cheie} title={`${x.eticheta}: ${x.n} ${x.n === 1 ? 'contract' : 'contracte'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: x.n ? 'var(--text)' : 'var(--slate)' }}>{x.n}</span>
                <div style={{ width: '100%', height: `${(x.n / maxExp) * 100}%`, minHeight: x.n ? 4 : 2, display: 'flex', alignItems: 'flex-end' }}>
                  <div className="gf-col" style={{ height: '100%', background: i === 0 ? 'var(--red)' : i === 1 ? 'var(--amber)' : 'var(--gold)', opacity: x.n ? 1 : .25, animationDelay: `${i * 70}ms` }} />
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--slate)' }}>{x.eticheta}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {arataVenituri && (
        <Card titlu="Chirie lunară contractată" sub={mon ? `Total ${fmtNr(totalChirie)} ${mon} / lună, fără TVA` : 'Contracte active'}
          actiuni={monede.length > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {monede.map(m => <button key={m} className={`btn btn-sm ${m === mon ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMoneda(m)}>{m}</button>)}
            </div>
          )}>
          {randuriChirie.length ? <BareOrizontale randuri={randuriChirie} culoare="var(--gold)" /> : <Gol text="Niciun contract activ cu chirie completată." />}
        </Card>
      )}
    </div>
  )
}
