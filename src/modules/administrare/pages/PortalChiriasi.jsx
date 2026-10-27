import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ref as stRef, getDownloadURL } from 'firebase/storage'
import { storage } from '../../../shared/firebase/config'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { mesajEroare } from '../../../shared/utils/eroare'
import {
  getImobile, getSpatii, getPortale, savePortal, setPortalActiv, genTokenPortal,
  getCereriPortal, updateCererePortal, deleteCererePortal, getIndexuriPrimite,
} from '../../../shared/firebase/firestore'

const TIPURI = { sesizare: 'Sesizare', informare: 'Informare', document: 'Document' }
const dataRo = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export default function PortalChiriasi() {
  const toast = useToast()
  const { canWrite, canAdmin } = useAuth()

  const [tab, setTab]         = useState('linkuri')
  const [imobile, setImobile] = useState([])
  const [spatii, setSpatii]   = useState([])
  const [portale, setPortale] = useState([])
  const [cereri, setCereri]   = useState([])
  const [indexuri, setIndexuri] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState('')
  const [copiat, setCopiat]   = useState('')
  const [filtruCereri, setFiltruCereri] = useState('nou')

  const load = async () => {
    setLoading(true)
    try {
      const [im, sp, po, ce, ix] = await Promise.all([getImobile(), getSpatii(), getPortale(), getCereriPortal(), getIndexuriPrimite('asteptare')])
      setImobile(im); setSpatii(sp); setPortale(po); setCereri(ce); setIndexuri(ix.length)
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const portalDe = useMemo(() => new Map(portale.map(p => [p.spatiuId, p])), [portale])
  const numeSpatiu = (id) => spatii.find(s => s.id === id)?.denumire || id
  const numeImobil = (id) => { const i = imobile.find(x => x.id === id); return i ? (i.nume || i.denumire) : '—' }
  const link = (p) => `${window.location.origin}/portal/${p.token}`
  const expirat = (p) => !!p.valabilPanaTs?.seconds && p.valabilPanaTs.seconds * 1000 < Date.now()

  const creeaza = async (sp) => {
    setBusy(sp.id)
    try {
      await savePortal({
        spatiuId: sp.id, imobilId: sp.imobilId, titlu: sp.denumire || '',
        adresare: 'Bună ziua! Puteți trimite indexurile lunare, documente sau o sesizare:',
        token: genTokenPortal(), activ: true,
      })
      toast('Link creat.'); await load()
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Nu s-a putut crea linkul'), 'error') }
    setBusy('')
  }
  const regenereaza = async (p) => {
    if (!confirm('Regenerezi linkul? Linkul vechi încetează să funcționeze și trebuie retrimis chiriașului.')) return
    setBusy(p.spatiuId)
    try {
      await savePortal({ ...p, token: genTokenPortal() })
      toast('Link nou generat.'); await load()
    } catch (e) { console.error(e); toast(mesajEroare(e), 'error') }
    setBusy('')
  }
  const comuta = async (p) => {
    setBusy(p.spatiuId)
    try { await setPortalActiv(p.id, p.activ === false); await load() }
    catch (e) { toast(mesajEroare(e), 'error') }
    setBusy('')
  }
  const copiaza = async (p) => {
    try { await navigator.clipboard.writeText(link(p)); setCopiat(p.id); setTimeout(() => setCopiat(''), 1800) }
    catch { toast('Nu am putut copia.', 'error') }
  }
  const marcheaza = async (c) => {
    try { await updateCererePortal(c.id, { status: c.status === 'nou' ? 'rezolvat' : 'nou' }); await load() }
    catch (e) { toast(mesajEroare(e), 'error') }
  }
  const sterge = async (c) => {
    if (!confirm('Ștergi această cerere?')) return
    try { await deleteCererePortal(c.id); await load() } catch (e) { toast(mesajEroare(e), 'error') }
  }

  const deschide = async (f) => {
    try { window.open(await getDownloadURL(stRef(storage, f.path)), '_blank', 'noopener') }
    catch (e) { console.error(e); toast(mesajEroare(e, 'Nu s-a putut deschide fișierul'), 'error') }
  }

  const nouNr = cereri.filter(c => c.status === 'nou').length
  const cereriVizibile = cereri.filter(c => filtruCereri === 'toate' || c.status === filtruCereri)

  return (
    <>
      <Topbar title="Portal chiriași" subtitle="Un link pentru fiecare spațiu, valabil cât contractul" />
      <div className="content">
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
          {[['linkuri', 'Linkuri spații'], ['cereri', `Cereri primite${nouNr ? ` (${nouNr})` : ''}`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background: 'none', border: 'none', padding: '0 0 10px', cursor: 'pointer', fontWeight: tab === k ? 700 : 500,
              color: tab === k ? 'var(--blue)' : 'var(--slate)', borderBottom: tab === k ? '2px solid var(--gold)' : '2px solid transparent',
            }}>{l}</button>
          ))}
        </div>

        {loading ? <div className="empty"><p>Se încarcă…</p></div> : tab === 'linkuri' ? (
          <>
            {indexuri > 0 && (
              <div className="alert alert-info" style={{ marginBottom: 14 }}>
                <i className="ti ti-bolt" />
                <span>Ai <strong>{indexuri}</strong> indexuri trimise de chiriași care așteaptă validarea. <Link to="/citire?tab=validare">Validează acum →</Link></span>
              </div>
            )}
            {imobile.length === 0 && <div className="card"><div className="empty"><i className="ti ti-building" /><p>Nu ai acces la niciun imobil.</p></div></div>}
            {imobile.map(im => {
              const sp = spatii.filter(s => s.imobilId === im.id)
              return (
                <div className="card" key={im.id} style={{ marginBottom: 16 }}>
                  <div className="card-header"><div className="card-title">{im.nume || im.denumire}</div></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead><tr><th>Spațiu</th><th>Stare</th><th>Valabil până</th><th style={{ textAlign: 'right' }}>Acțiuni</th></tr></thead>
                      <tbody>
                        {sp.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--slate)' }}>Niciun spațiu.</td></tr>}
                        {sp.map(s => {
                          const p = portalDe.get(s.id)
                          const poate = canWrite(im.id)
                          return (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 600 }}>{s.denumire}</td>
                              <td>
                                {!p ? <span className="badge badge-gray">Fără link</span>
                                  : expirat(p) ? <span className="badge badge-red">Expirat</span>
                                  : p.activ === false ? <span className="badge badge-amber">Dezactivat</span>
                                  : <span className="badge badge-green">Activ</span>}
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--slate)' }}>{p ? (p.valabilPana || 'cât timp există contractul') : '—'}</td>
                              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {!p ? (
                                  poate && <button className="btn btn-primary btn-sm" disabled={busy === s.id} onClick={() => creeaza(s)}><i className="ti ti-link" /> Creează link</button>
                                ) : (
                                  <>
                                    <button className="btn btn-primary btn-sm" onClick={() => copiaza(p)}><i className={`ti ${copiat === p.id ? 'ti-check' : 'ti-copy'}`} /> {copiat === p.id ? 'Copiat' : 'Copiază'}</button>{' '}
                                    <a className="btn btn-success btn-sm" target="_blank" rel="noreferrer"
                                      href={`https://wa.me/?text=${encodeURIComponent('Bună ziua! Aici puteți trimite indexurile, documente sau o sesizare: ' + link(p))}`}><i className="ti ti-brand-whatsapp" /></a>{' '}
                                    <a className="btn btn-ghost btn-sm"
                                      href={`mailto:?subject=${encodeURIComponent('Portal chiriaș')}&body=${encodeURIComponent('Bună ziua!\n\nAici puteți trimite indexurile, documente sau o sesizare:\n' + link(p))}`}><i className="ti ti-mail" /></a>{' '}
                                    {poate && (
                                      <>
                                        <Link className="btn btn-ghost btn-sm" to={`/spatii/${s.id}/portal`} title="Setări portal"><i className="ti ti-settings" /></Link>{' '}
                                        <button className="btn btn-ghost btn-sm" disabled={busy === s.id} onClick={() => comuta(p)} title={p.activ === false ? 'Activează' : 'Dezactivează'}>
                                          <i className={`ti ${p.activ === false ? 'ti-player-play' : 'ti-player-pause'}`} /></button>{' '}
                                        <button className="btn btn-ghost btn-sm" disabled={busy === s.id} onClick={() => regenereaza(p)} title="Regenerează linkul"><i className="ti ti-refresh" /></button>
                                      </>
                                    )}
                                  </>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['nou', 'Noi'], ['rezolvat', 'Rezolvate'], ['toate', 'Toate']].map(([k, l]) => (
                <button key={k} className={`btn btn-sm ${filtruCereri === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFiltruCereri(k)}>{l}</button>
              ))}
            </div>
            {cereriVizibile.length === 0 ? (
              <div className="card"><div className="empty"><i className="ti ti-inbox" /><p>Nicio cerere.</p></div></div>
            ) : cereriVizibile.map(c => (
              <div className="card" key={c.id} style={{ marginBottom: 12 }}>
                <div className="card-body">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    <span className={`badge ${c.tip === 'sesizare' ? 'badge-red' : c.tip === 'document' ? 'badge-blue' : 'badge-gray'}`}>{TIPURI[c.tip] || c.tip}</span>
                    <strong>{numeSpatiu(c.spatiuId)}</strong>
                    <span style={{ color: 'var(--slate)', fontSize: 12 }}>{numeImobil(c.imobilId)} · {dataRo(c.dataTrimis)}</span>
                    {c.status === 'rezolvat' && <span className="badge badge-green">Rezolvat</span>}
                  </div>
                  {c.chiriasNume && <div style={{ fontSize: 13, marginBottom: 4 }}>De la: <strong>{c.chiriasNume}</strong>{c.contact ? ` · ${c.contact}` : ''}</div>}
                  {c.text && <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, marginBottom: 8 }}>{c.text}</div>}
                  {(c.fisiere || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      {c.fisiere.map((f, i) => (
                        <button key={i} className="btn btn-ghost btn-sm" onClick={() => deschide(f)}><i className="ti ti-paperclip" /> {f.nume}</button>
                      ))}
                    </div>
                  )}
                  {canWrite(c.imobilId) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => marcheaza(c)}>
                        <i className="ti ti-check" /> {c.status === 'nou' ? 'Marchează rezolvat' : 'Redeschide'}
                      </button>
                      {canAdmin(c.imobilId) && <button className="btn btn-danger btn-sm" onClick={() => sterge(c)}><i className="ti ti-trash" /></button>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}
