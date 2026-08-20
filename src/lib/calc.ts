import type {
  ComputedRow,
  LineItem,
  Money,
  Params,
  Quote,
  ScenarioKey,
  ScenarioTotals,
} from '../types'

/**
 * Motor de cálculo. Réplica exacta de las fórmulas de la planilla.
 *
 * Regla que no se rompe: aquí NO se redondea. La planilla tampoco lo hace y
 * redondear desalinea los totales (ver src/lib/calc.test.ts). El redondeo es
 * solo de presentación y vive en src/lib/format.ts.
 */

/** Columna G: `=F - (F * H)` */
export function precioConDescuento(priceList: number, discount: number): number {
  return priceList - priceList * discount
}

/** Columna I: `=(G * K / L) * M`, donde K = T/C, L = UF y M = Factor. */
export function cargoFijoUnit(precioDesc: number, params: Params): number {
  return (precioDesc * params.tipoCambio / params.uf) * params.factor
}

/** Calcula las columnas G, I, J, N y O de una fila. */
export function computeItem(
  item: LineItem,
  scenario: ScenarioKey,
  params: Params,
): ComputedRow {
  const precioDesc = precioConDescuento(item.priceList, item.discount[scenario] ?? 0)
  const cfUnit = cargoFijoUnit(precioDesc, params)
  const totalUsd = precioDesc * item.qty
  return {
    item,
    precioConDescuento: precioDesc,
    cargoFijoUnit: cfUnit,
    cfTotal: cfUnit * item.qty,          // J = I * E
    totalUsd,                            // N = G * E
    totalClp: totalUsd * params.tipoCambio, // O = N * $G$10
  }
}

/**
 * Convierte un monto en UF a las tres unidades del cuadro resumen.
 * Filas 32-35: `I = H * $G$9` y `J = I / $G$10`.
 */
function fromUf(uf: number, params: Params): Money {
  const clp = uf * params.uf
  return { uf, clp, usd: clp / params.tipoCambio }
}

/** Calcula la hoja completa de un escenario: filas, totales y cuadro resumen. */
export function computeScenario(quote: Quote, scenario: ScenarioKey): ScenarioTotals {
  const params = quote.params[scenario]
  const rows = quote.items.map((item) => computeItem(item, scenario, params))

  // J25 = SUM(J22:J24) — la suma de los cargos fijos totales, en UF.
  const totalUf = rows.reduce((acc, r) => acc + r.cfTotal, 0)
  const totalClp = totalUf * params.uf          // J26 = $J$25 * $G$9
  const totalDrs = totalClp / params.tipoCambio // J27 = J26 / $G$10

  const variable = quote.variableUf[scenario]
  const cargoFijo = fromUf(totalUf, params)              // H32 = J25
  const variableM = fromUf(variable.m, params)           // H33 (entrada)
  const variableC = fromUf(variable.c, params)           // H34 (entrada)
  const total = fromUf(totalUf + variable.m + variable.c, params) // H35 = SUM(H32:H34)

  return {
    rows,
    totalUf,
    totalClp,
    totalDrs,
    summary: { cargoFijo, variableM, variableC, total },
    vp: {
      clp: rows.reduce((acc, r) => acc + r.totalClp, 0), // I37 = SUM(O22:O24)
      usd: rows.reduce((acc, r) => acc + r.totalUsd, 0), // J37 = SUM(N22:N24)
    },
  }
}
