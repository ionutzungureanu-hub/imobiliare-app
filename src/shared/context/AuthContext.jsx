import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { getUserProfile, getAccesUser, setScope, getBootstrapFlag, creeazaProfilPropriu } from '../firebase/firestore'

const AuthContext = createContext(null)

// Model de acces:
//  • administrator general = users/{uid}.rol === 'admin'  → vede tot
//  • ceilalți au acces pe imobil: acces/{uid}.imobile = { imobilId: 1|2|3 }
//      1 Vizualizare · 2 Operare · 3 Administrare
//  • cont fără profil și fără acces → nu vede nimic
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [acces,   setAcces]   = useState(null)
  const [loading, setLoading] = useState(true)

  const incarca = useCallback(async (u) => {
    if (!u) { setProfile(null); setAcces(null); setScope({ admin: false, ids: [] }); return }
    let prof = null, acc = null
    try { prof = await getUserProfile(u.uid) } catch (e) { console.warn('profil', e) }
    // Cont nou fără profil: după configurarea inițială, creăm profilul ca să apară în „Acces imobile”
    if (!prof) {
      try {
        if (await getBootstrapFlag()) { await creeazaProfilPropriu(u.uid, u.email, u.displayName); prof = await getUserProfile(u.uid) }
      } catch (e) { console.warn('profil nou', e) }
    }
    try { acc  = await getAccesUser(u.uid) }  catch (e) { console.warn('acces', e) }
    const activ  = !prof || prof.activ !== false
    const admin  = !!prof && prof.rol === 'admin' && activ
    const ids    = activ && acc ? Object.keys(acc.imobile || {}).filter(k => (acc.imobile[k] || 0) >= 1) : []
    setScope({ admin, ids })           // înainte de orice încărcare de date
    setProfile(prof)
    setAcces(acc)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u)
      await incarca(u)
      setLoading(false)
    })
    return unsub
  }, [incarca])

  const login    = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const register = (email, password) => createUserWithEmailAndPassword(auth, email, password)
  const logout   = () => signOut(auth)
  const reload   = () => incarca(auth.currentUser)

  const activ    = !profile || profile.activ !== false
  const isAdmin  = !!profile && profile.rol === 'admin' && activ
  const harta    = (activ && acces?.imobile) || {}
  const accessIds = isAdmin ? [] : Object.keys(harta).filter(k => harta[k] >= 1)

  // Nivelul utilizatorului pe un imobil (admin general = 3)
  const nivelPe   = (imobilId) => isAdmin ? 3 : (harta[imobilId] || 0)
  const canView   = (imobilId) => nivelPe(imobilId) >= 1
  const canWrite  = (imobilId) => nivelPe(imobilId) >= 2
  const canAdmin  = (imobilId) => nivelPe(imobilId) >= 3
  const imobileAdministrate = null
  const esteDelegat = false
  const faraAcces = !!user && !isAdmin && accessIds.length === 0

  return (
    <AuthContext.Provider value={{
      user, profile, acces, loading, login, register, logout, reload,
      isAdmin, accessIds, nivelPe, canView, canWrite, canAdmin,
      imobileAdministrate, esteDelegat, faraAcces,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
