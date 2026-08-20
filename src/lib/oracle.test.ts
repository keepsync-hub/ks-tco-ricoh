import { describe, expect, it } from 'vitest'
import { computeScenario } from './calc'
import { emptyQuote } from '../data/quote'
import type { Quote } from '../types'

/**
 * Verificación cruzada contra un oráculo externo.
 *
 * Los valores esperados NO salen de este código: se obtuvieron exportando esta
 * misma cotización con `buildWorkbook` y recalculando el .xlsx resultante con el
 * motor de fórmulas de Excel de la librería `formulas` (Python). Es decir,
 * comprueban a la vez que el motor calcula bien y que las fórmulas que se
 * escriben en el archivo significan lo mismo que el cálculo en pantalla.
 *
 * Cotización: 5 ítems (los totales quedan desplazados dos filas respecto de la
 * plantilla) más cargos variables de 12,5 y 3,25 UF.
 */

function muestra(): Quote {
  const q = emptyQuote('Muestra')
  q.items = ([
    ['423509', 100, 1479, 0.55],
    ['423524', 9, 310, 0.4],
    ['1647/00', 100, 209, 0.2],
    ['RSS-2YR', 102, 63, 0.3],
    ['TS-SERVICE-HW', 36, 375, 0.1],
  ] as const).map(([pn, qty, priceList, disc], i) => ({
    id: `i${i}`,
    partNumber: pn,
    description: pn,
    qty,
    priceList,
    discount: { inicial: 0, final: disc },
  }))
  q.variableUf.final = { m: 12.5, c: 3.25 }
  return q
}

describe('el cálculo en pantalla coincide con el recálculo del .xlsx exportado', () => {
  const t = computeScenario(muestra(), 'final')

  const CASOS: Array<[string, number, number]> = [
    ['G22 precio c/ descuento', t.rows[0].precioConDescuento, 665.55],
    ['J22 CFTotal', t.rows[0].cfTotal, 55.13591878172589],
    ['O22 total CL$', t.rows[0].totalClp, 66555000.0],
    ['G25 precio c/ descuento', t.rows[3].precioConDescuento, 44.1],
    ['J27 TOTAL UF', t.totalUf, 84.16580223350253],
    ['J28 TOTAL CLP', t.totalClp, 3316132.6079999995],
    ['J29 TOTAL DRS', t.totalDrs, 3316.1326079999994],
    ['H34 Cargo Fijo (UF)', t.summary.cargoFijo.uf, 84.16580223350253],
    ['I34 Cargo Fijo (CL$)', t.summary.cargoFijo.clp, 3316132.6079999995],
    ['H37 Total (UF)', t.summary.total.uf, 99.91580223350253],
    ['I37 Total (CL$)', t.summary.total.clp, 3936682.6079999995],
    ['I39 VP (CL$)', t.vp.clp, 101597200.0],
    ['J39 VP (USD)', t.vp.usd, 101597.2],
  ]

  for (const [nombre, actual, esperado] of CASOS) {
    it(nombre, () => {
      expect(Math.abs(actual - esperado)).toBeLessThanOrEqual(
        Math.max(Math.abs(esperado) * 1e-12, 1e-12),
      )
    })
  }
})
