import { useEffect, useState } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { getUsers, getAllAcces, updateUserProfile, deleteUserProfile, setAcces, NIVELURI, logAudit } from '../../../shared/firebase/firestore'
import { creeazaUtilizator, reseteazaParola, seteazaDezactivat, stergeUtilizator, mementoApel } from '../../../shared/services/utilizatoriApi'
import { mesajEroare } from '../../../shared/utils/eroare'
import { useImobile } from '../../../shared/hooks/useImobile'

const esteUid = (id) => /^[A-Za-z0-9]{20,}$/.test(id || '')
const numeIm = (i) => i.nume || i.denumire || i.id

export default function Utilizatori() {
  const toast = useToast()
  const [mem, setMem] = useState(null)
  const [memBusy, setMemBusy] = useState(false)
  const ruleazaMemento = async (actiune) => {
    setMemBusy(true)
    try { const d = await mementoApel(actiune); if (actiune === 'test') toast(d.trimis ? 'Email de test trimis către adresa ta.' : (d.mesaj || 'Nimic de trimis.')); else setMem(d) }
    catch (e) { toast(mesajEroare(e), 'error') }
    setMemBusy(false)
  }
  const { user, isAdmin } = useAuth()
  const { imobile } = useImobile()

  const [users, setUsers]   = useState([])
  const [accese, setAccese] = useState({})
  const [modal, setModal]   = useState(null)   // 'nou' | 'edit' | 'parola'
  const [sel, setSel]       = useState(null)
  const [form, setForm]     = useState({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setUsers(await getUsers())
      const a = await getAllAcces()
      setAccese(Object.fromEntries(a.map(x => [x.id, x.imobile || {}])))
    } catch (e) { toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
  }
  useEffect(() => { if (isAdmin) load() }, [isAdmin])

  if (!isAdmin) return (
    <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>
      <i className="ti ti-lock" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
      <p>Acces restricționat. Doar administratorul poate gestiona utilizatorii.</p>
    </div>
  )

  const conturi = users.filter(u => esteUid(u.id))
  const vechi   = users.filter(u => !esteUid(u.id))

  const deschideNou = () => { setForm({ nume: '', username: '', password: '', imobile: {} }); setSel(null); setModal('nou') }
  const deschideEdit = (u) => { setForm({ nume: u.nume || '', emailContact: u.emailContact || '', rol: u.rol || 'manager', imobile: { ...(accese[u.id] || {}) } }); setSel(u); setModal('edit') }
  const deschideParola = (u) => { setForm({ password: '' }); setSel(u); setModal('parola') }
  const inchide = () => { setModal(null); setSel(null) }

  const bifaImobil = (id, on) => setForm(f => {
    const m = { ...f.imobile }
    if (on) m[id] = m[id] || 2; else delete m[id]
    return { ...f, imobile: m }
  })
  const nivelImobil = (id, n) => setForm(f => ({ ...f, imobile: { ...f.imobile, [id]: n } }))

  const lista = (
    <div style={{ marginTop: 14 }}>
      <label style={{ fontWeight: 600, fontSize: 13 }}>Acces la imobile</label>
      {imobile.length === 0 && <div style={{ color: 'var(--slate)', fontSize: 13 }}>Nu există imobile.</div>}
      {imobile.map(i => {
        const niv = form.imobile?.[i.id] || 0
        return (
          <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <input type="checkbox" checked={niv > 0} onChange={e => bifaImobil(i.id, e.target.checked)} style={{ width: 18, height: 18 }} />
            <span style={{ flex: 1 }}>{numeIm(i)}</span>
            {niv > 0 && (
              <select value={niv} onChange={e => nivelImobil(i.id, Number(e.target.value))} style={{ minWidth: 120 }}>
                {[1, 2, 3].map(n => <option key={n} value={n}>{NIVELURI[n]}</option>)}
              </select>
            )}
          </div>
        )
      })}
    </div>
  )

  const salveazaNou = async () => {
    if (!form.username.trim()) { toast('Completează username-ul.', 'error'); return }
    if (!form.password) { toast('Introdu o parolă.', 'error'); return }
    setSaving(true)
    try {
      await creeazaUtilizator({ username: form.username, password: form.password, nume: form.nume, imobile: form.imobile })
      logAudit({ actiune: 'cont_creat', tip: 'persoana', rezumat: `Cont creat: ${form.username}` })
      toast('Cont creat. Comunică-i username-ul și parola.')
      inchide(); load()
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  const salveazaEdit = async () => {
    setSaving(true)
    try {
      const u = sel
      await updateUserProfile(u.id, { nume: form.nume, emailContact: (form.emailContact || '').trim(), ...(u.id !== user.uid ? { rol: form.rol } : {}) })
      if (form.rol !== 'admin') {
        const vechiM = accese[u.id] || {}
        for (const id of new Set([...Object.keys(vechiM), ...Object.keys(form.imobile)])) {
          const n = form.imobile[id] || 0
          if ((vechiM[id] || 0) !== n) await setAcces(u.id, { nume: form.nume, email: u.email }, id, n)
        }
      }
      toast('Salvat.'); inchide(); load()
    } catch (e) { toast(mesajEroare(e, 'Eroare la salvare'), 'error') }
    setSaving(false)
  }

  const salveazaParola = async () => {
    if (!form.password) { toast('Introdu o parolă.', 'error'); return }
    setSaving(true)
    try { await reseteazaParola(sel.id, form.password); logAudit({ actiune: 'parola_resetata', tip: 'persoana', id: sel.id, rezumat: `Parolă schimbată pentru ${sel.nume || afisUser(sel)}` }); toast('Parolă schimbată.'); inchide() }
    catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  const comuta = async (u) => {
    try { await seteazaDezactivat(u.id, u.activ !== false); logAudit({ actiune: u.activ !== false ? 'cont_dezactivat' : 'cont_activat', tip: 'persoana', id: u.id, rezumat: `${u.nume || afisUser(u)}: cont ${u.activ !== false ? 'dezactivat' : 'activat'}` }); toast(u.activ !== false ? 'Cont dezactivat.' : 'Cont activat.'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  const sterge = async (u) => {
    if (!confirm(`Ștergi definitiv contul „${u.nume || u.username || u.email}”?`)) return
    try { await stergeUtilizator(u.id); logAudit({ actiune: 'cont_sters', tip: 'persoana', id: u.id, rezumat: `Cont șters: ${u.nume || afisUser(u)}` }); toast('Cont șters.'); load() } catch (e) { toast(e.message, 'error') }
  }

  const stergeVechi = async (u) => {
    if (!confirm(`Ștergi profilul vechi „${u.nume || u.email || u.id}”?`)) return
    try { await deleteUserProfile(u.id); toast('Profil șters.'); load() } catch (e) { toast(mesajEroare(e), 'error') }
  }

  const afisUser = (u) => u.username || (u.email || '').replace(/@rentis\.app$/, '')

  return (
    <>
      <Topbar title="Utilizatori" subtitle="Conturi create de administrator">
        <button className="btn btn-primary btn-sm" onClick={deschideNou}><i className="ti ti-user-plus" /> Utilizator nou</button>
      </Topbar>

      <div className="content">
        <div className="card" style={{ marginBottom: 16 }}><div className="card-body">
          <strong><i className="ti ti-bell" /> Memento expirări contracte (email zilnic)</strong>
          <div style={{ fontSize: 13, color: 'var(--slate)', margin: '4px 0 10px' }}>
            Cu 7 zile înainte de expirare și apoi zilnic, până se bifează „tratat” în Registru sau se modifică data de final. Primesc administratorii și cei cu acces la imobil, la „Email pentru notificări” (se completează la Editare utilizator).
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" disabled={memBusy} onClick={() => ruleazaMemento('previzualizare')}><i className="ti ti-eye" /> Previzualizează cine primește</button>
            <button className="btn btn-ghost btn-sm" disabled={memBusy} onClick={() => ruleazaMemento('test')}><i className="ti ti-send" /> Trimite test către mine</button>
          </div>
          {mem && (
            <div style={{ fontSize: 13, marginTop: 10 }}>
              Azi ({mem.azi}): <strong>{mem.contracte}</strong> contracte de semnalat, <strong>{mem.destinatari.length}</strong> destinatari.
              {mem.destinatari.map((d, i) => <div key={i}>• {d.nume || d.email} — {d.email} ({d.contracte})</div>)}
            </div>
          )}
        </div></div>
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          <span>
            Tu creezi conturile (username + parola aleasă de tine) și le comunici persoanelor. Ele nu își pot schimba parola; dacă o uită, o resetezi de aici.
            Chiriașii nu au cont — primesc doar linkul din Portal chiriași.
          </span>
        </div>

        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Nume</th><th>Username</th><th>Rol</th><th>Imobile</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {conturi.length === 0 ? (
                <tr><td colSpan={6}><div className="empty"><i className="ti ti-users" /><p>Niciun utilizator.</p></div></td></tr>
              ) : conturi.map(u => (
                <tr key={u.id} style={u.activ === false ? { opacity: .55 } : undefined}>
                  <td style={{ fontWeight: 500 }}>{u.nume || '—'}</td>
                  <td style={{ fontSize: 13 }}>{afisUser(u)}</td>
                  <td><span className={`badge ${u.rol === 'admin' ? 'badge-blue' : 'badge-gray'}`}>{u.rol === 'admin' ? 'Administrator' : 'Manager'}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--slate)' }}>
                    {u.rol === 'admin' ? <span className="badge badge-green">Toate imobilele</span>
                      : Object.keys(accese[u.id] || {}).length > 0
                        ? Object.entries(accese[u.id]).map(([id, n]) => `${numeIm(imobile.find(im => im.id === id) || { id })} (${NIVELURI[n]})`).join(', ')
                        : <span style={{ color: 'var(--amber)' }}>Niciun imobil</span>}
                  </td>
                  <td><span className={`badge ${u.activ !== false ? 'badge-green' : 'badge-red'}`}>{u.activ !== false ? 'Activ' : 'Dezactivat'}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => deschideEdit(u)} title="Editează"><i className="ti ti-pencil" /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deschideParola(u)} title="Schimbă parola"><i className="ti ti-key" /></button>
                    {u.id !== user.uid && <>
                      <button className="btn btn-ghost btn-sm" onClick={() => comuta(u)} title={u.activ !== false ? 'Dezactivează' : 'Activează'}>
                        <i className={`ti ${u.activ !== false ? 'ti-eye-off' : 'ti-eye'}`} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => sterge(u)} title="Șterge"><i className="ti ti-trash" /></button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {vechi.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Profile vechi</div>
              <div className="card-subtitle">Create de versiunea anterioară, fără cont legat. Pot fi șterse.</div>
            </div>
            <div className="card-body">
              {vechi.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ flex: 1 }}>{u.nume || '—'} <span style={{ color: 'var(--slate)', fontSize: 12 }}>{u.email}</span></span>
                  <button className="btn btn-danger btn-sm" onClick={() => stergeVechi(u)}><i className="ti ti-trash" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && inchide()}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>{modal === 'nou' ? 'Utilizator nou' : modal === 'parola' ? `Parolă nouă — ${sel?.nume || afisUser(sel)}` : 'Editează utilizator'}</h3>
              <button className="modal-close" onClick={inchide}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {modal === 'nou' && (
                <>
                  <div className="form-grid">
                    <div className="form-group"><label>Nume</label>
                      <input value={form.nume} onChange={e => setForm(f => ({ ...f, nume: e.target.value }))} placeholder="Maria Popescu" /></div>
                    <div className="form-group"><label>Username *</label>
                      <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="maria"
                        autoCapitalize="none" autoCorrect="off" spellCheck={false} /></div>
                    <div className="form-group full"><label>Parolă *</label>
                      <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        autoComplete="off" autoCapitalize="none" spellCheck={false} /></div>
                  </div>
                  {lista}
                </>
              )}
              {modal === 'edit' && (
                <>
                  <div className="form-grid">
                    <div className="form-group"><label>Nume</label>
                      <input value={form.nume} onChange={e => setForm(f => ({ ...f, nume: e.target.value }))} /></div>
                    <div className="form-group"><label>Email pentru notificări</label>
                      <input type="email" value={form.emailContact || ''} onChange={e => setForm(f => ({ ...f, emailContact: e.target.value }))} placeholder="maria@firma.ro" /></div>
                    {sel?.id !== user.uid && (
                      <div className="form-group"><label>Rol</label>
                        <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                          <option value="manager">Manager</option>
                          <option value="admin">Administrator</option>
                        </select></div>
                    )}
                  </div>
                  {form.rol === 'admin'
                    ? <div className="alert alert-info" style={{ marginTop: 14 }}><i className="ti ti-info-circle" /><span>Administratorul are acces la toate imobilele.</span></div>
                    : lista}
                </>
              )}
              {modal === 'parola' && (
                <div className="form-group"><label>Parolă nouă</label>
                  <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    autoComplete="off" autoCapitalize="none" spellCheck={false} /></div>
              )}
              <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 12 }}>
                {modal !== 'edit' && 'Firebase cere minim 6 caractere; altfel nu există alte criterii.'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={inchide}>Anulează</button>
              <button className="btn btn-primary" disabled={saving}
                onClick={modal === 'nou' ? salveazaNou : modal === 'parola' ? salveazaParola : salveazaEdit}>
                <i className="ti ti-device-floppy" /> {saving ? 'Se salvează…' : modal === 'nou' ? 'Creează cont' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
