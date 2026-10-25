const MAP = {
  'Achitata':    'badge-green',
  'In asteptare':'badge-amber',
  'Restanta':    'badge-red',
  'Neachitata':  'badge-amber',
  'Scadenta':    'badge-red',
  'Chirie':      'badge-blue',
  'Utilitati':   'badge-blue',
  'Mixta':       'badge-blue',
}
const LABELS = {
  'Achitata':    'Achitată',
  'In asteptare':'În așteptare',
  'Restanta':    'Restantă',
  'Neachitata':  'Neachitată',
  'Scadenta':    'Scadentă',
}

export default function Badge({ value }) {
  return (
    <span className={`badge ${MAP[value] || 'badge-gray'}`}>
      {LABELS[value] || value}
    </span>
  )
}
