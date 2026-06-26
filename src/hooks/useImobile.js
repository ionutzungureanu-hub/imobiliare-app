import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getImobile } from '../firebase/firestore'

export function useImobile() {
  const { isAdmin, accessIds } = useAuth()
  const [imobile, setImobile] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    getImobile().then(all => {
      if (isAdmin) { setImobile(all) }
      else if (!accessIds || accessIds.length === 0) { setImobile([]) }
      else { setImobile(all.filter(im => accessIds.includes(im.id))) }
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [isAdmin, JSON.stringify(accessIds)])
  return { imobile, loading, reload: load }
}
