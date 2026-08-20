import type { CatalogItem } from '../types'

/**
 * Catálogo maestro, tal como viene en la hoja `DATOS` de la planilla.
 * `qty` es la cantidad sugerida que la hoja trae precargada por producto.
 */
export const CATALOG_SEED: CatalogItem[] = [
  { id: 'seed-1', partNumber: '423509', description: 'IM 460F', qty: 100, priceList: 1479 },
  { id: 'seed-2', partNumber: '423524', description: 'Unidad de interfaz IEEE 802.11a/b/g/n tipo M54', qty: 9, priceList: 310 },
  { id: 'seed-3', partNumber: '423525', description: 'Paper Feed Unit PB1200', qty: 0, priceList: 456 },
  { id: 'seed-4', partNumber: '1647/00', description: 'Cabinet', qty: 100, priceList: 209 },
  { id: 'seed-5', partNumber: '418567', description: 'IM C400F (220V)', qty: 2, priceList: 2415 },
  { id: 'seed-6', partNumber: '418583', description: 'Paper Feed Unit PB1170', qty: 2, priceList: 468 },
  { id: 'seed-7', partNumber: '1688/20', description: 'Medium Cabinet for IM C300/400', qty: 2, priceList: 218 },
  { id: 'seed-8', partNumber: 'RSS-2YR', description: 'software Smart Suite', qty: 102, priceList: 63 },
  { id: 'seed-9', partNumber: 'PS-INST-RSI', description: 'Implementación de Accounting', qty: 10, priceList: 105 },
  { id: 'seed-10', partNumber: 'PS-PROJECTMANAGE-OM', description: 'Project Management for OP Projects', qty: 1, priceList: 2857 },
  { id: 'seed-11', partNumber: 'TS-SERVICE-LBR', description: 'Implementación Impresoras', qty: 1, priceList: 2331 },
  { id: 'seed-12', partNumber: 'TS-SERVICE-HW', description: 'Logística Impresoras', qty: 1, priceList: 5356 },
  { id: 'seed-13', partNumber: 'TS-SERVICE-HW', description: 'Logística inversa Impresoras', qty: 0, priceList: 3807 },
  { id: 'seed-14', partNumber: 'TS-SERVICE-HW', description: 'Provisión de cables UTP Cat6 3mts', qty: 1, priceList: 714 },
  { id: 'seed-15', partNumber: 'TS-SERVICE-HW', description: 'Provisión de cables Magic', qty: 1, priceList: 714 },
  { id: 'seed-16', partNumber: 'TS-SERVICE-HW', description: 'SDM', qty: 36, priceList: 375 },
]
