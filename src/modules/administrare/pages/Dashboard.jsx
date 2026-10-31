import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRegistru, getSpatii, getEntitatiEmitente, getFacturariLuna, getCereriPortal, getIndexuriPrimite } from '../../../shared/firebase/firestore'
import { esteActiv, azi } from '../services/registruUtils'
import { luna0, numeLuna, sumarDeEmis, fmtD } from '../../facturare/services/facturareUtils'
import Topbar from '../../../shared/components/Topbar'
import { useAuth } from '../../../shared/context/AuthContext'
import { useMeniu } from '../../../shared/context/MeniuContext'
import { moduleDinCale } from '../../../shared/config/moduleCatalog'

// Butoane de navigare rapidă, grupate logic — fără duplicare de date din alte pagini.
// Rutele și iconițele sunt aliniate cu meniul din Layout.jsx pentru consistență.
const GRUPURI = [
  {
    titlu: 'Zilnic',
    culoare: '#14213D',
    itemi: [
      { to: '/clienti',           icon: 'ti-users',    label: 'Clienți' },
      { to: '/citire',            icon: 'ti-bolt',      label: 'Citire indexuri' },
      { to: '/citire?tab=validare', icon: 'ti-checks', label: 'Validare indexuri' },
      { to: '/spatii',            icon: 'ti-building', label: 'Spații & Imobile', desktopOnly: true },
    ],
  },
  {
    titlu: 'Documente',
    culoare: '#8A6D3B',
    itemi: [
      { to: '/nota-calcul',        icon: 'ti-calculator', label: 'Notă calcul' },
      { to: '/nota-administratie', icon: 'ti-droplet',    label: 'Notă apă bloc' },
      { to: '/biblioteca',         icon: 'ti-books',      label: 'Bibliotecă' },
      { to: '/contracte',          icon: 'ti-file-text',  label: 'Contracte', desktopOnly: true },
      { to: '/rapoarte',           icon: 'ti-chart-bar',  label: 'Rapoarte', desktopOnly: true },
    ],
  },
  {
    titlu: 'Facturare',
    culoare: '#2F6F4F',
    itemi: [
      { to: '/facturi?tab=lunar',    icon: 'ti-calendar-event', label: 'De emis luna asta', desktopOnly: true },
      { to: '/facturi?tab=indexare', icon: 'ti-trending-up', label: 'Indexare anuală', desktopOnly: true },
      { to: '/facturi?tab=utilitati', icon: 'ti-receipt', label: 'Factură utilități', desktopOnly: true },
      { to: '/facturi?tab=istoric', icon: 'ti-files', label: 'Istoric facturi', desktopOnly: true },
    ],
  },
  {
    titlu: 'Setări',
    culoare: '#6B6B70',
    itemi: [
      { to: '/utilizatori', icon: 'ti-user-cog', label: 'Utilizatori', adminOnly: true, desktopOnly: true },
      { to: '/config',      icon: 'ti-settings',  label: 'Configurare', adminOnly: true, desktopOnly: true },
      { to: '/furnizori',   icon: 'ti-file-import', label: 'Furnizori', adminOnly: true, desktopOnly: true },
    ],
  },
]


const zileLa = (d) => Math.ceil((new Date(d + 'T12:00:00') - new Date(azi() + 'T12:00:00')) / 86400000)

// Indicatori și alerte calculate din datele la care utilizatorul are acces. Fiecare sursă se încarcă independent:
// dacă una eșuează, restul se afișează.
function Alerte({ navigate, vizibil, isAdmin }) {
  const [d, setD] = useState(null)
  const luna = luna0()

  useEffect(() => {
    let viu = true
    Promise.allSettled([
      getRegistru('comercial'), getRegistru('rezidential'), getSpatii(), getEntitatiEmitente(), getFacturariLuna(luna),
      getCereriPortal(), getIndexuriPrimite('asteptare'),
    ]).then(([a, b, sp, en, fa, ce, ix]) => {
      if (!viu) return
      const v = (x) => x.status === 'fulfilled' ? x.value : null
      setD({ comercial: v(a) || [], rezidential: v(b) || [], spatii: v(sp), entitati: v(en) || [], facturate: v(fa) || [], cereri: (v(ce) || []).filter(c => c.status !== 'rezolvat'), indexuri: v(ix) })
    })
    return () => { viu = false }
  }, [])

  const calc = useMemo(() => {
    if (!d) return null
    const contracte = [...d.comercial, ...d.rezidential]
    const active = contracte.filter(esteActiv)
    const exp = active.filter(r => r.dataFinal && r.activManual !== true).map(r => ({ r, zile: zileLa(r.dataFinal) })).filter(x => x.zile >= 0 && x.zile <= 90).sort((x, y) => x.zile - y.zile)
    const expirate = contracte.filter(r => r.activManual == null && r.dataFinal && zileLa(r.dataFinal) < 0 && zileLa(r.dataFinal) >= -60)
      .map(r => ({ r, zile: zileLa(r.dataFinal) })).sort((x, y) => y.zile - x.zile)
    const sumar = sumarDeEmis(d.comercial, luna, d.entitati, d.facturate, isAdmin)
    const ocupate = d.spatii ? d.spatii.filter(s => s.status === 'Ocupat').length : null
    return { active: active.length, exp, expirate, sumar, ocupate, totalSp: d.spatii?.length ?? null }
  }, [d])

  if (!calc) return <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 20 }}>Se calculează indicatorii…</div>

  const Tile = ({ label, val, sub, culoare, to, icon }) => (
    <button onClick={() => to && navigate(to)} className="dashboard-btn" disabled={!to}
      style={{ textAlign: 'left', padding: '14px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: 12, cursor: to ? 'pointer' : 'default', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--slate)', fontSize: 12, fontWeight: 600 }}>
        <i className={`ti ${icon}`} style={{ color: culoare }} /> {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: culoare || 'var(--ink)', marginTop: 4 }}>{val}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--slate)' }}>{sub}</div>}
    </button>
  )

  const Linie = ({ icon, culoare, children, to }) => (
    <div onClick={() => to && navigate(to)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: to ? 'pointer' : 'default', fontSize: 13 }}>
      <i className={`ti ${icon}`} style={{ color: culoare, fontSize: 18 }} /> <div style={{ flex: 1 }}>{children}</div>
      {to && <i className="ti ti-chevron-right" style={{ color: 'var(--slate)' }} />}
    </div>
  )

  const { sumar, exp, expirate } = calc
  const exp30 = exp.filter(x => x.zile <= 30)
  const alerte = []
  if (expirate.length) alerte.push(<Linie key="expirate" icon="ti-alert-triangle" culoare="var(--red)" to="/contracte">
    <strong>{expirate.length}</strong> {expirate.length === 1 ? 'contract a expirat' : 'contracte au expirat'} în ultimele 60 de zile fără prelungire: {expirate.slice(0, 3).map(x => x.r.numar || x.r.nume).join(', ')}{expirate.length > 3 ? '…' : ''}</Linie>)
  if (exp30.length) alerte.push(<Linie key="exp30" icon="ti-clock-exclamation" culoare="var(--red)" to="/contracte">
    <strong>{exp30.length}</strong> {exp30.length === 1 ? 'contract expiră' : 'contracte expiră'} în 30 de zile: {exp30.slice(0, 3).map(x => `${x.r.numar || x.r.nume} (${fmtD(x.r.dataFinal)})`).join(', ')}{exp30.length > 3 ? '…' : ''}</Linie>)
  if (exp.length - exp30.length > 0) alerte.push(<Linie key="exp90" icon="ti-clock" culoare="var(--amber)" to="/contracte">
    <strong>{exp.length - exp30.length}</strong> contracte expiră în 31–90 de zile</Linie>)
  if (vizibil('facturi') && sumar.deEmis > 0) alerte.push(<Linie key="emis" icon="ti-calendar-event" culoare="var(--blue)" to="/facturi?tab=lunar">
    <strong>{sumar.deEmis}</strong> chirii de emis pentru {numeLuna(luna)}</Linie>)
  if (vizibil('facturi') && sumar.indexare > 0) alerte.push(<Linie key="idx" icon="ti-trending-up" culoare="var(--amber)" to="/facturi?tab=indexare">
    <strong>{sumar.indexare}</strong> contracte așteaptă indexarea anuală și nu pot fi facturate</Linie>)
  if (sumar.faraEntitate > 0) alerte.push(<Linie key="fe" icon="ti-building-bank" culoare="var(--amber)" to={isAdmin ? '/entitati' : '/facturi?tab=lunar'}>
    <strong>{sumar.faraEntitate}</strong> contracte cu facturare activă nu au o firmă emitentă configurată</Linie>)
  if ((d.cereri?.length ?? 0) > 0) alerte.push(<Linie key="cer" icon="ti-message-circle" culoare="var(--blue)" to="/portal-chiriasi">
    <strong>{d.cereri.length}</strong> cereri noi din portalul chiriașilor</Linie>)
  if ((d.indexuri?.length ?? 0) > 0) alerte.push(<Linie key="ixv" icon="ti-checks" culoare="var(--blue)" to="/citire?tab=validare">
    <strong>{d.indexuri.length}</strong> indexuri primite de la chiriași, de validat</Linie>)

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Tile icon="ti-file-text" label="Contracte active" val={calc.active} to="/contracte" culoare="var(--blue)" />
        {calc.totalSp != null && <Tile icon="ti-building" label="Ocupare spații" val={calc.totalSp ? `${Math.round(calc.ocupate / calc.totalSp * 100)}%` : '—'} sub={`${calc.ocupate} din ${calc.totalSp} ocupate`} to="/spatii" culoare="var(--green)" />}
        <Tile icon="ti-clock" label="Expiră în 90 de zile" val={exp.length} to="/contracte" culoare={exp30.length ? 'var(--red)' : exp.length ? 'var(--amber)' : 'var(--green)'} />
        {vizibil('facturi') && <Tile icon="ti-receipt" label={`De emis — ${numeLuna(luna)}`} val={sumar.deEmis} to="/facturi?tab=lunar" culoare="var(--blue)" />}
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Necesită atenția ta</div></div>
        {alerte.length ? alerte : <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--green)' }}><i className="ti ti-circle-check" /> Nimic urgent acum.</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, isAdmin } = useAuth()
  const { vizibil } = useMeniu()
  // Cartonaș vizibil = modulul e vizibil pe acest dispozitiv ȘI e bifat pentru Acasă
  const arata = (cale) => { const m = moduleDinCale(cale); return !m || (vizibil(m.key) && vizibil(m.key, 'h')) }

  return (
    <>
      <Topbar title="Dashboard" subtitle={`Bun venit, ${profile?.apelativ || profile?.nume || 'Utilizator'}!`}>
        {vizibil('nota_calcul') && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/nota-calcul')}>
            <i className="ti ti-calculator" /> Notă de calcul
          </button>
        )}
        {vizibil('facturi') && (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/facturi')}>
            <i className="ti ti-receipt" /> Facturare
          </button>
        )}
      </Topbar>

      <div className="content">
        <Alerte navigate={navigate} vizibil={vizibil} isAdmin={isAdmin} />
        {GRUPURI.map(grup => {
          const itemiVizibili = grup.itemi.filter(item => arata(item.to))
          if (itemiVizibili.length === 0) return null

          return (
            <div key={grup.titlu} style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px',
                color: grup.culoare, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 4, height: 14, borderRadius: 2, background: grup.culoare }} />
                {grup.titlu}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 12,
              }}>
                {itemiVizibili.map(item => (
                  <button
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    className="dashboard-btn"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                      padding: '18px 16px', background: 'white', border: '1px solid var(--border)',
                      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      transition: 'border-color .15s, transform .1s',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, background: grup.culoare + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`ti ${item.icon}`} style={{ fontSize: 19, color: grup.culoare }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Butoanele marcate desktopOnly se ascund pe ecrane înguste, consistent cu sidebar-ul */}
      <style>{`
        @media (max-width: 768px) {
          .dashboard-btn-desktop { display: none !important; }
        }
      `}</style>
    </>
  )
}
