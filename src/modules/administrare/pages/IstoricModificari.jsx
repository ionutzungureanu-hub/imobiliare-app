import { useEffect, useMemo, useState } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { mesajEroare } from '../../../shared/utils/eroare'
import { getAudit, exportaBackup } from '../../../shared/firebase/firestore'

const ETICHETE = {
  chirie_modificata: 'Chirie modificată', chirie_indexata: 'Chirie indexată', indexare_omisa: 'Fără indexare', contract_nou: 'Contract nou',
  contract_modificat: 'Contract modificat', contract_sters: 'Contract șters', facturi_marcate: 'Facturi marcate emise', marcaj_anulat: 'Marcaj anulat',
  acces_imobil: 'Acces imobil', acces_imobil_retras: 'Acces retras (imobil)', acces_firma: 'Acces firmă', acces_firma_retras: 'Acces retras (firmă)',
  cont_creat: 'Cont creat', parola_resetata: 'Parolă resetată', cont_dezactivat: 'Cont dezactivat', cont_activat: 'Cont activat', cont_sters: 'Cont șters',
  entitate_noua: 'Firmă nouă', entitate_modificata: 'Firmă modificată', entitate_stearsa: 'Firmă ștearsă',
}

const fmtTs = (t) => t?.seconds ? new Date(t.seconds * 1000).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function IstoricModificari() {
  const toast = useToast()
  const { isAdmin } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [cauta, setCauta] = useState('')
  const [tip, setTip] = useState('')
  const [backup, setBackup] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    getAudit(400).then(setRows).catch(e => toast(mesajEroare(e, 'Eroare la încărcare'), 'error')).finally(() => setLoading(false))
  }, [isAdmin])

  const vizibile = useMemo(() => {
    const t = cauta.trim().toLowerCase()
    return rows.filter(r => (!tip || r.actiune === tip) && (!t || [r.rezumat, r.utilizator, ETICHETE[r.actiune]].some(v => String(v || '').toLowerCase().includes(t))))
  }, [rows, cauta, tip])

  const faBackup = async () => {
    setBackup('Se pregătește…')
    try {
      const data = await exportaBackup(c => setBackup(`Se citește: ${c}…`))
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
      const a = document.createElement('a'); a.href = url; a.download = `backup-rentis-${new Date().toISOString().slice(0, 10)}.json`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      toast('Backup descărcat.')
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Backup-ul a eșuat'), 'error') }
    setBackup('')
  }

  if (!isAdmin) return (
    <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>
      <i className="ti ti-lock" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
      <p>Acces restricționat. Doar administratorul vede istoricul.</p>
    </div>
  )

  return (
    <>
      <Topbar title="Istoric modificări" subtitle="Cine a schimbat ce, și când">
        <button className="btn btn-ghost btn-sm" onClick={faBackup} disabled={!!backup} title="Descarcă toate datele aplicației într-un fișier JSON">
          <i className="ti ti-database-export" /> {backup || 'Backup date'}
        </button>
      </Topbar>
      <div className="content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input placeholder="Caută (contract, persoană, firmă…)" value={cauta} onChange={e => setCauta(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            <select value={tip} onChange={e => setTip(e.target.value)}>
              <option value="">Toate acțiunile</option>
              {Object.entries(ETICHETE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Data</th><th>Cine</th><th>Acțiune</th><th>Detalii</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4}><div className="empty"><p>Se încarcă…</p></div></td></tr>
                : vizibile.length === 0 ? <tr><td colSpan={4}><div className="empty"><i className="ti ti-history" /><p>Nicio modificare înregistrată încă. Apar de acum încolo.</p></div></td></tr>
                : vizibile.map(r => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtTs(r.at)}</td>
                    <td style={{ fontSize: 13 }}>{r.utilizator || '—'}</td>
                    <td><span className="badge badge-gray">{ETICHETE[r.actiune] || r.actiune}</span></td>
                    <td style={{ fontSize: 13 }}>{r.rezumat}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 10 }}>Se afișează ultimele 400 de înregistrări. Backup-ul conține datele din Firestore, nu fișierele din Storage.</div>
      </div>
    </>
  )
}
