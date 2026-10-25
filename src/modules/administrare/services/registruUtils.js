export const ENTITATI_IMPLICITE = ['Kado Excelsior SRL', 'Persoană fizică']
export const NESPECIFICAT = 'Nespecificat'

export const azi = () => new Date().toISOString().slice(0, 10)

// Activ: suprascriere manuală (true/false) sau calcul automat din data de final
export const esteActiv = r => {
  if (r.activManual === true) return true
  if (r.activManual === false) return false
  return !r.dataFinal || r.dataFinal >= azi()
}

// Lista de entități (cine facturează / încasează): implicite + cele deja folosite în registre
export const listaEntitati = (rows = []) => {
  const set = new Set(ENTITATI_IMPLICITE)
  rows.forEach(r => { if (r.entitate) set.add(r.entitate) })
  return [...set]
}
