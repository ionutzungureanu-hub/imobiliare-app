import { createContext, useContext, useEffect, useState } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { getUserProfile } from '../firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null) // { rol, imobileAccess, nume }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u) {
        try {
          const prof = await getUserProfile(u.uid)
          if (prof) {
            setProfile(prof)
          } else {
            // Profilul nu există cu UID — default admin
            setProfile({ rol: 'admin', imobileAccess: [], nume: u.email })
          }
        } catch {
          setProfile({ rol: 'admin', imobileAccess: [], nume: u.email })
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login  = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const logout = () => signOut(auth)

  const isAdmin   = !profile || profile.rol === 'admin' || profile.rol === undefined || profile.rol === null
  const accessIds = profile?.imobileAccess || []

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, isAdmin, accessIds }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
