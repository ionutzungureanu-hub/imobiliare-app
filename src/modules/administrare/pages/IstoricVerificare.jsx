import { lazy } from 'react'
import PaginaCuTaburi from '../../../shared/components/PaginaCuTaburi'

const IstoricModificari = lazy(() => import('./IstoricModificari'))
const VerificareDate    = lazy(() => import('./VerificareDate'))

export default function IstoricVerificare() {
  return <PaginaCuTaburi taburi={[
    { id: 'istoric',   icon: 'ti-history',      label: 'Istoric modificări', sub: 'cine ce a schimbat și backup', C: IstoricModificari },
    { id: 'verificare', icon: 'ti-checklist',  label: 'Verificare date',    sub: 'nepotriviri între registre', C: VerificareDate },
  ]} />
}
