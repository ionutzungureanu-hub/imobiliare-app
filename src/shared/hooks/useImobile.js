import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getImobile, getSpatii } from '../firebase/firestore'

// Returnează imobilele și spațiile la care utilizatorul are acces.
// Filtrarea pe imobil se face în stratul de date (firestore.js, „scope”), nu aici.
export function useImobile() {
  const { isAdmin, user, accessIds } = useAuth()
  const [imobile,  setImobile]  = useState([])
  const [spatii,   setSpatii]   = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [allImobile, allSpatii] = await Promise.all([getImobile(), getSpatii()])
      setImobile(allImobile)
      setSpatii(allSpatii)
    } catch (e) { console.error('useImobile', e) }
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [isAdmin, user?.uid, accessIds.join(',')])
  return { imobile, spatii, loading, reload: load }
}
