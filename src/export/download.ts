import plantillaUrl from '../assets/plantilla.xlsx?url'
import { buildWorkbook } from './xlsx'
import type { CatalogItem, Quote } from '../types'

/**
 * Descarga la cotización como .xlsx. La plantilla se pide como recurso estático
 * y se parchea en el navegador; nada sale del equipo del usuario.
 */

let plantillaCache: Uint8Array | null = null

async function cargarPlantilla(): Promise<Uint8Array> {
  if (plantillaCache) return plantillaCache
  const respuesta = await fetch(plantillaUrl)
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar la plantilla (HTTP ${respuesta.status}).`)
  }
  plantillaCache = new Uint8Array(await respuesta.arrayBuffer())
  return plantillaCache
}

/** Convierte el nombre de la cotización en un nombre de archivo seguro. */
export function nombreArchivo(quote: Quote): string {
  const base = `TCO ${quote.header.cliente || quote.nombre}`.trim()
  const limpio = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
  return `${limpio || 'TCO_RICOH'}.xlsx`
}

export async function downloadQuoteXlsx(quote: Quote, catalog: CatalogItem[]): Promise<void> {
  const plantilla = await cargarPlantilla()
  const bytes = buildWorkbook(plantilla, quote, catalog)
  // `bytes.buffer` es un ArrayBuffer común; el cast acota el tipo genérico de
  // Uint8Array, que TypeScript ensancha a ArrayBufferLike.
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo(quote)
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
