import { Fragment, useEffect, useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import {
  getClienti, getSpatii, getImobile, getRegistru,
  getExpeditori, saveExpeditor, deleteExpeditor,
  getTemplateEmail, saveTemplateEmail, deleteTemplateEmail,
  getComunicari, addComunicare,
} from '../../../shared/firebase/firestore'
import { mesajEroare } from '../../../shared/utils/eroare'
import { esteActiv } from '../services/registruUtils'
import {
  statusServerEmail, trimiteEmailServer, aplicaVariabile, textLaHtml, VARIABILE, SABLOANE_EXEMPLU,
} from '../../../shared/services/comunicareService'

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/
const fmtData = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const fmtTs = t => t?.seconds ? new Date(t.seconds * 1000).toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const azi = () => new Date().toISOString().slice(0, 10)
const zileLa = d => d ? Math.ceil((new Date(d + 'T00:00:00') - new Date(azi() + 'T00:00:00')) / 86400000) : null

// Adresele de email ale unui client (cele marcate "trimite mail"; dacă nu e niciuna marcată, toate)
export const adreseClient = c => {
  const principale = [c.email].filter(Boolean)
  const extra = c.emailuri || []
  const marcate = extra.filter(e => e.trimiteMail).map(e => e.adresa)
  const toate = extra.map(e => e.adresa)
  const lista = [...principale, ...(marcate.length ? marcate : toate)]
  return [...new Set(lista.map(a => String(a || '').trim()).filter(a => EMAIL_RE.test(a)))]
}

const Camp = ({ label, children, full }) => (
  <div className={`form-group${full ? ' full' : ''}`}><label>{label}</label>{children}</div>
)

export default function Comunicare() {
  const toast = useToast()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [tab, setTab] = useState('compune')
  const [loading, setLoading] = useState(true)
  const [clienti, setClienti] = useState([])
  const [spatii, setSpatii] = useState([])
  const [imobile, setImobile] = useState([])
  const [registru, setRegistru] = useState([])
  const [expeditori, setExpeditori] = useState([])
  const [sabloane, setSabloane] = useState([])
  const [istoric, setIstoric] = useState([])
  const [server, setServer] = useState(null) // {cheie, domeniu, test} | {eroare}

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, s, i, rc, rr, e, t, h] = await Promise.all([
        getClienti(), getSpatii(), getImobile(), getRegistru('comercial'), getRegistru('rezidential'),
        getExpeditori(), getTemplateEmail(), getComunicari(),
      ])
      setClienti(c); setSpatii(s); setImobile(i); setRegistru([...rc, ...rr]); setExpeditori(e); setSabloane(t); setIstoric(h)
    } catch (err) { console.error(err); toast(mesajEroare(err, 'Încărcarea a eșuat'), 'error') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    statusServerEmail().then(setServer).catch(e => setServer({ eroare: e.message }))
  }, [])

  const spatiuLabel = id => {
    const s = spatii.find(x => x.id === id); if (!s) return ''
    const im = imobile.find(x => x.id === s.imobilId)
    return im ? `${im.nume} · ${s.denumire || ''}` : (s.denumire || '')
  }

  const Tab = ({ id, icon, children }) => (
    <button onClick={() => setTab(id)} style={{
      padding: '9px 20px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer',
      borderBottom: `2px solid ${tab === id ? 'var(--blue)' : 'transparent'}`, color: tab === id ? 'var(--blue)' : 'var(--slate)',
      marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
    }}><i className={`ti ${icon}`} /> {children}</button>
  )

  const bannerServer = server && (server.eroare || !server.cheie || (!server.domeniu && !server.test)) && (
    <div style={{ background: '#F8F1DF', border: '1px solid #E3C77D', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
      ⚠ Trimiterea de email nu este încă configurată pe server
      {server.eroare ? ` (${server.eroare})` : ' (lipsește cheia API sau domeniul)'}. Poți pregăti șabloane și expeditori, dar mesajele nu pot fi trimise până nu urmezi pașii din ghidul de configurare.
    </div>
  )

  return (
    <>
      <Topbar title="Comunicare" subtitle="Email către clienți" />
      <div className="content">
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          <Tab id="compune" icon="ti-send">Compune</Tab>
          <Tab id="istoric" icon="ti-history">Istoric ({istoric.length})</Tab>
          <Tab id="sabloane" icon="ti-template">Șabloane ({sabloane.length})</Tab>
          <Tab id="expeditori" icon="ti-at">Expeditori ({expeditori.length})</Tab>
        </div>
        {bannerServer}
        {loading ? <div className="empty"><i className="ti ti-refresh" /><p>Se încarcă...</p></div> : (
          <>
            {tab === 'compune' && <Compune {...{ clienti, registru, expeditori, sabloane, spatiuLabel, user, server, toast, reload: load, clientInitial: params.get('client') }} />}
            {tab === 'istoric' && <Istoric {...{ istoric, clienti, clientInitial: params.get('client') || '' }} />}
            {tab === 'sabloane' && <Sabloane {...{ sabloane, toast, reload: load }} />}
            {tab === 'expeditori' && <Expeditori {...{ expeditori, server, toast, reload: load }} />}
          </>
        )}
      </div>
    </>
  )
}

// ───────────────────────── COMPUNE ─────────────────────────
function Compune({ clienti, registru, expeditori, sabloane, spatiuLabel, user, server, toast, reload, clientInitial }) {
  const active = expeditori.filter(e => e.activ !== false)
  const [expId, setExpId] = useState(active[0]?.id || '')
  const [sablonId, setSablonId] = useState('')
  const [subiect, setSubiect] = useState('')
  const [corp, setCorp] = useState('')
  const [sel, setSel] = useState(() => new Set(clientInitial ? [clientInitial] : []))
  const [manual, setManual] = useState('')
  const [cauta, setCauta] = useState('')
  const [tipF, setTipF] = useState('toti')
  const [expiraF, setExpiraF] = useState('toate')
  const [sending, setSending] = useState(false)
  const [progres, setProgres] = useState(null)

  const contractClient = id => {
    const r = registru.filter(x => x.clientId === id)
    return r.find(esteActiv) || r[0] || null
  }

  const vizibili = useMemo(() => {
    const t = cauta.trim().toLowerCase()
    return clienti
      .filter(c => c.activ !== false)
      .filter(c => tipF === 'toti' || (c.tip || 'PJ') === tipF)
      .filter(c => !t || [c.nume, c.cui, c.cnp].some(v => String(v || '').toLowerCase().includes(t)))
      .filter(c => {
        if (expiraF === 'toate') return true
        const k = contractClient(c.id); const z = k && esteActiv(k) ? zileLa(k.dataFinal) : null
        return z !== null && z <= Number(expiraF) && z >= 0
      })
      .sort((a, b) => String(a.nume).localeCompare(String(b.nume), 'ro'))
  }, [clienti, registru, cauta, tipF, expiraF])

  const exp = expeditori.find(e => e.id === expId)
  const alegeSablon = id => {
    setSablonId(id)
    const s = sabloane.find(x => x.id === id)
    if (s) { setSubiect(s.subiect || ''); setCorp(s.corp || '') }
  }

  const variabile = (c) => {
    const k = c ? contractClient(c.id) : null
    const admin = c ? ((c.contacte || []).find(x => /administrator/i.test(x.functie || '')) || (c.contacte || [])[0]) : null
    return {
      nume: c?.nume || '', administrator: admin?.nume || k?.administrator || '',
      numar_contract: k?.numar || '', data_start: fmtData(k?.dataStart), data_final: fmtData(k?.dataFinal),
      chirie: k?.chirie ? `${k.chirie} ${k.moneda || ''}`.trim() : '', spatiu: k ? spatiuLabel(k.spatiuId) : '',
      entitate: k?.entitate || '', expeditor: exp?.nume || '',
    }
  }

  const compuneMesaj = (c) => {
    const v = variabile(c)
    const subj = aplicaVariabile(subiect, v)
    let text = aplicaVariabile(corp, v)
    if (exp?.semnatura) text += `\n\n-- \n${exp.semnatura}`
    return { subj, text, html: textLaHtml(text) }
  }

  // Destinatari: clienții selectați + adrese manuale
  const destinatari = useMemo(() => {
    const lista = clienti.filter(c => sel.has(c.id)).map(c => ({ client: c, adrese: adreseClient(c) }))
    const extra = manual.split(/[,;\s]+/).map(a => a.trim()).filter(a => EMAIL_RE.test(a))
    extra.forEach(a => lista.push({ client: null, adrese: [a] }))
    return lista
  }, [clienti, sel, manual])
  const fara = destinatari.filter(d => !d.adrese.length)
  const dePtTrimis = destinatari.filter(d => d.adrese.length)
  const primul = dePtTrimis[0]

  const toggle = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selecteazaVizibili = () => setSel(s => { const n = new Set(s); vizibili.forEach(c => n.add(c.id)); return n })

  const trimite = async () => {
    if (!exp) { toast('Alege expeditorul.', 'error'); return }
    if (!subiect.trim() || !corp.trim()) { toast('Completează subiectul și mesajul.', 'error'); return }
    if (!dePtTrimis.length) { toast('Niciun destinatar cu adresă de email.', 'error'); return }
    if (!confirm(`Trimiți mesajul către ${dePtTrimis.length} ${dePtTrimis.length === 1 ? 'destinatar' : 'destinatari'}, de pe ${exp.email}?`)) return
    setSending(true)
    const lotId = `lot_${Date.now()}`
    let ok = 0, esuate = []
    for (let i = 0; i < dePtTrimis.length; i++) {
      const d = dePtTrimis[i]
      setProgres(`${i + 1} / ${dePtTrimis.length}`)
      const m = compuneMesaj(d.client)
      let stare = 'trimis', eroare = ''
      try {
        await trimiteEmailServer({ fromEmail: exp.email, fromName: exp.nume, replyTo: exp.replyTo || exp.email, to: d.adrese, subject: m.subj, html: m.html, text: m.text })
        ok++
      } catch (e) { stare = 'esuat'; eroare = e.message; esuate.push(`${d.client?.nume || d.adrese[0]}: ${e.message}`) }
      try {
        await addComunicare({
          clientId: d.client?.id || '', clientNume: d.client?.nume || '', toEmail: d.adrese.join(', '),
          subiect: m.subj, mesaj: m.text, trimisde: user?.email || '', expeditorId: exp.id, expeditorEmail: exp.email,
          sablonId: sablonId || '', lotId, stare, eroare, tip: 'mesaj',
        })
      } catch (e) { console.error('log comunicare', e) }
      await new Promise(r => setTimeout(r, 400))
    }
    setSending(false); setProgres(null)
    if (esuate.length) alert(`Trimise: ${ok}. Eșuate: ${esuate.length}\n\n${esuate.join('\n')}`)
    else toast(`Mesaj trimis către ${ok} ${ok === 1 ? 'destinatar' : 'destinatari'}.`)
    reload()
  }

  if (!active.length) return (
    <div className="card"><div className="empty"><i className="ti ti-at" /><p>Adaugă mai întâi un expeditor, în fila <strong>Expeditori</strong>.</p></div></div>
  )

  const prev = primul ? compuneMesaj(primul.client) : null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.2fr)', gap: 16, alignItems: 'start' }}>
      {/* Destinatari */}
      <div className="card">
        <div className="card-header"><div className="card-title">Destinatari ({dePtTrimis.length}{fara.length ? `, ${fara.length} fără email` : ''})</div></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <input placeholder="Caută client…" value={cauta} onChange={e => setCauta(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
            <select value={tipF} onChange={e => setTipF(e.target.value)} style={{ maxWidth: 90 }}>
              <option value="toti">Toți</option><option value="PJ">Firme</option><option value="PF">PF</option>
            </select>
            <select value={expiraF} onChange={e => setExpiraF(e.target.value)} style={{ maxWidth: 160 }}>
              <option value="toate">Orice contract</option><option value="30">Expiră în 30 zile</option><option value="60">Expiră în 60 zile</option><option value="90">Expiră în 90 zile</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={selecteazaVizibili}>Selectează vizibili</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSel(new Set())}>Deselectează</button>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            {vizibili.length === 0 && <div style={{ padding: 14, fontSize: 13, color: 'var(--slate)' }}>Niciun client.</div>}
            {vizibili.map(c => {
              const ad = adreseClient(c); const k = contractClient(c.id); const z = k && esteActiv(k) ? zileLa(k.dataFinal) : null
              return (
                <label key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} style={{ marginTop: 3 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nume} <span style={{ fontSize: 11, color: 'var(--slate)' }}>{c.tip || 'PJ'}</span></div>
                    <div style={{ fontSize: 12, color: ad.length ? 'var(--slate)' : '#8A5A12' }}>{ad.length ? ad.join(', ') : 'fără adresă de email'}</div>
                    {z !== null && z <= 90 && z >= 0 && <div style={{ fontSize: 11, color: z <= 30 ? '#9B2C2C' : '#8A5A12' }}>contract expiră în {z} zile</div>}
                  </div>
                </label>
              )
            })}
          </div>
          <Camp label="Alte adrese (separate prin virgulă)"><input value={manual} onChange={e => setManual(e.target.value)} placeholder="nume@exemplu.ro" /></Camp>
          {fara.length > 0 && <div style={{ fontSize: 12, color: '#8A5A12', marginTop: 8 }}>Fără email (nu primesc mesaj): {fara.map(d => d.client?.nume).filter(Boolean).join(', ')}</div>}
        </div>
      </div>

      {/* Mesaj */}
      <div className="card">
        <div className="card-header"><div className="card-title">Mesaj</div></div>
        <div className="card-body">
          <div className="form-grid">
            <Camp label="De la">
              <select value={expId} onChange={e => setExpId(e.target.value)}>
                {active.map(e => <option key={e.id} value={e.id}>{e.nume} &lt;{e.email}&gt;</option>)}
              </select>
            </Camp>
            <Camp label="Șablon">
              <select value={sablonId} onChange={e => alegeSablon(e.target.value)}>
                <option value="">— fără șablon —</option>
                {sabloane.map(s => <option key={s.id} value={s.id}>{s.nume}</option>)}
              </select>
            </Camp>
            <Camp label="Subiect" full><input value={subiect} onChange={e => setSubiect(e.target.value)} /></Camp>
            <Camp label="Mesaj" full><textarea rows={9} value={corp} onChange={e => setCorp(e.target.value)} /></Camp>
          </div>
          <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 6 }}>
            Variabile: {VARIABILE.map(([k]) => `{{${k}}}`).join('  ')}
          </div>
          {prev && (
            <div style={{ marginTop: 14, border: '1px dashed var(--border)', borderRadius: 8, padding: 12, background: '#F7F5F0' }}>
              <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 6 }}>Previzualizare pentru: {primul.client?.nume || primul.adrese[0]}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{prev.subj || '(fără subiect)'}</div>
              <div dangerouslySetInnerHTML={{ __html: prev.html }} />
            </div>
          )}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-primary" onClick={trimite} disabled={sending || !dePtTrimis.length}>
              <i className="ti ti-send" /> {sending ? `Se trimite ${progres}…` : `Trimite (${dePtTrimis.length})`}
            </button>
            <span style={{ fontSize: 12, color: 'var(--slate)' }}>Fiecare destinatar primește un mesaj separat.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── ISTORIC ─────────────────────────
function Istoric({ istoric, clienti, clientInitial }) {
  const [clientF, setClientF] = useState(clientInitial)
  const [stareF, setStareF] = useState('toate')
  const [deschis, setDeschis] = useState(null)
  const lista = istoric.filter(h => (!clientF || h.clientId === clientF) && (stareF === 'toate' || h.stare === stareF))
  const clientiCuIstoric = clienti.filter(c => istoric.some(h => h.clientId === c.id))
  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={clientF} onChange={e => setClientF(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="">Toți clienții</option>
          {clientiCuIstoric.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
        </select>
        <select value={stareF} onChange={e => setStareF(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="toate">Toate</option><option value="trimis">Trimise</option><option value="esuat">Eșuate</option>
        </select>
      </div>
      {lista.length === 0 ? <div className="card"><div className="empty"><i className="ti ti-mail-off" /><p>Niciun mesaj în istoric.</p></div></div> : (
        <div className="card">
          <table>
            <thead><tr><th>Data</th><th>Client</th><th>Către</th><th>Subiect</th><th>De la</th><th>Stare</th></tr></thead>
            <tbody>
              {lista.map(h => (
                <Fragment key={h.id}>
                  <tr onClick={() => setDeschis(deschis === h.id ? null : h.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontSize: 12 }}>{fmtTs(h.trimisLa)}</td>
                    <td>{h.clientNume || '—'}</td>
                    <td style={{ fontSize: 12 }}>{h.toEmail}</td>
                    <td>{h.subiect}</td>
                    <td style={{ fontSize: 12 }}>{h.expeditorEmail || h.trimisde}</td>
                    <td><span className={`badge ${h.stare === 'esuat' ? 'badge-red' : 'badge-green'}`}>{h.stare === 'esuat' ? 'Eșuat' : 'Trimis'}</span></td>
                  </tr>
                  {deschis === h.id && (
                    <tr><td colSpan={6} style={{ background: '#F7F5F0' }}>
                      {h.eroare && <div style={{ color: '#9B2C2C', fontSize: 12, marginBottom: 6 }}>Eroare: {h.eroare}</div>}
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{h.mesaj}</div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ───────────────────────── ȘABLOANE ─────────────────────────
function Sabloane({ sabloane, toast, reload }) {
  const [form, setForm] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const salveaza = async () => {
    if (!form.nume?.trim() || !form.subiect?.trim()) { toast('Completează numele și subiectul.', 'error'); return }
    try { await saveTemplateEmail(form); toast('Șablon salvat.'); setForm(null); reload() }
    catch (e) { console.error(e); toast(mesajEroare(e, 'Salvarea a eșuat'), 'error') }
  }
  const sterge = async s => {
    if (!confirm(`Ștergi șablonul "${s.nume}"?`)) return
    try { await deleteTemplateEmail(s.id); reload() } catch (e) { console.error(e); toast(mesajEroare(e, 'Ștergerea a eșuat'), 'error') }
  }
  const adaugaExemple = async () => {
    try { for (const s of SABLOANE_EXEMPLU) await saveTemplateEmail(s); toast('Șabloane exemplu adăugate.'); reload() }
    catch (e) { console.error(e); toast(mesajEroare(e, 'Adăugarea a eșuat'), 'error') }
  }
  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setForm({ nume: '', categorie: '', subiect: '', corp: '' })}><i className="ti ti-plus" /> Șablon nou</button>
        {sabloane.length === 0 && <button className="btn btn-ghost btn-sm" onClick={adaugaExemple}>Adaugă șabloane exemplu</button>}
      </div>
      {sabloane.length === 0 ? <div className="card"><div className="empty"><i className="ti ti-template" /><p>Niciun șablon.</p></div></div> : (
        <div className="card"><table>
          <thead><tr><th>Nume</th><th>Categorie</th><th>Subiect</th><th></th></tr></thead>
          <tbody>{sabloane.map(s => (
            <tr key={s.id}><td style={{ fontWeight: 600 }}>{s.nume}</td><td>{s.categorie || '—'}</td><td>{s.subiect}</td>
              <td><div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...s })}><i className="ti ti-pencil" /></button>
                <button className="btn btn-danger btn-sm" onClick={() => sterge(s)}><i className="ti ti-trash" /></button>
              </div></td></tr>
          ))}</tbody>
        </table></div>
      )}
      {form && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div className="modal-box" style={{ width: 640 }}>
            <div className="modal-head"><h3>{form.id ? 'Editează șablon' : 'Șablon nou'}</h3><button className="modal-close" onClick={() => setForm(null)}><i className="ti ti-x" /></button></div>
            <div className="modal-body"><div className="form-grid">
              <Camp label="Nume șablon"><input value={form.nume} onChange={e => set('nume', e.target.value)} autoFocus /></Camp>
              <Camp label="Categorie"><input value={form.categorie || ''} onChange={e => set('categorie', e.target.value)} placeholder="ex. Contracte" /></Camp>
              <Camp label="Subiect" full><input value={form.subiect} onChange={e => set('subiect', e.target.value)} /></Camp>
              <Camp label="Mesaj" full><textarea rows={10} value={form.corp} onChange={e => set('corp', e.target.value)} /></Camp>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 8 }}>
              {VARIABILE.map(([k, d]) => <div key={k}><code>{`{{${k}}}`}</code> — {d}</div>)}
            </div></div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setForm(null)}>Anulează</button><button className="btn btn-primary" onClick={salveaza}>Salvează</button></div>
          </div>
        </div>
      )}
    </>
  )
}

// ───────────────────────── EXPEDITORI ─────────────────────────
function Expeditori({ expeditori, server, toast, reload }) {
  const [form, setForm] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const salveaza = async () => {
    if (!form.nume?.trim() || !EMAIL_RE.test(form.email || '')) { toast('Completează numele și o adresă de email validă.', 'error'); return }
    try { await saveExpeditor({ ...form, email: form.email.trim().toLowerCase() }); toast('Expeditor salvat.'); setForm(null); reload() }
    catch (e) { console.error(e); toast(mesajEroare(e, 'Salvarea a eșuat'), 'error') }
  }
  const sterge = async x => {
    if (!confirm(`Ștergi expeditorul ${x.email}?`)) return
    try { await deleteExpeditor(x.id); reload() } catch (e) { console.error(e); toast(mesajEroare(e, 'Ștergerea a eșuat'), 'error') }
  }
  const potrivit = email => !server || server.eroare || !server.cheie ? null
    : (server.domeniu && email.split('@')[1] === server.domeniu) || (server.test && email === 'onboarding@resend.dev')
  return (
    <>
      <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={() => setForm({ nume: '', email: '', replyTo: '', registru: 'ambele', semnatura: '', activ: true })}><i className="ti ti-plus" /> Expeditor nou</button>
        {server && !server.eroare && (
          <span style={{ fontSize: 12, color: 'var(--slate)' }}>
            Server: cheie {server.cheie ? '✓' : '✗'} · domeniu {server.domeniu || '✗'}{server.test ? ' · mod test' : ''}
          </span>
        )}
      </div>
      {expeditori.length === 0 ? <div className="card"><div className="empty"><i className="ti ti-at" /><p>Niciun expeditor.</p></div></div> : (
        <div className="card"><table>
          <thead><tr><th>Nume afișat</th><th>Adresă</th><th>Folosit pentru</th><th>Server</th><th>Stare</th><th></th></tr></thead>
          <tbody>{expeditori.map(x => {
            const p = potrivit(x.email)
            return (
              <tr key={x.id}>
                <td style={{ fontWeight: 600 }}>{x.nume}</td><td>{x.email}</td>
                <td>{x.registru === 'comercial' ? 'Comercial' : x.registru === 'rezidential' ? 'Rezidențial' : 'Ambele'}</td>
                <td>{p === null ? '—' : p ? <span className="badge badge-green">Gata de trimis</span> : <span className="badge badge-amber">Domeniu neconfigurat</span>}</td>
                <td><span className={`badge ${x.activ !== false ? 'badge-green' : 'badge-gray'}`}>{x.activ !== false ? 'Activ' : 'Inactiv'}</span></td>
                <td><div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...x })}><i className="ti ti-pencil" /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => sterge(x)}><i className="ti ti-trash" /></button>
                </div></td>
              </tr>
            )
          })}</tbody>
        </table></div>
      )}
      {form && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div className="modal-box" style={{ width: 560 }}>
            <div className="modal-head"><h3>{form.id ? 'Editează expeditor' : 'Expeditor nou'}</h3><button className="modal-close" onClick={() => setForm(null)}><i className="ti ti-x" /></button></div>
            <div className="modal-body"><div className="form-grid">
              <Camp label="Nume afișat (apare la destinatar)"><input value={form.nume} onChange={e => set('nume', e.target.value)} autoFocus /></Camp>
              <Camp label="Adresa de email (pe domeniul propriu)"><input value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@domeniu.ro" /></Camp>
              <Camp label="Adresă pentru răspunsuri (opțional)"><input value={form.replyTo || ''} onChange={e => set('replyTo', e.target.value)} placeholder="implicit: aceeași adresă" /></Camp>
              <Camp label="Folosit pentru">
                <select value={form.registru} onChange={e => set('registru', e.target.value)}>
                  <option value="ambele">Ambele registre</option><option value="comercial">Comercial</option><option value="rezidential">Rezidențial</option>
                </select>
              </Camp>
              <Camp label="Semnătură (se adaugă la sfârșitul mesajului)" full><textarea rows={4} value={form.semnatura || ''} onChange={e => set('semnatura', e.target.value)} /></Camp>
              <Camp label="Stare"><select value={form.activ === false ? 'nu' : 'da'} onChange={e => set('activ', e.target.value === 'da')}><option value="da">Activ</option><option value="nu">Inactiv</option></select></Camp>
            </div></div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setForm(null)}>Anulează</button><button className="btn btn-primary" onClick={salveaza}>Salvează</button></div>
          </div>
        </div>
      )}
    </>
  )
}
