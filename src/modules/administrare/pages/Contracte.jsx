import { useEffect, useState, useRef, useCallback } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import {
  getSeriiContracte, addSerieContract, deleteSerieContract, getNextNumarSerie, updateNumarSerie,
  getTemplateContracte, addTemplateContract, deleteTemplateContract,
  getDrafturiContracte, getDraftContract, saveDraftContract, deleteDraftContract
} from '../../../shared/firebase/firestore'
import { docxToHtml, htmlToDocx } from '../services/docxService'

export default function Contracte() {
  const toast = useToast()
  const [tab, setTab] = useState('drafturi') // 'drafturi' | 'editor' | 'templates' | 'serii'

  const [drafturi,  setDrafturi]  = useState([])
  const [templates, setTemplates] = useState([])
  const [serii,     setSerii]     = useState([])
  const [loading,   setLoading]   = useState(true)

  // Editor state
  const [editDraftId, setEditDraftId] = useState(null)
  const [titlu,        setTitlu]       = useState('')
  const [serieAleasa,  setSerieAleasa] = useState('')
  const [numarManual,  setNumarManual] = useState('')
  const [continut,     setContinut]    = useState('')
  const [saving,       setSaving]      = useState(false)
  const editorRef = useRef()
  const fileTplRef = useRef()
  const [uploadingTpl, setUploadingTpl] = useState(false)

  // Modal serie nouă
  const [modalSerie, setModalSerie] = useState(false)
  const [numeSerie,  setNumeSerie]  = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [d, t, s] = await Promise.all([getDrafturiContracte(), getTemplateContracte(), getSeriiContracte()])
    setDrafturi(d); setTemplates(t); setSerii(s)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Import template Word ───────────────────────────────────────
  const handleImportTemplate = async (file) => {
    if (!file) return
    setUploadingTpl(true)
    try {
      const html = await docxToHtml(file)
      await addTemplateContract({
        nume: file.name.replace(/\.docx?$/i, ''),
        continut: html,
      })
      toast('Template importat!')
      loadAll()
    } catch (err) {
      toast('Eroare la import: ' + err.message, 'error')
    } finally {
      setUploadingTpl(false)
    }
  }

  // ── Serii ───────────────────────────────────────────────────────
  const handleAddSerie = async () => {
    if (!numeSerie.trim()) { toast('Introdu numele seriei.', 'error'); return }
    await addSerieContract(numeSerie.trim())
    toast('Serie adăugată!')
    setNumeSerie(''); setModalSerie(false)
    loadAll()
  }

  const handleDeleteSerie = async (id, nume) => {
    if (!confirm(`Ștergi seria "${nume}"?`)) return
    await deleteSerieContract(id)
    toast('Serie ștearsă.')
    loadAll()
  }

  // ── Creare draft nou ──────────────────────────────────────────
  const startNewDraft = (template = null) => {
    setEditDraftId(null)
    setTitlu(template ? `Contract — ${template.nume}` : 'Contract nou')
    setSerieAleasa(serii[0]?.id || '')
    setNumarManual('')
    setContinut(template?.continut || '<p>Începeți să editați contractul aici...</p>')
    setTab('editor')
  }

  const openEditDraft = async (draft) => {
    setEditDraftId(draft.id)
    setTitlu(draft.titlu)
    setSerieAleasa(draft.serieId || '')
    setNumarManual(draft.numar || '')
    setContinut(draft.continut)
    setTab('editor')
  }

  const handleSaveDraft = async (status = 'ciorna') => {
    if (!titlu.trim()) { toast('Completează titlul.', 'error'); return }
    setSaving(true)
    try {
      const htmlContent = editorRef.current?.innerHTML || continut
      let numarFinal = numarManual
      let numarComplet = numarManual

      // Generare automată număr dacă e draft nou și nu există deja
      if (!editDraftId && serieAleasa && !numarManual) {
        const serie = serii.find(s => s.id === serieAleasa)
        const nr = await getNextNumarSerie(serieAleasa)
        numarFinal = nr
        numarComplet = `${serie?.nume}/${String(nr).padStart(3, '0')}`
      } else if (serieAleasa && numarManual) {
        const serie = serii.find(s => s.id === serieAleasa)
        numarComplet = `${serie?.nume}/${String(numarManual).padStart(3, '0')}`
      }

      await saveDraftContract({
        id: editDraftId,
        titlu: titlu.trim(),
        serieId: serieAleasa,
        serieNume: serii.find(s => s.id === serieAleasa)?.nume || '',
        numar: numarFinal,
        numarComplet,
        continut: htmlContent,
        status,
      })
      toast(status === 'finalizat' ? 'Contract finalizat și salvat!' : 'Draft salvat!')
      setTab('drafturi')
      loadAll()
    } catch (err) {
      toast('Eroare la salvare: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDraft = async (id, titlu) => {
    if (!confirm(`Ștergi draftul "${titlu}"?`)) return
    await deleteDraftContract(id)
    toast('Draft șters.')
    loadAll()
  }

  const handleExportDocx = async () => {
    const htmlContent = editorRef.current?.innerHTML || continut
    try {
      await htmlToDocx(htmlContent, titlu || 'Contract')
      toast('Document exportat!')
    } catch (err) {
      toast('Eroare export: ' + err.message, 'error')
    }
  }

  // ── Editor toolbar ────────────────────────────────────────────
  const exec = (cmd, value = null) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }

  return (
    <>
      <Topbar title="Contracte" subtitle="Realizare și gestionare contracte">
        {tab !== 'editor' && (
          <button className="btn btn-primary btn-sm" onClick={() => startNewDraft()}>
            <i className="ti ti-plus" /> Contract nou
          </button>
        )}
      </Topbar>

      <div className="content">
        {/* Tab-uri */}
        {tab !== 'editor' && (
          <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            {[
              { key: 'drafturi',  icon: 'ti-files',    label: `Drafturi (${drafturi.length})` },
              { key: 'templates', icon: 'ti-template',  label: `Template-uri (${templates.length})` },
              { key: 'serii',     icon: 'ti-list-numbers', label: `Serii numerotare (${serii.length})` },
            ].map(t => (
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
        )}

        {loading && <div className="empty"><i className="ti ti-refresh" /><p>Se încarcă...</p></div>}

        {/* ── TAB DRAFTURI ──────────────────────────────────────── */}
        {!loading && tab === 'drafturi' && (
          drafturi.length === 0 ? (
            <div className="card"><div className="empty"><i className="ti ti-files" /><p>Niciun contract creat încă. Apasă <strong>Contract nou</strong>.</p></div></div>
          ) : (
            <div className="card">
              <table>
                <thead><tr><th>Nr. dosar</th><th>Titlu</th><th>Status</th><th>Ultima modificare</th><th></th></tr></thead>
                <tbody>
                  {drafturi.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600, color: 'var(--blue)' }}>{d.numarComplet || '—'}</td>
                      <td>{d.titlu}</td>
                      <td>
                        <span className={`badge ${d.status === 'finalizat' ? 'badge-green' : 'badge-amber'}`}>
                          {d.status === 'finalizat' ? 'Finalizat' : 'Ciornă'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--slate)' }}>
                        {d.updatedAt?.seconds ? new Date(d.updatedAt.seconds * 1000).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditDraft(d)}><i className="ti ti-pencil" /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDraft(d.id, d.titlu)}><i className="ti ti-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── TAB TEMPLATE-URI ──────────────────────────────────── */}
        {!loading && tab === 'templates' && (
          <>
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={() => fileTplRef.current?.click()} disabled={uploadingTpl}>
                  <i className={`ti ${uploadingTpl ? 'ti-refresh' : 'ti-upload'}`} />
                  {uploadingTpl ? 'Se importă...' : 'Importă template Word (.docx)'}
                </button>
                <input ref={fileTplRef} type="file" accept=".docx" onChange={e => handleImportTemplate(e.target.files[0])} style={{ display: 'none' }} />
                <span style={{ fontSize: 12, color: 'var(--slate)' }}>Poți importa oricâte variante de contracte</span>
              </div>
            </div>

            {templates.length === 0 ? (
              <div className="card"><div className="empty"><i className="ti ti-template" /><p>Niciun template importat.</p></div></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {templates.map(t => (
                  <div key={t.id} className="card">
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <i className="ti ti-file-text" style={{ fontSize: 24, color: 'var(--blue)' }} />
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{t.nume}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => startNewDraft(t)}>
                          <i className="ti ti-file-plus" /> Folosește
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={async () => {
                          if (!confirm(`Ștergi template-ul "${t.nume}"?`)) return
                          await deleteTemplateContract(t.id); toast('Șters.'); loadAll()
                        }}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB SERII ──────────────────────────────────────────── */}
        {!loading && tab === 'serii' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setModalSerie(true)}>
                <i className="ti ti-plus" /> Serie nouă
              </button>
            </div>
            {serii.length === 0 ? (
              <div className="card"><div className="empty"><i className="ti ti-list-numbers" /><p>Nicio serie de numerotare. Creează una pentru a numerota contractele.</p></div></div>
            ) : (
              <div className="card">
                <table>
                  <thead><tr><th>Serie</th><th>Ultimul număr folosit</th><th>Următorul</th><th></th></tr></thead>
                  <tbody>
                    {serii.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.nume}</td>
                        <td>{s.ultimulNumar || 0}</td>
                        <td style={{ color: 'var(--blue)', fontWeight: 600 }}>{(s.ultimulNumar || 0) + 1}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button className="btn btn-ghost btn-sm" onClick={async () => {
                              const nou = prompt('Setează manual ultimul număr folosit:', s.ultimulNumar || 0)
                              if (nou === null) return
                              await updateNumarSerie(s.id, Number(nou) || 0)
                              toast('Actualizat.'); loadAll()
                            }}>
                              <i className="ti ti-pencil" />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSerie(s.id, s.nume)}>
                              <i className="ti ti-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TAB EDITOR ─────────────────────────────────────────── */}
        {tab === 'editor' && (
          <div>
            {/* Header editor */}
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <div className="form-grid">
                <div className="form-group full">
                  <label>Titlu contract</label>
                  <input value={titlu} onChange={e => setTitlu(e.target.value)} placeholder="ex. Contract închiriere — Apt 3" />
                </div>
                <div className="form-group">
                  <label>Serie numerotare</label>
                  <select value={serieAleasa} onChange={e => setSerieAleasa(e.target.value)}>
                    <option value="">— Fără serie —</option>
                    {serii.map(s => <option key={s.id} value={s.id}>{s.nume}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nr. dosar (gol = automat)</label>
                  <input type="number" value={numarManual} onChange={e => setNumarManual(e.target.value)} placeholder="ex. 47" />
                </div>
              </div>
            </div>

            {/* Toolbar editor */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 0, padding: '8px 10px', background: 'var(--slate-light)', border: '1px solid var(--border)', borderRadius: '10px 10px 0 0', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => exec('bold')} title="Bold"><i className="ti ti-bold" /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => exec('italic')} title="Italic"><i className="ti ti-italic" /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => exec('underline')} title="Underline"><i className="ti ti-underline" /></button>
              <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
              <button className="btn btn-ghost btn-sm" onClick={() => exec('formatBlock', '<h1>')} title="Titlu mare">H1</button>
              <button className="btn btn-ghost btn-sm" onClick={() => exec('formatBlock', '<h2>')} title="Titlu mediu">H2</button>
              <button className="btn btn-ghost btn-sm" onClick={() => exec('formatBlock', '<p>')} title="Paragraf normal"><i className="ti ti-text-size" /></button>
              <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
              <button className="btn btn-ghost btn-sm" onClick={() => exec('insertUnorderedList')} title="Listă"><i className="ti ti-list" /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => exec('insertOrderedList')} title="Listă numerotată"><i className="ti ti-list-numbers" /></button>
              <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
              <button className="btn btn-ghost btn-sm" onClick={() => exec('justifyLeft')} title="Aliniere stânga"><i className="ti ti-align-left" /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => exec('justifyCenter')} title="Centrat"><i className="ti ti-align-center" /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => exec('justifyRight')} title="Aliniere dreapta"><i className="ti ti-align-right" /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => exec('justifyFull')} title="Justify"><i className="ti ti-align-justified" /></button>
            </div>

            {/* Editor content */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: continut }}
              style={{
                background: 'white', border: '1px solid var(--border)', borderTop: 'none',
                borderRadius: '0 0 10px 10px', padding: '40px 50px', minHeight: 500,
                fontSize: 14, lineHeight: 1.7, fontFamily: "'Times New Roman', serif",
                outline: 'none', boxShadow: '0 1px 3px rgba(0,0,0,.05)'
              }}
            />

            {/* Acțiuni footer */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setTab('drafturi')}>
                <i className="ti ti-arrow-left" /> Înapoi la listă
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={handleExportDocx}>
                  <i className="ti ti-download" /> Exportă DOCX
                </button>
                <button className="btn btn-ghost" onClick={() => handleSaveDraft('ciorna')} disabled={saving}>
                  <i className="ti ti-device-floppy" /> Salvează ciornă
                </button>
                <button className="btn btn-primary" onClick={() => handleSaveDraft('finalizat')} disabled={saving}>
                  <i className="ti ti-check" /> {saving ? 'Se salvează...' : 'Finalizează'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal serie nouă ─────────────────────────────────────── */}
      {modalSerie && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalSerie(false)}>
          <div className="modal-box" style={{ width: 420 }}>
            <div className="modal-head">
              <h3>Serie nouă de numerotare</h3>
              <button className="modal-close" onClick={() => setModalSerie(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nume serie</label>
                <input value={numeSerie} onChange={e => setNumeSerie(e.target.value)}
                  placeholder="ex. PJ-2025, PF-2025, Garaj-2025" autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAddSerie()} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalSerie(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleAddSerie}><i className="ti ti-plus" /> Adaugă</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
