// Schelete de încărcare: forme gri animate în locul textului „Se încarcă…”
export function Schelet({ w = '100%', h = 14, r = 6, style }) {
  return <span className="sk" aria-hidden="true" style={{ display: 'block', width: w, height: h, borderRadius: r, ...style }} />
}

// Tabel în așteptare: antet + rânduri
export function SceletTabel({ randuri = 6, coloane = 5 }) {
  return (
    <div className="card" role="status" aria-label="Se încarcă">
      <div style={{ padding: 16, display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${coloane}, 1fr)`, gap: 14 }}>
          {Array.from({ length: coloane }, (_, i) => <Schelet key={i} h={10} w="60%" />)}
        </div>
        {Array.from({ length: randuri }, (_, r) => (
          <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${coloane}, 1fr)`, gap: 14 }}>
            {Array.from({ length: coloane }, (_, i) => <Schelet key={i} h={14} w={i === 0 ? '80%' : `${50 + ((r * 7 + i * 13) % 40)}%`} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Carduri în așteptare (indicatori)
export function SceletCarduri({ n = 4 }) {
  return (
    <div role="status" aria-label="Se încarcă" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <Schelet h={10} w="55%" /><Schelet h={26} w="40%" r={8} /><Schelet h={10} w="70%" />
        </div>
      ))}
    </div>
  )
}

export default SceletTabel
