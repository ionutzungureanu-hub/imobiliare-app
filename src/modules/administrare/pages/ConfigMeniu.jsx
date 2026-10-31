import { lazy } from 'react'
import PaginaCuTaburi from '../../../shared/components/PaginaCuTaburi'

const Config            = lazy(() => import('./Config'))
const AdministrareMeniu = lazy(() => import('./AdministrareMeniu'))

export default function ConfigMeniu() {
  return <PaginaCuTaburi taburi={[
    { id: 'config', icon: 'ti-settings',       label: 'Configurare', sub: 'setări aplicație' , C: Config },
    { id: 'meniu',  icon: 'ti-layout-sidebar', label: 'Meniu',       sub: 'ce se vede și unde', C: AdministrareMeniu },
  ]} />
}
