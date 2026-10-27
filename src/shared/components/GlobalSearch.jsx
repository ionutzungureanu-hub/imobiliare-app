import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeniu } from '../context/MeniuContext'
import { getClienti, getImobile, getSpatii, getDrafturiContracte } from '../firebase/firestore'

const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Căutare globală: clienți, imobile, spații, contracte. Datele se încarcă o singură dată, la prima folosire.
export default function GlobalSearch({ isAdmin, isMobile }) {
  const navigate = useNavigate()
  const { vizibilCale } = useMeniu()
  const [q, setQ]           = useState('')
  const [open, setOpen]     = useState(false)
  const [expand, setExpand] = useState(false)
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr]       = useState('')
  const inputRef = useRef(null)
  const boxRef   = useRef(null)

  const load = async () => {
    if (data || loading) return
    setLoading(true); setErr('')
    try {
      const [clienti, imobile, spatii, contracte] = await Promise.all([
        getClienti(), getImobile(), getSpatii(),
        getDrafturiContracte().catch(() => []),
      ])
      setData({ clienti, imobile, spatii, contracte })
    } catch (e) { console.error(e); setErr('Căutarea nu a putut încărca datele.') }
    setLoading(false)
  }

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setExpand(true); setOpen(true); load()
        setTimeout(() => inputRef.current?.focus(), 0)
      }
      if (e.key === 'Escape') { setOpen(false); setExpand(false) }
    }
    const onClick = e => { if (boxRef.current && !boxRef.current.contains(e.target)) { setOpen(false); setExpand(false) } }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  })

  const rezultate = useMemo(() => {
    const t = norm(q).trim()
    if (!data || t.length < 2) return []
    const im = Object.fromEntries(data.imobile.map(i => [i.id, i]))
    const out = []
    data.clienti.forEach(c => {
      if ([c.nume, c.cui, c.cnp, c.telefon, c.email, ...(c.contacte || []).map(x => x.nume), ...(c.contacte || []).map(x => x.telefon), ...(c.emailuri || []).map(x => x.email || x.adresa)].some(v => norm(v).includes(t)))
        out.push({ k: 'c' + c.id, grup: 'Clienți', icon: 'ti-users', titlu: c.nume || 'Client fără nume', sub: [c.tip, c.cui || c.cnp, c.telefon].filter(Boolean).join(' · '), to: `/clienti/${c.id}` })
    })
    data.imobile.forEach(i => {
      if ([i.nume, i.adresa].some(v => norm(v).includes(t)))
        out.push({ k: 'i' + i.id, grup: 'Imobile', icon: 'ti-building', titlu: i.nume || 'Imobil', sub: i.adresa || '', to: '/spatii' })
    })
    data.spatii.forEach(s => {
      const imobil = im[s.imobilId]
      if ([s.denumire, s.etaj, imobil?.nume].some(v => norm(v).includes(t)))
        out.push({ k: 's' + s.id, grup: 'Spații', icon: 'ti-door', titlu: s.denumire || 'Spațiu', sub: imobil?.nume || '', to: isMobile ? '/citire' : `/spatii/${s.id}/istoric` })
    })
    if (!isMobile) data.contracte.forEach(d => {
      const titlu = d.titlu || d.nume || d.denumire || d.numeFisier || ''
      if (norm(titlu).includes(t) || norm(d.serie).includes(t) || norm(d.numar).includes(t))
        out.push({ k: 'd' + d.id, grup: 'Contracte', icon: 'ti-file-text', titlu: titlu || 'Contract', sub: [d.serie, d.numar].filter(Boolean).join(' '), to: '/contracte' })
    })
    return out.filter(r => vizibilCale(r.to)).slice(0, 30)
  }, [q, data, isMobile, vizibilCale])

  const go = r => { setOpen(false); setExpand(false); setQ(''); navigate(r.to) }

  if (isMobile && !expand) {
    return (
      <button aria-label="Caută" onClick={() => { setExpand(true); setOpen(true); load(); setTimeout(() => inputRef.current?.focus(), 0) }}
        style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--slate)', padding: 6, cursor: 'pointer' }}>
        <i className="ti ti-search" />
      </button>
    )
  }

  let lastGrup = ''
  return (
    <div ref={boxRef} style={isMobile
      ? { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'var(--white)', padding: 10, boxShadow: '0 4px 16px rgba(0,0,0,.15)' }
      : { position: 'relative', width: 320 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', background: 'var(--white)' }}>
        <i className="ti ti-search" style={{ color: 'var(--slate)' }} />
        <input ref={inputRef} value={q} placeholder={isMobile ? 'Caută…' : 'Caută client, imobil, contract…  (Ctrl+K)'}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); load() }}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', minWidth: 0 }} />
        {(q || isMobile) && (
          <button onClick={() => { setQ(''); setExpand(false); setOpen(false) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><i className="ti ti-x" /></button>
        )}
      </div>
      {open && (q.trim().length >= 1) && (
        <div style={{ position: isMobile ? 'static' : 'absolute', top: 42, left: 0, right: 0, marginTop: isMobile ? 8 : 0,
          background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          maxHeight: isMobile ? '70vh' : 420, overflowY: 'auto', zIndex: 300 }}>
          {loading && <div style={{ padding: 14, fontSize: 13, color: 'var(--slate)' }}>Se încarcă datele…</div>}
          {err && <div style={{ padding: 14, fontSize: 13, color: '#9B2C2C' }}>{err}</div>}
          {!loading && !err && q.trim().length < 2 && <div style={{ padding: 14, fontSize: 13, color: 'var(--slate)' }}>Scrie cel puțin 2 caractere.</div>}
          {!loading && !err && q.trim().length >= 2 && rezultate.length === 0 && <div style={{ padding: 14, fontSize: 13, color: 'var(--slate)' }}>Niciun rezultat.</div>}
          {rezultate.map(r => {
            const arata = r.grup !== lastGrup; lastGrup = r.grup
            return (
              <div key={r.k}>
                {arata && <div className="nav-section" style={{ paddingTop: 10 }}>{r.grup}</div>}
                <div onClick={() => go(r)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 14px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F0E8'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <i className={`ti ${r.icon}`} style={{ color: 'var(--blue)', fontSize: 18 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titlu}</div>
                    {r.sub && <div style={{ fontSize: 12, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
