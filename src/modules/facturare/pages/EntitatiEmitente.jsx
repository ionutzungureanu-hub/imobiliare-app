import { useEffect, useState } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { mesajEroare } from '../../../shared/utils/eroare'
import { getEntitatiEmitente, saveEntitateEmitenta, deleteEntitateEmitenta, getRegistru, logAudit } from '../../../shared/firebase/firestore'
import { TVA_IMPLICIT } from '../services/facturareUtils'

const gol = (nume = '') => ({
  nume, cui: '', serie: '', furnizor: 'fgo', tva: TVA_IMPLICIT,
  tipScadenta: 'zile', valScadenta: 20,
  text: 'Chirie {luna} {anul} – contract nr. {contract}', activ: true,
})

export default function EntitatiEmitente() {
  const toast = useToast()
  const { isAdmin } = useAuth()
  const [lista, setLista] = useState([])
  const [folosite, setFolosite] = useState([])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [ents, a, b] = await Promise.all([getEntitatiEmitente(), getRegistru('comercial'), getRegistru('rezidential')])
      setLista(ents)
      const nume = new Set(ents.map(e => e.nume))
      setFolosite([...new Set([...a, ...b].map(r => r.entitate).filter(Boolean))].filter(n => !nume.has(n)))
    } catch (e) { toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
  }
  useEffect(() => { if (isAdmin) load() }, [isAdmin])

  if (!isAdmin) return (
    <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>
      <i className="ti ti-lock" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
      <p>Acces restricționat. Doar administratorul gestionează entitățile emitente.</p>
    </div>
  )

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const salveaza = async () => {
    if (!form.nume.trim()) { toast('Completează denumirea.', 'error'); return }
    if (!form.serie.trim()) { toast('Completează seria facturilor (ex. KAD).', 'error'); return }
    const dublura = lista.find(e => e.id !== form.id && e.nume.trim().toLowerCase() === form.nume.trim().toLowerCase())
    if (dublura) { toast('Există deja o entitate cu această denumire.', 'error'); return }
    setSaving(true)
    try {
      await saveEntitateEmitenta({
        ...form, nume: form.nume.trim(), serie: form.serie.trim().toUpperCase(), cui: form.cui.trim(),
        tva: Number(form.tva), valScadenta: Number(form.valScadenta),
      })
      logAudit({ actiune: form.id ? 'entitate_modificata' : 'entitate_noua', tip: 'entitate', id: form.id, rezumat: `${form.nume.trim()} — seria ${form.serie.trim().toUpperCase()}, TVA ${form.tva}%` })
      toast('Entitate salvată.'); setForm(null); load()
    } catch (e) { toast(mesajEroare(e, 'Salvarea a eșuat'), 'error') }
    setSaving(false)
  }

  const sterge = async (e) => {
    if (!confirm(`Ștergi entitatea „${e.nume}”? Contractele rămân, dar nu vor mai putea fi facturate până o recreezi.`)) return
    try { await deleteEntitateEmitenta(e.id); logAudit({ actiune: 'entitate_stearsa', tip: 'entitate', id: e.id, rezumat: `Entitate ștearsă: ${e.nume}` }); toast('Entitate ștearsă.'); load() } catch (er) { toast(mesajEroare(er), 'error') }
  }

  return (
    <>
      <Topbar title="Entități emitente" subtitle="Firmele care emit facturile de chirie">
        <button className="btn btn-primary btn-sm" onClick={() => setForm(gol())}><i className="ti ti-plus" /> Entitate nouă</button>
      </Topbar>
      <div className="content">
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          <span>
            Fiecare firmă care facturează are seria ei și propriile valori implicite (TVA, scadență, textul facturii). Un contract folosește entitatea aleasă în
            <strong> Contracte → Registru → „Cine facturează / încasează”</strong>; denumirea trebuie să coincidă. Cheile de acces la furnizorul de facturare nu se păstrează aici.
          </span>
        </div>

        {folosite.length > 0 && (
          <div className="alert" style={{ marginBottom: 16, background: 'var(--amber-light)', color: 'var(--amber)', border: '1px solid #E3C77D' }}>
            <i className="ti ti-alert-triangle" />
            <span style={{ flex: 1 }}>
              Folosite în registre, dar neconfigurate: {folosite.map(n => (
                <button key={n} className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => setForm(gol(n))}>{n} <i className="ti ti-plus" /></button>
              ))}
            </span>
          </div>
        )}

        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Denumire</th><th>CUI</th><th>Serie</th><th>TVA</th><th>Scadență implicită</th><th>Furnizor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={8}><div className="empty"><i className="ti ti-building-bank" /><p>Nicio entitate. Adaugă prima firmă care facturează.</p></div></td></tr>
              ) : lista.map(e => (
                <tr key={e.id} style={e.activ === false ? { opacity: .55 } : undefined}>
                  <td style={{ fontWeight: 600 }}>{e.nume}</td>
                  <td>{e.cui || '—'}</td>
                  <td>{e.serie}</td>
                  <td>{e.tva}%</td>
                  <td style={{ fontSize: 13 }}>{e.tipScadenta === 'data' ? `ziua ${e.valScadenta} a lunii` : `${e.valScadenta} zile de la emitere`}</td>
                  <td>{(e.furnizor || 'fgo').toUpperCase()}</td>
                  <td><span className={`badge ${e.activ !== false ? 'badge-green' : 'badge-gray'}`}>{e.activ !== false ? 'Activă' : 'Inactivă'}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...gol(), ...e })}><i className="ti ti-pencil" /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => sterge(e)}><i className="ti ti-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>{form.id ? 'Editează entitatea' : 'Entitate emitentă nouă'}</h3>
              <button className="modal-close" onClick={() => setForm(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full"><label>Denumire * (exact ca în registru)</label>
                  <input value={form.nume} onChange={e => set('nume', e.target.value)} placeholder="Kado Excelsior SRL" /></div>
                <div className="form-group"><label>CUI</label><input value={form.cui} onChange={e => set('cui', e.target.value)} /></div>
                <div className="form-group"><label>Serie facturi *</label>
                  <input value={form.serie} onChange={e => set('serie', e.target.value)} placeholder="KAD" /></div>
                <div className="form-group"><label>TVA implicit (%)</label>
                  <input type="number" step="0.01" value={form.tva} onChange={e => set('tva', e.target.value)} /></div>
                <div className="form-group"><label>Furnizor facturare</label>
                  <select value={form.furnizor} onChange={e => set('furnizor', e.target.value)}><option value="fgo">FGO</option></select></div>
                <div className="form-group"><label>Scadență implicită</label>
                  <select value={form.tipScadenta} onChange={e => set('tipScadenta', e.target.value)}>
                    <option value="zile">N zile de la emitere</option>
                    <option value="data">Ziua N din lună</option>
                  </select></div>
                <div className="form-group"><label>{form.tipScadenta === 'data' ? 'Ziua din lună' : 'Număr de zile'}</label>
                  <input type="number" min="1" max={form.tipScadenta === 'data' ? 31 : 365} value={form.valScadenta} onChange={e => set('valScadenta', e.target.value)} /></div>
                <div className="form-group full"><label>Textul de pe factură</label>
                  <input value={form.text} onChange={e => set('text', e.target.value)} />
                  <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>Se completează automat: {'{luna}'} · {'{anul}'} · {'{contract}'} (numărul contractului).</div></div>
                <div className="form-group full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.activ !== false} onChange={e => set('activ', e.target.checked)} style={{ width: 18, height: 18 }} />
                  <label style={{ margin: 0 }}>Entitate activă</label></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={salveaza} disabled={saving}><i className="ti ti-device-floppy" /> {saving ? 'Se salvează…' : 'Salvează'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
