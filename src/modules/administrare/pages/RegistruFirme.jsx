import { useEffect, useRef, useState } from 'react'
import { ref as stRef, getDownloadURL } from 'firebase/storage'
import { storage } from '../../../shared/firebase/config'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { mesajEroare } from '../../../shared/utils/eroare'
import { getEntitatiEmitente, getDocumenteEntitate, addDocumentEntitate, updateDocument, deleteDocument } from '../../../shared/firebase/firestore'
import { uploadDocumentFirebase, deleteDocumentFirebase, formatBytes } from '../services/storageService'

const TIPURI = ['Act constitutiv', 'Certificat de înregistrare / CUI', 'Certificat constatator', 'Contract bancar', 'Asigurare', 'Autorizație', 'Bilanț / declarații', 'Mandat / procură', 'Altul']
const AN = new Date().getFullYear()
const ANI = Array.from({ length: 12 }, (_, i) => AN - i)

// Registrul firmelor emitente: documente pe firmă și an, vizibile doar celor cu acces la firma respectivă
export default function RegistruFirme() {
  const toast = useToast()
  const { user } = useAuth()
  const [firme, setFirme] = useState([])
  const [docs, setDocs] = useState({})            // { entitateId: [doc] }
  const [deschis, setDeschis] = useState({})
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState(null)        // firma căreia îi adăugăm un document
  const [form, setForm] = useState({ nume: '', tip: '', tipCustom: '', an: AN })
  const [fisier, setFisier] = useState(null)      // rezultatul încărcării
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ren, setRen] = useState(null)
  const fileRef = useRef()

  const load = async () => {
    setLoading(true)
    try {
      const f = await getEntitatiEmitente()
      setFirme(f)
      const perechi = await Promise.all(f.map(async e => [e.id, await getDocumenteEntitate(e.id)]))
      setDocs(Object.fromEntries(perechi))
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const deschide = async (d) => {
    try { window.open(await getDownloadURL(stRef(storage, d.path)), '_blank', 'noopener') }
    catch (e) { console.error(e); toast(mesajEroare(e, 'Nu s-a putut deschide fișierul'), 'error') }
  }

  const alegeFisier = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const r = await uploadDocumentFirebase(file, `documente/entitati/${modal.id}`)
      setFisier(r)
      if (!form.nume) setForm(f => ({ ...f, nume: file.name.replace(/\.[^.]+$/, '') }))
    } catch (err) { toast(mesajEroare(err, 'Eroare la încărcare'), 'error') }
    setUploading(false); e.target.value = ''
  }

  const inchideModal = async (anuleaza) => {
    if (anuleaza && fisier?.path) await deleteDocumentFirebase(fisier.path)   // fișier încărcat, dar nesalvat
    setModal(null); setFisier(null)
  }

  const salveaza = async () => {
    if (!fisier) { toast('Încarcă un fișier mai întâi.', 'error'); return }
    if (!form.nume.trim()) { toast('Completează numele documentului.', 'error'); return }
    const tip = form.tip === 'Altul' ? form.tipCustom : form.tip
    setSaving(true)
    try {
      // Nu păstrăm adresa cu token: fișierul se deschide pe cale, deci doar cu drepturile din reguli
      await addDocumentEntitate({
        entityId: modal.id, entityNume: modal.nume, nume: form.nume.trim(), tip: tip || form.nume.trim(),
        an: Number(form.an), path: fisier.path, format: fisier.format, marime: fisier.bytes, uploadatDe: user?.uid,
      })
      toast('Document adăugat.'); setModal(null); setFisier(null); load()
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Salvarea a eșuat'), 'error') }
    setSaving(false)
  }

  const redenumeste = async () => {
    if (!ren.nume.trim()) return
    try { await updateDocument(ren.id, { nume: ren.nume.trim() }); setRen(null); load() }
    catch (e) { toast(mesajEroare(e), 'error') }
  }

  const sterge = async (d) => {
    if (!confirm(`Ștergi „${d.nume}”?`)) return
    try { await deleteDocument(d.id); await deleteDocumentFirebase(d.path); toast('Document șters.'); load() }
    catch (e) { toast(mesajEroare(e, 'Ștergerea a eșuat'), 'error') }
  }

  const peAni = (lista) => {
    const m = {}
    lista.forEach(d => { const a = d.an || new Date((d.uploadatLa?.seconds || Date.now() / 1000) * 1000).getFullYear(); (m[a] ||= []).push(d) })
    return Object.entries(m).sort((a, b) => b[0] - a[0])
  }

  return (
    <>
      <Topbar title="Registru firme" subtitle="Documentele firmelor emitente" />
      <div className="content">
        {loading ? <div className="empty"><p>Se încarcă…</p></div>
          : firme.length === 0 ? (
            <div className="empty"><i className="ti ti-building-bank" /><p>Nu ai acces la nicio firmă emitentă. Administratorul îți poate da acces.</p></div>
          ) : firme.map(f => {
            const lista = docs[f.id] || []
            const open = deschis[f.id]
            return (
              <div className="card" key={f.id} style={{ marginBottom: 10 }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setDeschis(o => ({ ...o, [f.id]: !o[f.id] }))}>
                  <i className={`ti ${open ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ color: 'var(--slate)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{f.nume}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate)' }}>{f.cui ? `CUI ${f.cui} · ` : ''}seria {f.serie}</div>
                  </div>
                  <span className="badge badge-gray" style={{ fontSize: 10 }}>{lista.length} {lista.length === 1 ? 'document' : 'documente'}</span>
                  <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); setModal(f); setFisier(null); setForm({ nume: '', tip: '', tipCustom: '', an: AN }) }}>
                    <i className="ti ti-plus" /> Adaugă
                  </button>
                </div>
                {open && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {lista.length === 0 ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--slate)', fontSize: 13 }}>Niciun document încă.</div>
                      : peAni(lista).map(([an, ds]) => (
                        <div key={an}>
                          <div style={{ padding: '6px 16px', background: 'var(--slate-light)', fontSize: 11, fontWeight: 600, color: 'var(--slate)' }}>📁 {an}</div>
                          {ds.map(d => (
                            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                              <i className={`ti ${d.format === 'pdf' ? 'ti-file-type-pdf' : 'ti-photo'}`} style={{ fontSize: 20, color: d.format === 'pdf' ? '#B24A4A' : 'var(--blue)' }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nume}</div>
                                <div style={{ fontSize: 11, color: 'var(--slate)' }}>{d.tip && d.tip !== d.nume ? `${d.tip} · ` : ''}{formatBytes(d.marime)}
                                  {d.uploadatLa?.seconds ? ` · ${new Date(d.uploadatLa.seconds * 1000).toLocaleDateString('ro-RO')}` : ''}</div>
                              </div>
                              <button className="btn btn-ghost btn-sm" onClick={() => deschide(d)} title="Deschide"><i className="ti ti-eye" /></button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setRen({ id: d.id, nume: d.nume })} title="Redenumește"><i className="ti ti-pencil" /></button>
                              <button className="btn btn-danger btn-sm" onClick={() => sterge(d)} title="Șterge"><i className="ti ti-trash" /></button>
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && inchideModal(true)}>
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div className="modal-head"><h3>Adaugă document — {modal.nume}</h3>
              <button className="modal-close" onClick={() => inchideModal(true)}><i className="ti ti-x" /></button></div>
            <div className="modal-body">
              <div style={{ marginBottom: 16, padding: 14, background: 'var(--slate-light)', borderRadius: 8, border: fisier ? '1px solid var(--green)' : '1px dashed var(--border)' }}>
                {fisier ? <div><i className="ti ti-check-circle" style={{ color: 'var(--green)' }} /> {fisier.fileName} <span style={{ color: 'var(--slate)', fontSize: 12 }}>{formatBytes(fisier.bytes)}</span></div>
                  : <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()} disabled={uploading}>
                      <i className="ti ti-upload" /> {uploading ? 'Se încarcă…' : 'Selectează PDF / imagine'}</button>}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={alegeFisier} style={{ display: 'none' }} />
              </div>
              <div className="form-grid">
                <div className="form-group full"><label>Tip document</label>
                  <select value={form.tip} onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}>
                    <option value="">— alege tip —</option>{TIPURI.map(t => <option key={t}>{t}</option>)}</select></div>
                {form.tip === 'Altul' && <div className="form-group full"><label>Denumire tip</label>
                  <input value={form.tipCustom} onChange={e => setForm(f => ({ ...f, tipCustom: e.target.value }))} /></div>}
                <div className="form-group full"><label>Numele documentului *</label>
                  <input value={form.nume} onChange={e => setForm(f => ({ ...f, nume: e.target.value }))} /></div>
                <div className="form-group"><label>An</label>
                  <select value={form.an} onChange={e => setForm(f => ({ ...f, an: Number(e.target.value) }))}>{ANI.map(y => <option key={y}>{y}</option>)}</select></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => inchideModal(true)}>Anulează</button>
              <button className="btn btn-primary" onClick={salveaza} disabled={saving || !fisier}><i className="ti ti-device-floppy" /> {saving ? 'Se salvează…' : 'Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {ren && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRen(null)}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-head"><h3>Redenumește document</h3><button className="modal-close" onClick={() => setRen(null)}><i className="ti ti-x" /></button></div>
            <div className="modal-body"><div className="form-group"><label>Nume nou</label>
              <input value={ren.nume} autoFocus onChange={e => setRen(r => ({ ...r, nume: e.target.value }))} onKeyDown={e => e.key === 'Enter' && redenumeste()} /></div></div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setRen(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={redenumeste}>Salvează</button></div>
          </div>
        </div>
      )}
    </>
  )
}
