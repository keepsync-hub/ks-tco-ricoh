import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildWorkbook } from './xlsx'
import { CATALOG_SEED } from '../data/catalog.seed'
import { emptyQuote } from '../data/quote'
import type { LineItem, Quote } from '../types'

/**
 * Verifica que el .xlsx exportado siga siendo la plantilla: mismas hojas, mismos
 * estilos, y fórmulas vivas en las columnas calculadas — no valores pegados.
 */

const TEMPLATE = new Uint8Array(
  readFileSync(fileURLToPath(new URL('../assets/plantilla.xlsx', import.meta.url))),
)

const SHEET_FINAL = 'xl/worksheets/sheet4.xml'
const SHEET_INICIAL = 'xl/worksheets/sheet3.xml'
const SHEET_DATOS = 'xl/worksheets/sheet5.xml'

function item(partNumber: string, qty: number, priceList: number, final: number): LineItem {
  return {
    id: partNumber + qty,
    partNumber,
    description: `desc ${partNumber}`,
    qty,
    priceList,
    discount: { inicial: 0, final },
  }
}

function quoteWith(items: LineItem[]): Quote {
  const quote = emptyQuote('Test')
  quote.header.cliente = 'CLIENTE & CÍA <SpA>'
  quote.items = items
  return quote
}

const TCO_FINAL_ITEMS = [
  item('423509', 100, 1479, 0.55),
  item('423524', 9, 310, 0.4),
  item('1647/00', 100, 209, 0.2),
]

function sheets(zip: Uint8Array) {
  const files = unzipSync(zip)
  return {
    files,
    final: strFromU8(files[SHEET_FINAL]),
    inicial: strFromU8(files[SHEET_INICIAL]),
    datos: strFromU8(files[SHEET_DATOS]),
  }
}

/** Extrae el XML de una celda por referencia. */
function cell(xml: string, ref: string): string | undefined {
  const re = new RegExp(`<c r="${ref}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`)
  return re.exec(xml)?.[0]
}

/** Extrae el texto de la fórmula de una celda. */
function formula(xml: string, ref: string): string | undefined {
  return /<f>([\s\S]*?)<\/f>/.exec(cell(xml, ref) ?? '')?.[1]
}

describe('estructura del libro exportado', () => {
  const zip = buildWorkbook(TEMPLATE, quoteWith(TCO_FINAL_ITEMS), CATALOG_SEED)
  const original = unzipSync(TEMPLATE)
  const { files, final } = sheets(zip)

  it('conserva todas las partes de la plantilla', () => {
    expect(Object.keys(files).sort()).toEqual(Object.keys(original).sort())
  })

  it('no toca estilos, cadenas compartidas ni comentarios', () => {
    for (const path of ['xl/styles.xml', 'xl/sharedStrings.xml', 'xl/comments2.xml']) {
      expect(strFromU8(files[path])).toBe(strFromU8(original[path]))
    }
  })

  it('conserva anchos de columna y configuración de impresión de la hoja', () => {
    const before = strFromU8(original[SHEET_FINAL])
    const cols = /<cols>[\s\S]*?<\/cols>/.exec(before)?.[0]
    expect(cols).toBeTruthy()
    expect(final).toContain(cols as string)
    expect(final).toContain('<legacyDrawing r:id="rId2"/>')
  })

  it('escapa el XML de los datos del cliente', () => {
    expect(cell(final, 'D3')).toContain('CLIENTE &amp; CÍA &lt;SpA&gt;')
  })
})

describe('fórmulas vivas en la tabla de ítems', () => {
  const { final } = sheets(buildWorkbook(TEMPLATE, quoteWith(TCO_FINAL_ITEMS), CATALOG_SEED))

  it('reproduce las fórmulas de la planilla en la primera fila', () => {
    expect(formula(final, 'G22')).toBe('F22-(F22*$H22)')
    expect(formula(final, 'I22')).toBe('(G22*K22/L22)*M22')
    expect(formula(final, 'J22')).toBe('I22*E22')
    expect(formula(final, 'K22')).toBe('$G$10')
    expect(formula(final, 'L22')).toBe('$G$9')
    expect(formula(final, 'M22')).toBe('$G$11')
    expect(formula(final, 'N22')).toBe('G22*E22')
    expect(formula(final, 'O22')).toBe('N22*$G$10')
  })

  it('las columnas calculadas nunca quedan como constantes', () => {
    for (const row of [22, 23, 24]) {
      for (const col of ['G', 'I', 'J', 'K', 'L', 'M', 'N', 'O']) {
        expect(formula(final, `${col}${row}`), `${col}${row}`).toBeTruthy()
      }
    }
  })

  it('escribe las entradas como valores y no como fórmulas', () => {
    expect(cell(final, 'E22')).toContain('<v>100</v>')
    expect(cell(final, 'F22')).toContain('<v>1479</v>')
    expect(cell(final, 'H22')).toContain('<v>0.55</v>')
    expect(formula(final, 'H22')).toBeUndefined()
  })

  it('cachea el valor calculado junto a la fórmula', () => {
    expect(cell(final, 'G22')).toContain('<v>665.55</v>')
    expect(cell(final, 'J22')).toContain('<v>55.13591878172589</v>')
  })

  it('conserva el estilo de cierre de tabla en la última fila', () => {
    const originalLast = strFromU8(unzipSync(TEMPLATE)[SHEET_FINAL])
    const styleOf = (xml: string, ref: string) => /\bs="(\d+)"/.exec(cell(xml, ref) ?? '')?.[1]
    expect(styleOf(final, 'I24')).toBe(styleOf(originalLast, 'I24'))
    expect(styleOf(final, 'I22')).toBe(styleOf(originalLast, 'I22'))
    expect(styleOf(final, 'I24')).not.toBe(styleOf(final, 'I22'))
  })

  it('escribe el part number no numérico como texto', () => {
    expect(cell(final, 'C24')).toContain('t="inlineStr"')
    expect(cell(final, 'C24')).toContain('1647/00')
    expect(cell(final, 'C22')).toContain('<v>423509</v>')
  })
})

describe('el escenario inicial usa sus propios descuentos', () => {
  const { inicial, final } = sheets(
    buildWorkbook(TEMPLATE, quoteWith(TCO_FINAL_ITEMS), CATALOG_SEED),
  )

  it('escribe 0 % en TCO INICIAL y 55 % en TCO FINAL', () => {
    expect(cell(inicial, 'H22')).toContain('<v>0</v>')
    expect(cell(final, 'H22')).toContain('<v>0.55</v>')
  })
})

describe('desplazamiento del bloque de totales', () => {
  it('con 3 ítems mantiene la geometría original', () => {
    const { final } = sheets(buildWorkbook(TEMPLATE, quoteWith(TCO_FINAL_ITEMS), CATALOG_SEED))
    expect(formula(final, 'J25')).toBe('SUM(J22:J24)')
    expect(formula(final, 'J26')).toBe('$J$25*$G$9')
    expect(formula(final, 'J27')).toBe('J26/$G$10')
    expect(formula(final, 'H32')).toBe('J25')
    expect(formula(final, 'H35')).toBe('SUM(H32:H34)')
    expect(formula(final, 'I37')).toBe('SUM(O22:O24)')
    expect(formula(final, 'J37')).toBe('SUM(N22:N24)')
  })

  it('con 6 ítems desplaza los totales y reapunta las referencias', () => {
    const items = [...TCO_FINAL_ITEMS, item('A1', 1, 10, 0), item('A2', 2, 20, 0), item('A3', 3, 30, 0)]
    const { final } = sheets(buildWorkbook(TEMPLATE, quoteWith(items), CATALOG_SEED))
    expect(formula(final, 'J28')).toBe('SUM(J22:J27)')
    expect(formula(final, 'J29')).toBe('$J$28*$G$9')
    expect(formula(final, 'J30')).toBe('J29/$G$10')
    expect(formula(final, 'H35')).toBe('J28')
    expect(formula(final, 'H38')).toBe('SUM(H35:H37)')
    expect(formula(final, 'I40')).toBe('SUM(O22:O27)')
    expect(final).toContain('<dimension ref="A1:O40"/>')
    // Las etiquetas viajan con su bloque.
    expect(cell(final, 'I28')).toBeTruthy()
    expect(cell(final, 'J25')).toBeTruthy() // ahora es una fila de ítem
    expect(formula(final, 'J25')).toBe('I25*E25')
  })

  it('con 1 ítem sube el bloque de totales', () => {
    const { final } = sheets(buildWorkbook(TEMPLATE, quoteWith([TCO_FINAL_ITEMS[0]]), CATALOG_SEED))
    expect(formula(final, 'J23')).toBe('SUM(J22:J22)')
    expect(formula(final, 'I35')).toBe('SUM(O22:O22)')
    expect(final).toContain('<dimension ref="A1:O35"/>')
  })

  it('sin ítems no emite rangos inválidos', () => {
    const { final } = sheets(buildWorkbook(TEMPLATE, quoteWith([]), CATALOG_SEED))
    expect(final).not.toMatch(/SUM\([A-Z]22:[A-Z]21\)/)
    expect(cell(final, 'J22')).toContain('<v>0</v>')
  })
})

describe('hoja DATOS', () => {
  const { datos } = sheets(buildWorkbook(TEMPLATE, quoteWith(TCO_FINAL_ITEMS), CATALOG_SEED))

  it('escribe el catálogo completo', () => {
    expect(cell(datos, 'A1')).toContain('<v>423509</v>')
    expect(cell(datos, 'B1')).toContain('IM 460F')
    expect(cell(datos, `A${CATALOG_SEED.length}`)).toBeTruthy()
    expect(datos).toContain(`<dimension ref="A1:E${CATALOG_SEED.length}"/>`)
  })
})
