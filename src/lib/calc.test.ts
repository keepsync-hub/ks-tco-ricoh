import { describe, expect, it } from 'vitest'
import { computeItem, computeScenario } from './calc'
import { discountForTargetCfTotal } from './solve'
import { emptyQuote } from '../data/quote'
import type { LineItem, Quote } from '../types'

/**
 * Regresión contra los valores que la planilla `TCO_RICOH.xlsx` dejó cacheados
 * en la hoja `TCO FINAL` (UF 39400 / T/C 1000 / Factor 0.03264).
 *
 * Si un cambio hace fallar este archivo, el cambio está mal: la planilla es la
 * fuente de verdad, no el código.
 */

const CASES = [
  { partNumber: '423509', qty: 100, priceList: 1479, discount: 0.55,
    G: 665.55, I: 0.551359187817259, J: 55.1359187817259, N: 66555, O: 66555000 },
  { partNumber: '423524', qty: 9, priceList: 310, discount: 0.4,
    G: 186, I: 0.15408730964467, J: 1.38678578680203, N: 1674, O: 1674000 },
  { partNumber: '1647/00', qty: 100, priceList: 209, discount: 0.2,
    G: 167.2, I: 0.138512893401015, J: 13.8512893401015, N: 16720, O: 16720000 },
]

const PARAMS = { uf: 39400, tipoCambio: 1000, factor: 0.03264 }

/** Compara con tolerancia relativa; los montos van de 0,13 a 8,5e7. */
function expectClose(actual: number, expected: number) {
  const tolerance = Math.max(Math.abs(expected) * 1e-12, 1e-12)
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

function tcoFinal(): Quote {
  const quote = emptyQuote('TCO FINAL')
  quote.header.cliente = 'CLIENTE'
  quote.header.consultorVentas = 'CRISTIAN MOLINA'
  quote.params.final = { ...PARAMS }
  quote.items = CASES.map((c, i): LineItem => ({
    id: `item-${i}`,
    partNumber: c.partNumber,
    description: c.partNumber,
    qty: c.qty,
    priceList: c.priceList,
    discount: { inicial: 0, final: c.discount },
  }))
  return quote
}

describe('columnas calculadas de la fila', () => {
  for (const c of CASES) {
    it(`reproduce las celdas de ${c.partNumber}`, () => {
      const item: LineItem = {
        id: c.partNumber,
        partNumber: c.partNumber,
        description: '',
        qty: c.qty,
        priceList: c.priceList,
        discount: { inicial: 0, final: c.discount },
      }
      const row = computeItem(item, 'final', PARAMS)
      expectClose(row.precioConDescuento, c.G)
      expectClose(row.cargoFijoUnit, c.I)
      expectClose(row.cfTotal, c.J)
      expectClose(row.totalUsd, c.N)
      expectClose(row.totalClp, c.O)
    })
  }
})

describe('totales y cuadro resumen', () => {
  const t = computeScenario(tcoFinal(), 'final')

  it('J25 TOTAL UF', () => expectClose(t.totalUf, 70.3739939086294))
  it('J26 TOTAL CLP', () => expectClose(t.totalClp, 2772735.36))
  it('J27 TOTAL DRS', () => expectClose(t.totalDrs, 2772.73536))

  it('fila 32 Cargo Fijo en UF, CL$ y USD', () => {
    expectClose(t.summary.cargoFijo.uf, 70.3739939086294)
    expectClose(t.summary.cargoFijo.clp, 2772735.36)
    expectClose(t.summary.cargoFijo.usd, 2772.73536)
  })

  it('filas 33 y 34 quedan en cero sin cargos variables', () => {
    expect(t.summary.variableM.clp).toBe(0)
    expect(t.summary.variableC.clp).toBe(0)
  })

  it('fila 35 Total iguala al Cargo Fijo cuando no hay variables', () => {
    expectClose(t.summary.total.uf, 70.3739939086294)
    expectClose(t.summary.total.clp, 2772735.36)
  })

  it('fila 37 VP', () => {
    expectClose(t.vp.clp, 84949000)
    expectClose(t.vp.usd, 84949)
  })
})

describe('cargos variables del cuadro resumen', () => {
  it('suma Variable M y Variable C al total', () => {
    const quote = tcoFinal()
    quote.variableUf.final = { m: 10, c: 5 }
    const t = computeScenario(quote, 'final')
    expectClose(t.summary.variableM.clp, 10 * 39400)
    expectClose(t.summary.total.uf, 70.3739939086294 + 15)
    // El Cargo Fijo y los totales de la tabla no se ven afectados.
    expectClose(t.totalUf, 70.3739939086294)
  })
})

describe('escenario inicial', () => {
  it('sin descuento, el precio final es el precio de lista', () => {
    const t = computeScenario(tcoFinal(), 'inicial')
    expectClose(t.rows[0].precioConDescuento, 1479)
    expectClose(t.vp.usd, 1479 * 100 + 310 * 9 + 209 * 100)
  })
})

describe('descuento inverso', () => {
  it('devuelve el descuento que alcanza el CFTotal objetivo', () => {
    const d = discountForTargetCfTotal(55.1359187817259, 1479, 100, PARAMS)
    expect(d).not.toBeNull()
    expectClose(d as number, 0.55)
  })

  it('descarta objetivos que exigen un descuento fuera de 0-100 %', () => {
    expect(discountForTargetCfTotal(9999, 1479, 100, PARAMS)).toBeNull()
    expect(discountForTargetCfTotal(-1, 1479, 100, PARAMS)).toBeNull()
  })

  it('descarta datos degenerados en vez de devolver Infinity', () => {
    expect(discountForTargetCfTotal(10, 0, 100, PARAMS)).toBeNull()
    expect(discountForTargetCfTotal(10, 1479, 0, PARAMS)).toBeNull()
  })
})
