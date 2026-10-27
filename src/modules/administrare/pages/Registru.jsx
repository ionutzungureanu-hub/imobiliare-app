import { useEffect, useMemo, useState, useCallback } from 'react'
import { useToast } from '../../../shared/components/Toast'
import {
  getRegistru, saveRegistruRand, deleteRegistruRand, getNextNumarSerie,
  getClienti, getSpatii, getImobile, addClient, setEntitateRegistru,
} from '../../../shared/firebase/firestore'
import { mesajEroare } from '../../../shared/utils/eroare'
import { azi, esteActiv, listaEntitati, ENTITATI_IMPLICITE } from '../services/registruUtils'

const normCui = v => String(v || '').toUpperCase().replace(/\s|-/g, '').replace(/^RO/, '')
const normCnp = v => String(v || '').replace(/\D/g, '')
const fmtData = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const zileLa = d => d ? Math.ceil((new Date(d + 'T00:00:00') - new Date(azi() + 'T00:00:00')) / 86400000) : null

const gol = tip => ({
  registru: tip, serieId: '', numar: '', identificator: '', clientId: '', nume: '', administrator: '',
  spatiuId: '', entitate: '', dataStart: '', dataFinal: '', activManual: null,
  chirie: '', moneda: 'EUR', garantie: '', indexare: '', observatii: '',
})

// Definit în afara componentei, altfel inputurile pierd focusul la fiecare tastă
const Camp = ({ label, children, full }) => (
  <div className={`form-group${full ? ' full' : ''}`}><label>{label}</label>{children}</div>
)

export default function Registru({ tip, serii }) {
  const toast = useToast()
  const comercial = tip === 'comercial'
  const idLabel = comercial ? 'CUI' : 'CNP'

  const [rows, setRows] = useState([])
  const [clienti, setClienti] = useState([])
  const [spatii, setSpatii] = useState([])
  const [imobile, setImobile] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtru, setFiltru] = useState('active')
  const [cauta, setCauta] = useState('')
  const [sortare, setSortare] = useState({ camp: 'dataFinal', dir: 'asc' })
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [lookupMsg, setLookupMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c, s, i] = await Promise.all([getRegistru(tip), getClienti(), getSpatii(), getImobile()])
      setRows(r); setClienti(c); setSpatii(s); setImobile(i)
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Încărcarea registrului a eșuat'), 'error') }
    setLoading(false)
  }, [tip])
  useEffect(() => { load() }, [load])

  const imobilDe = useMemo(() => Object.fromEntries(imobile.map(i => [i.id, i])), [imobile])
  const spatiuLabel = id => {
    const s = spatii.find(x => x.id === id); if (!s) return '—'
    const im = imobilDe[s.imobilId]
    return im ? `${im.nume} · ${s.denumire || ''}` : (s.denumire || '—')
  }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Căutare client după CUI / CNP și completare automată ──
  const cautaClient = () => {
    if (!form) return
    const brut = form.identificator
    const n = comercial ? normCui(brut) : normCnp(brut)
    if (!n) { setLookupMsg(''); return }
    const c = clienti.find(x => (comercial ? normCui(x.cui) : normCnp(x.cnp)) === n)
    if (!c) { setLookupMsg(`Clientul cu acest ${idLabel} nu există. Completează manual sau creează clientul.`); setForm(f => ({ ...f, clientId: '' })); return }
    const admin = (c.contacte || []).find(x => /administrator/i.test(x.functie || '')) || (c.contacte || [])[0]
    const spatiiClient = spatii.filter(s => (s.clienti || []).some(a => a.clientId === c.id))
    setForm(f => {
      const sp = f.spatiuId ? spatii.find(s => s.id === f.spatiuId) : (spatiiClient.length === 1 ? spatiiClient[0] : null)
      const asoc = sp ? (sp.clienti || []).find(a => a.clientId === c.id) : null
      return {
        ...f, clientId: c.id, nume: f.nume || c.nume || '',
        administrator: f.administrator || admin?.nume || '',
        spatiuId: sp?.id || f.spatiuId,
        dataStart: f.dataStart || asoc?.dataStart || '', dataFinal: f.dataFinal || asoc?.dataFinal || '',
      }
    })
    setLookupMsg(`Client găsit: ${c.nume}${spatiiClient.length > 1 ? ' — are mai multe spații, alege-l pe cel potrivit.' : ''}`)
  }

  const preiaDinSpatiu = () => {
    const sp = spatii.find(s => s.id === form.spatiuId)
    const asoc = sp && (sp.clienti || []).find(a => a.clientId === form.clientId)
    if (!asoc) { toast('Clientul nu este asociat acestui spațiu.', 'error'); return }
    setForm(f => ({ ...f, dataStart: asoc.dataStart || '', dataFinal: asoc.dataFinal || '' }))
    toast('Datele au fost preluate din spațiu.')
  }

  const genereazaNumar = async () => {
    const serie = serii.find(s => s.id === form.serieId)
    if (!serie) { toast('Alege o serie de numerotare.', 'error'); return }
    try {
      const nr = await getNextNumarSerie(serie.id)
      set('numar', `${serie.nume}/${String(nr).padStart(3, '0')}`)
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Generarea numărului a eșuat'), 'error') }
  }

  const creeazaClient = async () => {
    if (!form.nume.trim()) { toast('Completează numele.', 'error'); return }
    try {
      const base = comercial
        ? { tip: 'PJ', activ: true, nume: form.nume.trim(), cui: form.identificator.trim(), regCom: '', adresa: '',
            contacte: [{ nume: form.administrator || '', functie: 'Administrator', telefon: '', whatsapp: '', trimiteMesaj: false }], emailuri: [] }
        : { tip: 'PF', activ: true, nume: form.nume.trim(), cnp: form.identificator.trim(), adresa: '',
            telefon: '', email: '', whatsapp: '', spatiu: '', spatiuId: '', contacte: [], emailuri: [] }
      const spSel = spatii.find(x => x.id === form.spatiuId)
      const ref = await addClient(spSel?.imobilId ? { ...base, imobile: [spSel.imobilId] } : base)
      setClienti(l => [...l, { ...base, id: ref.id }])
      set('clientId', ref.id)
      setLookupMsg('Client creat și legat de contract.')
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Crearea clientului a eșuat'), 'error') }
  }

  const salveaza = async () => {
    if (!form.nume.trim()) { toast('Completează numele.', 'error'); return }
    if (form.dataStart && form.dataFinal && form.dataFinal < form.dataStart) { toast('Data final este înaintea datei de început.', 'error'); return }
    if (form.spatiuId) {
      const dublura = rows.find(r => r.id !== form.id && r.spatiuId === form.spatiuId && esteActiv(r))
      if (dublura && esteActiv(form) && !confirm(`Spațiul are deja un contract activ (${dublura.numar || dublura.nume}). Salvezi oricum?`)) return
    }
    setSaving(true)
    try {
      const sp = spatii.find(s => s.id === form.spatiuId)
      await saveRegistruRand({ ...form, imobilId: sp?.imobilId || '' })
      toast('Contract salvat în registru.')
      setForm(null); setLookupMsg(''); load()
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Salvarea a eșuat'), 'error') }
    setSaving(false)
  }

  const sterge = async r => {
    if (!confirm(`Ștergi din registru contractul ${r.numar || r.nume}?`)) return
    try { await deleteRegistruRand(r.id); toast('Rând șters.'); load() }
    catch (e) { console.error(e); toast(mesajEroare(e, 'Ștergerea a eșuat'), 'error') }
  }

  // Aliniază datele registrului cu cele din spații (sursa: spații)
  const sincronizeaza = async () => {
    const diferite = rows.filter(r => {
      const sp = spatii.find(s => s.id === r.spatiuId)
      const a = sp && (sp.clienti || []).find(x => x.clientId === r.clientId)
      return a && ((a.dataStart || '') !== (r.dataStart || '') || (a.dataFinal || '') !== (r.dataFinal || ''))
    })
    if (!diferite.length) { toast('Registrul este deja sincronizat cu spațiile.'); return }
    if (!confirm(`${diferite.length} contracte au date diferite față de spații. Preiei datele din spații?`)) return
    try {
      for (const r of diferite) {
        const a = spatii.find(s => s.id === r.spatiuId).clienti.find(x => x.clientId === r.clientId)
        await saveRegistruRand({ ...r, dataStart: a.dataStart || '', dataFinal: a.dataFinal || '' })
      }
      toast(`${diferite.length} contracte sincronizate.`); load()
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Sincronizarea a eșuat'), 'error') }
  }

  const seteazaEntitateLipsa = async () => {
    const fara = rows.filter(r => !r.entitate)
    const nume = prompt(`Cine facturează/încasează pentru cele ${fara.length} contracte fără entitate?\n(ex. ${ENTITATI_IMPLICITE.join(' sau ')})`, ENTITATI_IMPLICITE[0])
    if (!nume || !nume.trim()) return
    try { await setEntitateRegistru(fara.map(r => r.id), nume.trim()); toast('Entitate setată.'); load() }
    catch (e) { console.error(e); toast(mesajEroare(e, 'Setarea entității a eșuat'), 'error') }
  }

  const entitati = useMemo(() => listaEntitati(rows), [rows])
  const alegeEntitate = v => {
    if (v !== '__nou') { set('entitate', v); return }
    const nume = prompt('Numele entității care facturează/încasează:')
    if (nume && nume.trim()) set('entitate', nume.trim())
  }

  const vizibile = useMemo(() => {
    const t = cauta.trim().toLowerCase()
    return rows
      .filter(r => filtru === 'toate' || (filtru === 'active' ? esteActiv(r) : !esteActiv(r)))
      .filter(r => !t || [r.numar, r.identificator, r.nume, r.administrator, r.entitate, spatiuLabel(r.spatiuId)].some(v => String(v || '').toLowerCase().includes(t)))
      .sort((a, b) => {
        const m = sortare.dir === 'asc' ? 1 : -1
        if (sortare.camp === 'numar') {
          // Rândurile fără număr rămân la final, indiferent de direcție
          if (!a.numar && !b.numar) return 0
          if (!a.numar) return 1
          if (!b.numar) return -1
          return m * String(a.numar).localeCompare(String(b.numar), 'ro', { numeric: true, sensitivity: 'base' })
        }
        if (!a.dataFinal && !b.dataFinal) return 0
        if (!a.dataFinal) return 1
        if (!b.dataFinal) return -1
        return m * a.dataFinal.localeCompare(b.dataFinal)
      })
  }, [rows, filtru, cauta, spatii, imobile, sortare])

  const sorteazaDupa = camp => setSortare(s => s.camp === camp ? { camp, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { camp, dir: 'asc' })
  const sageata = camp => sortare.camp === camp ? (sortare.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const nrActive = rows.filter(esteActiv).length
  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(gol(tip)); setLookupMsg('') }}>
          <i className="ti ti-plus" /> Contract în registru
        </button>
        <button className="btn btn-ghost btn-sm" onClick={sincronizeaza} title="Preia datele contractelor din spații">
          <i className="ti ti-refresh" /> Sincronizează cu spațiile
        </button>
        {rows.some(r => !r.entitate) && (
          <button className="btn btn-ghost btn-sm" onClick={seteazaEntitateLipsa} title="Setează cine încasează pentru contractele care nu au entitate">
            <i className="ti ti-building-bank" /> Setează entitate ({rows.filter(r => !r.entitate).length} fără)
          </button>
        )}
        <input placeholder="Caută în registru…" value={cauta} onChange={e => setCauta(e.target.value)} style={{ maxWidth: 240 }} />
        <select value={`${sortare.camp}:${sortare.dir}`} onChange={e => { const [camp, dir] = e.target.value.split(':'); setSortare({ camp, dir }) }} style={{ maxWidth: 230 }}>
          <option value="dataFinal:asc">Expirare: cele mai apropiate întâi</option>
          <option value="dataFinal:desc">Expirare: cele mai îndepărtate întâi</option>
          <option value="numar:asc">Număr contract: crescător</option>
          <option value="numar:desc">Număr contract: descrescător</option>
        </select>
        <select value={filtru} onChange={e => setFiltru(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="active">Active ({nrActive})</option>
          <option value="inactive">Inactive ({rows.length - nrActive})</option>
          <option value="toate">Toate ({rows.length})</option>
        </select>
      </div>

      {loading ? (
        <div className="empty"><i className="ti ti-refresh" /><p>Se încarcă registrul...</p></div>
      ) : vizibile.length === 0 ? (
        <div className="card"><div className="empty"><i className="ti ti-list-details" /><p>Niciun contract în acest registru.</p></div></div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr>
              <th onClick={() => sorteazaDupa('numar')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sortează după număr">Nr. contract{sageata('numar')}</th><th>{idLabel}</th><th>{comercial ? 'Firmă' : 'Nume'}</th>
              {comercial && <th>Administrator</th>}
              <th>Încasează</th><th>Spațiu</th><th>Început</th><th onClick={() => sorteazaDupa('dataFinal')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sortează după data expirării">Final{sageata('dataFinal')}</th><th>Chirie</th><th>Stare</th><th></th>
            </tr></thead>
            <tbody>
              {vizibile.map(r => {
                const zile = zileLa(r.dataFinal)
                const activ = esteActiv(r)
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--blue)' }}>{r.numar || '—'}</td>
                    <td>{r.identificator || '—'}</td>
                    <td>{r.nume}</td>
                    {comercial && <td>{r.administrator || '—'}</td>}
                    <td style={{ fontSize: 12 }}>{r.entitate || <span style={{ color: '#8A5A12' }}>—</span>}</td>
                    <td style={{ fontSize: 12 }}>{spatiuLabel(r.spatiuId)}</td>
                    <td>{fmtData(r.dataStart)}</td>
                    <td>
                      {fmtData(r.dataFinal)}
                      {activ && zile !== null && zile <= 60 && (
                        <div style={{ fontSize: 11, color: zile <= 30 ? '#9B2C2C' : '#8A5A12' }}>expiră în {zile} zile</div>
                      )}
                    </td>
                    <td>{r.chirie ? `${r.chirie} ${r.moneda || ''}` : '—'}</td>
                    <td><span className={`badge ${activ ? 'badge-green' : 'badge-gray'}`}>{activ ? 'Activ' : 'Inactiv'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ ...gol(tip), ...r }); setLookupMsg('') }}><i className="ti ti-pencil" /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => sterge(r)}><i className="ti ti-trash" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div className="modal-box" style={{ width: 680 }}>
            <div className="modal-head">
              <h3>{form.id ? 'Editează contract' : 'Contract nou'} — registru {comercial ? 'comercial' : 'rezidențial'}</h3>
              <button className="modal-close" onClick={() => setForm(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <Camp label={`${idLabel} (completează automat datele)`} full>
                  <input value={form.identificator} onChange={e => set('identificator', e.target.value)}
                    onBlur={cautaClient} onKeyDown={e => e.key === 'Enter' && cautaClient()}
                    placeholder={comercial ? 'ex. RO12345678' : 'CNP'} autoFocus />
                  {lookupMsg && <div style={{ fontSize: 12, marginTop: 4, color: lookupMsg.startsWith('Client găsit') || lookupMsg.startsWith('Client creat') ? '#2F6F4F' : '#8A5A12' }}>{lookupMsg}</div>}
                </Camp>
                <Camp label={comercial ? 'Nume firmă' : 'Nume'}>
                  <input value={form.nume} onChange={e => set('nume', e.target.value)} />
                </Camp>
                {comercial && (
                  <Camp label="Administrator"><input value={form.administrator} onChange={e => set('administrator', e.target.value)} /></Camp>
                )}
                {!form.clientId && form.nume && form.identificator && (
                  <Camp label=" " full>
                    <button className="btn btn-ghost btn-sm" onClick={creeazaClient}><i className="ti ti-user-plus" /> Creează client din aceste date</button>
                  </Camp>
                )}
                <Camp label="Serie numerotare">
                  <select value={form.serieId} onChange={e => set('serieId', e.target.value)}>
                    <option value="">— fără serie —</option>
                    {serii.map(s => <option key={s.id} value={s.id}>{s.nume}</option>)}
                  </select>
                </Camp>
                <Camp label="Număr contract">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={form.numar} onChange={e => set('numar', e.target.value)} placeholder="ex. PJ-2026/012" />
                    {!form.numar && form.serieId && <button className="btn btn-ghost btn-sm" onClick={genereazaNumar}>Generează</button>}
                  </div>
                </Camp>
                <Camp label="Spațiu (un contract = un spațiu)" full>
                  <select value={form.spatiuId} onChange={e => set('spatiuId', e.target.value)}>
                    <option value="">— alege spațiul —</option>
                    {spatii.map(s => <option key={s.id} value={s.id}>{spatiuLabel(s.id)}</option>)}
                  </select>
                </Camp>
                <Camp label="Cine facturează / încasează" full>
                  <select value={form.entitate} onChange={e => alegeEntitate(e.target.value)}>
                    <option value="">— alege entitatea —</option>
                    {[...new Set([...entitati, form.entitate].filter(Boolean))].map(n => <option key={n} value={n}>{n}</option>)}
                    <option value="__nou">+ Entitate nouă…</option>
                  </select>
                </Camp>
                <Camp label="Data început"><input type="date" value={form.dataStart} onChange={e => set('dataStart', e.target.value)} /></Camp>
                <Camp label="Data finalizare"><input type="date" value={form.dataFinal} onChange={e => set('dataFinal', e.target.value)} /></Camp>
                {form.clientId && form.spatiuId && (
                  <Camp label=" " full>
                    <button className="btn btn-ghost btn-sm" onClick={preiaDinSpatiu}><i className="ti ti-download" /> Preia datele din spațiu</button>
                  </Camp>
                )}
                <Camp label="Stare contract">
                  <select value={form.activManual === true ? 'da' : form.activManual === false ? 'nu' : 'auto'}
                    onChange={e => set('activManual', e.target.value === 'da' ? true : e.target.value === 'nu' ? false : null)}>
                    <option value="auto">Automat (după data de final)</option>
                    <option value="da">Activ (prelungit / în vigoare)</option>
                    <option value="nu">Inactiv (reziliat / încheiat)</option>
                  </select>
                </Camp>
                <Camp label="Chirie lunară">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" value={form.chirie} onChange={e => set('chirie', e.target.value)} />
                    <select value={form.moneda} onChange={e => set('moneda', e.target.value)} style={{ maxWidth: 90 }}>
                      <option>EUR</option><option>RON</option>
                    </select>
                  </div>
                </Camp>
                <Camp label="Garanție"><input type="number" value={form.garantie} onChange={e => set('garantie', e.target.value)} /></Camp>
                <Camp label="Indexare"><input value={form.indexare} onChange={e => set('indexare', e.target.value)} placeholder="ex. IPC anual, 5% / an" /></Camp>
                <Camp label="Observații" full><textarea rows={2} value={form.observatii} onChange={e => set('observatii', e.target.value)} /></Camp>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={salveaza} disabled={saving}>
                <i className="ti ti-device-floppy" /> {saving ? 'Se salvează…' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
