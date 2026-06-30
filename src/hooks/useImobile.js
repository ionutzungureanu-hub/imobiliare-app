import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getImobile, getSpatii } from '../firebase/firestore'

// Returnează imobilele și spațiile la care userul are acces
export function useImobile() {
  const { isAdmin, user } = useAuth()
  const [imobile,  setImobile]  = useState([])
  const [spatii,   setSpatii]   = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = async () => {
    setLoading(true)
    const [allImobile, allSpatii] = await Promise.all([getImobile(), getSpatii()])

    if (isAdmin) {
      setImobile(allImobile)
      setSpatii(allSpatii)
    } else {
      // Manager vede imobilele unde e manager + spațiile unde e manager
      const myImobile = allImobile.filter(im => im.managerId === user?.uid)
      const mySpatii  = allSpatii.filter(s => s.managerId === user?.uid)
      // Include și imobilele spațiilor (pentru context)
      const imobileIds = new Set([
        ...myImobile.map(im => im.id),
        ...mySpatii.map(s => s.imobilId),
      ])
      setImobile(allImobile.filter(im => imobileIds.has(im.id)))
      setSpatii(mySpatii)
    }
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [isAdmin, user?.uid])
  return { imobile, spatii, loading, reload: load }
}
