/**
 * Modelo de datos de la cotización.
 *
 * Refleja la planilla `TCO_RICOH.xlsx` (hojas `TCO INICIAL`, `TCO FINAL`, `DATOS`).
 * Ver docs/FORMULAS.md para el mapeo celda -> campo.
 */

/** Las dos hojas TCO de la planilla. */
export type ScenarioKey = 'inicial' | 'final'

export const SCENARIOS: ScenarioKey[] = ['inicial', 'final']

export const SCENARIO_LABEL: Record<ScenarioKey, string> = {
  inicial: 'TCO INICIAL',
  final: 'TCO FINAL',
}

/** Parámetros globales de la hoja: celdas G9, G10 y G11. */
export interface Params {
  /** G9 — valor de la UF en pesos. */
  uf: number
  /** G10 — tipo de cambio, pesos por dólar. Rotulado "USD" en la planilla. */
  tipoCambio: number
  /** G11 — Factor Financiamiento. */
  factor: number
}

/** Una fila de la tabla de ítems: columnas C, D, E, F y H. */
export interface LineItem {
  id: string
  /** Columna C. */
  partNumber: string
  /** Columna D. */
  description: string
  /** Columna E. */
  qty: number
  /** Columna F, en dólares. */
  priceList: number
  /** Columna H, guardado como fracción (0.55 = 55 %), por escenario. */
  discount: Record<ScenarioKey, number>
}

/** Cabecera de la hoja: celdas C3:D19. */
export interface QuoteHeader {
  cliente: string
  consultorVentas: string
  solutionsSpecialist: string
  fechaConfeccion: string
  version: string
  fechaActualizacion: string
  actualizadoPor: string
  plazo: string
  tipoContrato: string
  pricing: string
  tdvMono: number | null
  tdvColor: number | null
  approvalDate: string
  implementation: string
  proposalPresentation: string
  serviceRequiredMono: string
  serviceRequiredColor: string
}

/** Cargos variables del cuadro resumen: celdas H33 y H34, en UF. */
export interface VariableUf {
  m: number
  c: number
}

export interface Quote {
  id: string
  nombre: string
  createdAt: string
  updatedAt: string
  header: QuoteHeader
  items: LineItem[]
  params: Record<ScenarioKey, Params>
  variableUf: Record<ScenarioKey, VariableUf>
}

/** Una fila del catálogo maestro (hoja `DATOS`). */
export interface CatalogItem {
  id: string
  partNumber: string
  description: string
  qty: number
  priceList: number
}

/** Valores calculados de un ítem: columnas G, I, J, N y O. */
export interface ComputedRow {
  item: LineItem
  /** Columna G. */
  precioConDescuento: number
  /** Columna I, en UF. */
  cargoFijoUnit: number
  /** Columna J, en UF. */
  cfTotal: number
  /** Columna N. */
  totalUsd: number
  /** Columna O. */
  totalClp: number
}

/** Un monto expresado en las tres unidades del cuadro resumen. */
export interface Money {
  uf: number
  clp: number
  usd: number
}

export interface ScenarioTotals {
  rows: ComputedRow[]
  /** J25 */
  totalUf: number
  /** J26 */
  totalClp: number
  /** J27 */
  totalDrs: number
  summary: {
    /** Fila 32 */
    cargoFijo: Money
    /** Fila 33 */
    variableM: Money
    /** Fila 34 */
    variableC: Money
    /** Fila 35 */
    total: Money
  }
  /** Fila 37 */
  vp: { clp: number; usd: number }
}
