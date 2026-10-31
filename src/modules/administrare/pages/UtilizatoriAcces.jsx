import { lazy } from 'react'
import PaginaCuTaburi from '../../../shared/components/PaginaCuTaburi'

const Utilizatori   = lazy(() => import('./Utilizatori'))
const AccesImobile  = lazy(() => import('./AccesImobile'))

// Conturi și drepturi de acces, într-un singur loc
export default function UtilizatoriAcces() {
  return <PaginaCuTaburi taburi={[
    { id: 'conturi', icon: 'ti-user-cog', label: 'Conturi', sub: 'utilizatori și parole', C: Utilizatori },
    { id: 'acces',   icon: 'ti-key',      label: 'Acces', sub: 'imobile și firme', C: AccesImobile },
  ]} />
}
