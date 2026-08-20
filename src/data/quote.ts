import type { CatalogItem, LineItem, Params, Quote, QuoteHeader } from '../types'

/** Valores de G9, G10 y G11 tal como vienen en la plantilla. */
export const DEFAULT_PARAMS: Params = { uf: 39400, tipoCambio: 1000, factor: 0.03264 }

/**
 * La plantilla trae T/C = 1000, que es un valor de referencia y no un tipo de
 * cambio real. La app lo respeta, pero lo advierte en pantalla.
 */
export const PLACEHOLDER_TIPO_CAMBIO = 1000

export function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function emptyHeader(): QuoteHeader {
  return {
    cliente: '',
    consultorVentas: '',
    solutionsSpecialist: '',
    fechaConfeccion: today(),
    version: 'V1',
    fechaActualizacion: today(),
    actualizadoPor: '',
    plazo: '36 MESES',
    tipoContrato: 'CONTRATO DE ARRIENDO RENTAL',
    pricing: '',
    tdvMono: null,
    tdvColor: null,
    approvalDate: '',
    implementation: '',
    proposalPresentation: '',
    serviceRequiredMono: '',
    serviceRequiredColor: '',
  }
}

export function emptyQuote(nombre: string): Quote {
  const now = new Date().toISOString()
  return {
    id: newId(),
    nombre,
    createdAt: now,
    updatedAt: now,
    header: emptyHeader(),
    items: [],
    params: { inicial: { ...DEFAULT_PARAMS }, final: { ...DEFAULT_PARAMS } },
    variableUf: { inicial: { m: 0, c: 0 }, final: { m: 0, c: 0 } },
  }
}

export function blankItem(): LineItem {
  return {
    id: newId(),
    partNumber: '',
    description: '',
    qty: 1,
    priceList: 0,
    discount: { inicial: 0, final: 0 },
  }
}

/** Crea una fila a partir de un producto del catálogo, precargando Qty y Price List. */
export function itemFromCatalog(entry: CatalogItem): LineItem {
  return {
    id: newId(),
    partNumber: entry.partNumber,
    description: entry.description,
    qty: entry.qty > 0 ? entry.qty : 1,
    priceList: entry.priceList,
    discount: { inicial: 0, final: 0 },
  }
}
