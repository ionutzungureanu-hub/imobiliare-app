import { useEffect, useState, useRef } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useImobile } from '../hooks/useImobile'
import { getDocumente, addDocument, updateDocument, deleteDocument, getClienti, getUsers, getSpatii } from '../firebase/firestore'
import { uploadDocument, formatBytes } from '../services/cloudinaryService'

// Tipuri predefinite per categorie
const TIPURI = {
  client_PF: ['Carte de identitate', 'Contract de închiriere', 'Act adițional', 'Procură', 'Dovadă venit', 'Altul'],
  client_PJ: ['Contract de închiriere', 'Act adițional', 'Certificat înregistrare ORC', 'CUI / CIF', 'Statut firmă', 'Hotărâre AGA', 'Împuternicire', 'Altul'],
  imobil:    ['Contract vânzare-cumpărare', 'Extras carte funciară', 'Extras de informare', 'Autorizație construcție', 'Certificat energetic', 'Releveu / Plan cadastral', 'Asigurare imobil', 'Altul'],
  manager:   ['Carte de identitate', 'Contract de muncă / colaborare', 'Certificat calificare', 'Altul'],
}

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => THIS_YEAR - i)

export default function Biblioteca() {
  const toast = useToast()
  const { user, profile, isAdmin } = useAuth()
  const { imobile, spatii: mySpatii } = useImobile()

  const [tab,       setTab]       = useState('clienti')
  const [clienti,   setClienti]   = useState([])
  const [users,     setUsers]     = useState([])
  const [documente, setDocumente] = useState([])
  const [loading,   setLoading]   = useState(true)

  // Expand state per entitate
  const [expanded,  setExpanded]  = useState({})
  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  // Modal adaugă document
  const [modal,     setModal]     = useState(null) // { entityType, entityId, entityNume, tip_client }
  const [formDoc,   setFormDoc]   = useState({ nume: '', tip: '', an: THIS_YEAR, tipCustom: '' })
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [uploadedMeta, setUploadedMeta] = useState(null)
  const fileRef = useRef()

  // Modal redenumire
  const [modalRen,  setModalRen]  = useState(null) // { id, nume }
  const [numeNou,   setNumeNou]   = useState('')
  const [saving,    setSaving]    = useState(false)

  const loadAll = async () => {
    setLoading(true)
    const [cl, us, docs] = await Promise.all([getClienti(), getUsers(), getDocumente()])
    setClienti(cl)
    setUsers(us)
    setDocumente(docs)
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  // Filtrare pe rol
  const myImobileIds = imobile.map(im => im.id)
  const mySpatiuIds  = mySpatii?.map(s => s.id) || []
  const myClientiIds = clienti.filter(c => mySpatiuIds.includes(c.spatiuId) || isAdmin).map(c => c.id)

  const clientiVizibili = isAdmin ? clienti : clienti.filter(c => myClientiIds.includes(c.id))
  const imobileVizibile  = imobile
  const usersVizibili    = isAdmin ? users : users.filter(u => u.id === user?.uid)

  const docsFor = (entityType, entityId) =>
    documente.filter(d => d.entityType === entityType && d.entityId === entityId)

  // Grupare pe ani
  const groupByYear = (docs) => {
    const map = {}
    docs.forEach(d => {
      const an = d.an || new Date(d.uploadatLa?.seconds * 1000 || Date.now()).getFullYear()
      if (!map[an]) map[an] = []
      map[an].push(d)
    })
    return Object.entries(map).sort((a, b) => b[0] - a[0])
  }

  // ── Upload ────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadDocument(file, `adminchirie/biblioteca/${modal.entityType}`)
      setUploadedUrl(result.url)
      setUploadedMeta(result)
      if (!formDoc.nume) setFormDoc(f => ({ ...f, nume: file.name.replace(/\.[^.]+$/, '') }))
      toast('Fișier încărcat! Completează detaliile și salvează.')
    } catch (err) {
      toast('Eroare la upload: ' + err.message, 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSaveDoc = async () => {
    if (!uploadedUrl) { toast('Încarcă un fișier mai întâi.', 'error'); return }
    if (!formDoc.nume) { toast('Completează numele documentului.', 'error'); return }
    const tip = formDoc.tip === 'Altul' ? formDoc.tipCustom : formDoc.tip
    setSaving(true)
    try {
      await addDocument({
        entityType:  modal.entityType,
        entityId:    modal.entityId,
        entityNume:  modal.entityNume,
        nume:        formDoc.nume,
        tip:         tip || formDoc.nume,
        an:          Number(formDoc.an),
        url:         uploadedUrl,
        format:      uploadedMeta?.format || 'pdf',
        marime:      uploadedMeta?.bytes || 0,
        uploadatDe:  user?.uid,
      })
      toast('Document adăugat!')
      setModal(null)
      setUploadedUrl('')
      setUploadedMeta(null)
      setFormDoc({ nume: '', tip: '', an: THIS_YEAR, tipCustom: '' })
      loadAll()
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const handleRenume = async () => {
    if (!numeNou.trim()) { toast('Introdu un nume.', 'error'); return }
    setSaving(true)
    try {
      await updateDocument(modalRen.id, { nume: numeNou.trim() })
      toast('Redenumit!')
      setModalRen(null)
      loadAll()
    } catch { toast('Eroare.', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (doc) => {
    if (!confirm(`Ștergi "${doc.nume}"?`)) return
    await deleteDocument(doc.id)
    toast('Document șters.')
    loadAll()
  }

  const openModal = (entityType, entityId, entityNume, tip_client = '') => {
    setModal({ entityType, entityId, entityNume, tip_client })
    setFormDoc({ nume: '', tip: '', an: THIS_YEAR, tipCustom: '' })
    setUploadedUrl('')
    setUploadedMeta(null)
  }

  // ── Render document row ───────────────────────────────────────
  const DocRow = ({ doc }) => {
    const isPDF = doc.format === 'pdf' || doc.url?.includes('.pdf')
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        borderBottom: '1px solid var(--border)', flexWrap: 'wrap'
      }}>
        <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isPDF ? '#FEE2E2' : 'var(--blue-light)', borderRadius: 6, flexShrink: 0 }}>
          <i className={`ti ${isPDF ? 'ti-file-type-pdf' : 'ti-photo'}`}
            style={{ color: isPDF ? '#ef4444' : 'var(--blue)', fontSize: 18 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.nume}
          </div>
          <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 1 }}>
            {doc.tip && doc.tip !== doc.nume && <span>{doc.tip} · </span>}
            {formatBytes(doc.marime)}
            {doc.uploadatLa?.seconds && (
              <span> · {new Date(doc.uploadatLa.seconds * 1000).toLocaleDateString('ro-RO')}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <a href={doc.url} target="_blank" rel="noreferrer"
            className="btn btn-ghost btn-sm" title="Deschide / previzualizare">
            <i className="ti ti-eye" />
          </a>
          <a href={doc.url} download={doc.nume}
            className="btn btn-ghost btn-sm" title="Descarcă">
            <i className="ti ti-download" />
          </a>
          <button className="btn btn-ghost btn-sm" title="Redenumește"
            onClick={() => { setModalRen({ id: doc.id, nume: doc.nume }); setNumeNou(doc.nume) }}>
            <i className="ti ti-pencil" />
          </button>
          <button className="btn btn-danger btn-sm" title="Șterge" onClick={() => handleDelete(doc)}>
            <i className="ti ti-trash" />
          </button>
        </div>
      </div>
    )
  }

  // ── Render entitate cu documente ─────────────────────────────
  const EntityCard = ({ entityType, entityId, entityNume, tip_client, subtitle }) => {
    const docs      = docsFor(entityType, entityId)
    const byYear    = groupByYear(docs)
    const isOpen    = expanded[entityId]

    return (
      <div className="card" style={{ marginBottom: 10 }}>
        {/* Header */}
        <div
          style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => toggleExpand(entityId)}
        >
          <i className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`}
            style={{ color: 'var(--slate)', fontSize: 14, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{entityNume}</div>
            {subtitle && <div style={{ fontSize: 11, color: 'var(--slate)' }}>{subtitle}</div>}
          </div>
          <span className="badge badge-gray" style={{ fontSize: 10 }}>
            {docs.length} {docs.length === 1 ? 'document' : 'documente'}
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={e => { e.stopPropagation(); openModal(entityType, entityId, entityNume, tip_client) }}
          >
            <i className="ti ti-plus" /> Adaugă
          </button>
        </div>

        {/* Documente pe ani */}
        {isOpen && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {byYear.length === 0 ? (
              <div style={{ padding: '14px 20px', color: 'var(--slate)', fontSize: 13, textAlign: 'center' }}>
                Niciun document. Apasă <strong>Adaugă</strong> pentru a încărca primul document.
              </div>
            ) : byYear.map(([an, docs]) => (
              <div key={an}>
                <div style={{ padding: '6px 16px', background: 'var(--slate-light)',
                  fontSize: 11, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  📁 {an}
                </div>
                {docs.map(d => <DocRow key={d.id} doc={d} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const TAB_ITEMS = [
    { key: 'clienti', icon: 'ti-users',   label: 'Clienți' },
    { key: 'imobile', icon: 'ti-building', label: 'Imobile' },
    ...(isAdmin ? [{ key: 'manageri', icon: 'ti-user-cog', label: 'Manageri' }] : []),
  ]

  return (
    <>
      <Topbar title="Bibliotecă documente" subtitle="Documente organizate pe entități și ani" />

      <div className="content">
        {/* Tab-uri */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {TAB_ITEMS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none',
              cursor: 'pointer', borderBottom: `2px solid ${tab === t.key ? 'var(--blue)' : 'transparent'}`,
              color: tab === t.key ? 'var(--blue)' : 'var(--slate)', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit'
            }}>
              <i className={`ti ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty"><i className="ti ti-refresh" /><p>Se încarcă...</p></div>
        ) : (
          <>
            {/* Tab Clienți */}
            {tab === 'clienti' && (
              clientiVizibili.length === 0
                ? <div className="empty"><i className="ti ti-users" /><p>Niciun client găsit.</p></div>
                : clientiVizibili.map(c => (
                    <EntityCard
                      key={c.id}
                      entityType="client"
                      entityId={c.id}
                      entityNume={c.nume}
                      tip_client={c.tip || 'PJ'}
                      subtitle={`${c.tip === 'PF' ? 'Persoană fizică' : 'Persoană juridică'}${c.cui ? ' · CUI: ' + c.cui : ''}`}
                    />
                  ))
            )}

            {/* Tab Imobile */}
            {tab === 'imobile' && (
              imobileVizibile.length === 0
                ? <div className="empty"><i className="ti ti-building" /><p>Niciun imobil găsit.</p></div>
                : imobileVizibile.map(im => (
                    <EntityCard
                      key={im.id}
                      entityType="imobil"
                      entityId={im.id}
                      entityNume={im.nume}
                      tip_client="imobil"
                      subtitle={im.adresa}
                    />
                  ))
            )}

            {/* Tab Manageri — doar admin */}
            {tab === 'manageri' && isAdmin && (
              usersVizibili.length === 0
                ? <div className="empty"><i className="ti ti-user-cog" /><p>Niciun utilizator găsit.</p></div>
                : usersVizibili.map(u => (
                    <EntityCard
                      key={u.id}
                      entityType="manager"
                      entityId={u.id}
                      entityNume={u.nume || u.email}
                      tip_client="manager"
                      subtitle={u.rol === 'admin' ? 'Administrator' : 'Manager'}
                    />
                  ))
            )}
          </>
        )}
      </div>

      {/* ── Modal adaugă document ───────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ width: 520 }}>
            <div className="modal-head">
              <h3>Adaugă document — {modal.entityNume}</h3>
              <button className="modal-close" onClick={() => setModal(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">

              {/* Step 1: Upload fișier */}
              <div style={{ marginBottom: 20, padding: 16, background: 'var(--slate-light)', borderRadius: 8,
                border: uploadedUrl ? '1px solid var(--green)' : '1px dashed var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 10,
                  textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  1. Alege fișier
                </div>
                {!uploadedUrl ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()} disabled={uploading}>
                    <i className={`ti ${uploading ? 'ti-refresh' : 'ti-upload'}`} />
                    {uploading ? 'Se încarcă...' : 'Selectează PDF / imagine'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="ti ti-check-circle" style={{ color: 'var(--green)', fontSize: 20 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{uploadedMeta?.fileName}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate)' }}>{formatBytes(uploadedMeta?.bytes)}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}
                      onClick={() => { setUploadedUrl(''); setUploadedMeta(null) }}>
                      <i className="ti ti-x" />
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect} style={{ display: 'none' }} />
              </div>

              {/* Step 2: Detalii */}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 10,
                textTransform: 'uppercase', letterSpacing: '.5px' }}>
                2. Detalii document
              </div>

              <div className="form-grid">
                <div className="form-group full">
                  <label>Tip document</label>
                  <select value={formDoc.tip} onChange={e => setFormDoc(f => ({ ...f, tip: e.target.value }))}>
                    <option value="">— Alege tip —</option>
                    {(TIPURI[modal.tip_client === 'PF' ? 'client_PF' : modal.tip_client === 'imobil' ? 'imobil' : modal.tip_client === 'manager' ? 'manager' : 'client_PJ'] || TIPURI.client_PJ)
                      .map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {formDoc.tip === 'Altul' && (
                  <div className="form-group full">
                    <label>Denumire tip custom</label>
                    <input value={formDoc.tipCustom} onChange={e => setFormDoc(f => ({ ...f, tipCustom: e.target.value }))}
                      placeholder="ex. Adeverință, Proces verbal..." />
                  </div>
                )}

                <div className="form-group full">
                  <label>Numele documentului *</label>
                  <input value={formDoc.nume} onChange={e => setFormDoc(f => ({ ...f, nume: e.target.value }))}
                    placeholder="ex. Contract închiriere — Ap 1 — 2025" />
                </div>

                <div className="form-group">
                  <label>An document</label>
                  <select value={formDoc.an} onChange={e => setFormDoc(f => ({ ...f, an: Number(e.target.value) }))}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSaveDoc} disabled={saving || !uploadedUrl}>
                <i className="ti ti-device-floppy" /> {saving ? 'Se salvează...' : 'Salvează document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal redenumire ────────────────────────────────── */}
      {modalRen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalRen(null)}>
          <div className="modal-box" style={{ width: 420 }}>
            <div className="modal-head">
              <h3>Redenumește document</h3>
              <button className="modal-close" onClick={() => setModalRen(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nume nou</label>
                <input value={numeNou} onChange={e => setNumeNou(e.target.value)}
                  autoFocus onKeyDown={e => e.key === 'Enter' && handleRenume()} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalRen(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleRenume} disabled={saving}>
                <i className="ti ti-check" /> Salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
