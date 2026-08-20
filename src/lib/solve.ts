import type { Params } from '../types'

/**
 * Descuento inverso: qué `Descuento aplicado` (columna H) hace falta para que el
 * `CFTotal` (columna J) de un ítem alcance un objetivo en UF.
 *
 * Despejando J = ((F - F*H) * TC / UF) * Factor * Qty:
 *   H = 1 - (objetivo * UF) / (F * TC * Factor * Qty)
 *
 * Devuelve `null` cuando no hay solución (datos en cero) o cuando el descuento
 * necesario cae fuera de 0-100 %, en vez de proponer un valor inválido.
 */
export function discountForTargetCfTotal(
  targetUf: number,
  priceList: number,
  qty: number,
  params: Params,
): number | null {
  const denom = priceList * params.tipoCambio * params.factor * qty
  if (!Number.isFinite(denom) || denom === 0) return null
  const discount = 1 - (targetUf * params.uf) / denom
  if (!Number.isFinite(discount) || discount < 0 || discount > 1) return null
  return discount
}
