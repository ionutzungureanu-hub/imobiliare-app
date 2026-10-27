import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getMeniuConfig, saveMeniuConfig } from '../firebase/firestore'
import { MODULE_PE_CHEIE, BARA_IMPLICIT, MAX_BARA, esteVizibil, moduleDinCale, moduleOrdonate } from '../config/moduleCatalog'

const MeniuCtx = createContext(null)

const platformaCurenta = () => (typeof window !== 'undefined' && window.innerWidth <= 768 ? 'm' : 'd')

// Meniul decide ce se vede: meniu standard + excepții pe persoană, separat pentru desktop / mobil / Acasă.
export function MeniuProvider({ children }) {
  const { user, isAdmin } = useAuth()
  const [cfg, setCfg]     = useState({})
  const [ready, setReady] = useState(false)
  const [platforma, setPlatforma] = useState(platformaCurenta())

  useEffect(() => {
    const h = () => setPlatforma(platformaCurenta())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const incarca = useCallback(async () => {
    if (!user) { setCfg({}); setReady(true); return }
    try { setCfg(await getMeniuConfig()) } catch (e) { console.warn('meniu', e); setCfg({}) }
    setReady(true)
  }, [user?.uid])
  useEffect(() => { setReady(false); incarca() }, [incarca])

  const vizibil = (key, p = platforma) => esteVizibil(cfg, user?.uid, isAdmin, key, p)
  // Vizibilitate pentru o adresă (pagini, rezultate de căutare, cartonașe)
  const vizibilCale = (cale, p = platforma) => {
    const m = moduleDinCale(cale)
    return m ? vizibil(m.key, p) : true
  }
  const moduleMeniu = () => moduleOrdonate(cfg).filter(m => m.inMeniu !== false && vizibil(m.key, platforma))
  const bara = () => {
    const lista = (cfg.bara && cfg.bara.length ? cfg.bara : BARA_IMPLICIT)
    return lista.map(k => MODULE_PE_CHEIE[k]).filter(m => m && vizibil(m.key, 'm')).slice(0, MAX_BARA)
  }
  const salveaza = async (nou) => { await saveMeniuConfig(nou); setCfg(nou) }

  return (
    <MeniuCtx.Provider value={{ cfg, platforma, vizibil, vizibilCale, moduleMeniu, bara, salveaza, reload: incarca }}>
      {ready && children}
    </MeniuCtx.Provider>
  )
}
export const useMeniu = () => useContext(MeniuCtx)
