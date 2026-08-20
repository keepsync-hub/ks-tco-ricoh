import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { computeItem, computeScenario } from '../lib/calc'
import type { CatalogItem, LineItem, Params, Quote, ScenarioKey } from '../types'

/**
 * Exporta la cotización al .xlsx original.
 *
 * En vez de reconstruir el libro, se parchea la plantilla: se reescribe solo el
 * <sheetData> de las hojas TCO y DATOS y todo lo demás (estilos, anchos de
 * columna, comentarios, encabezados de impresión) se conserva byte a byte. Por
 * eso el archivo exportado se ve idéntico al que el equipo ya usa.
 *
 * Las fórmulas se emiten como fórmulas vivas, no como valores: quien reciba el
 * archivo puede seguir editándolo en Excel o Numbers. El valor calculado se
 * escribe además en <v> para que se vea correcto antes del primer recálculo.
 */

/** Nombre de archivo interno de cada hoja de la plantilla. */
const SHEET_PATH: Record<ScenarioKey | 'datos', string> = {
  inicial: 'xl/worksheets/sheet3.xml',
  final: 'xl/worksheets/sheet4.xml',
  datos: 'xl/worksheets/sheet5.xml',
}

/** Geometría de la plantilla. */
const ITEM_START = 22
/** La plantilla trae tres filas de ítems; el resto del layout se desplaza. */
const TEMPLATE_ITEM_COUNT = 3
const FIRST_TAIL_ROW = 25
const LAST_ROW = 37

interface TplRow {
  attrs: string
  cells: Map<string, string>
}

interface TplSheet {
  head: string
  tail: string
  rows: Map<number, TplRow>
}

const ROW_RE = /<row([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g
const CELL_RE = /<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g
/** Caracteres que XML 1.0 no admite ni siquiera escapados. */
const INVALID_XML_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g

function colOf(ref: string): string {
  return ref.replace(/\d+/g, '')
}

function parseSheet(xml: string): TplSheet {
  const open = xml.indexOf('<sheetData>')
  const close = xml.lastIndexOf('</sheetData>')
  if (open < 0 || close < 0) throw new Error('La plantilla no tiene <sheetData>')

  const head = xml.slice(0, open)
  const tail = xml.slice(close + '</sheetData>'.length)
  const body = xml.slice(open + '<sheetData>'.length, close)

  const rows = new Map<number, TplRow>()
  for (const match of body.matchAll(ROW_RE)) {
    const attrs = match[1] ?? ''
    const rowNum = Number(/\br="(\d+)"/.exec(attrs)?.[1])
    if (!Number.isFinite(rowNum)) continue
    const cells = new Map<string, string>()
    for (const cell of (match[2] ?? '').matchAll(CELL_RE)) {
      const ref = /\br="([A-Z]+\d+)"/.exec(cell[0])?.[1]
      if (ref) cells.set(colOf(ref), cell[0])
    }
    rows.set(rowNum, { attrs: attrs.replace(/\br="\d+"/, '').trim(), cells })
  }
  return { head, tail, rows }
}

/** Extrae el índice de estilo de una celda de la plantilla, para reutilizarlo. */
function styleAttr(rawCell: string | undefined): string {
  const style = rawCell ? /\bs="(\d+)"/.exec(rawCell)?.[1] : undefined
  return style ? ` s="${style}"` : ''
}

function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Reapunta una celda de la plantilla a otra fila, conservando su XML. */
function retarget(rawCell: string, row: number): string {
  return rawCell.replace(/\br="([A-Z]+)\d+"/, (_m, col) => `r="${col}${row}"`)
}

function blankCell(ref: string, donor?: string): string {
  return `<c r="${ref}"${styleAttr(donor)}/>`
}

function numberCell(ref: string, donor: string | undefined, value: number): string {
  if (!Number.isFinite(value)) return blankCell(ref, donor)
  return `<c r="${ref}"${styleAttr(donor)}><v>${value}</v></c>`
}

function textCell(ref: string, donor: string | undefined, value: string): string {
  if (value === '') return blankCell(ref, donor)
  return `<c r="${ref}" t="inlineStr"${styleAttr(donor)}>` +
    `<is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

function formulaCell(
  ref: string,
  donor: string | undefined,
  formula: string,
  value: number,
): string {
  const cached = Number.isFinite(value) ? `<v>${value}</v>` : ''
  return `<c r="${ref}"${styleAttr(donor)}><f>${escapeXml(formula)}</f>${cached}</c>`
}

/** Une las celdas de una fila respetando el orden de columnas A..O. */
function emitRow(row: number, attrs: string, cells: Map<string, string>): string {
  const ordered = [...cells.entries()]
    .sort((a, b) => a[0].length - b[0].length || a[0].localeCompare(b[0]))
    .map(([, xml]) => xml)
    .join('')
  const rest = attrs ? ` ${attrs}` : ''
  return `<row r="${row}"${rest}>${ordered}</row>`
}

/** Campos de la cabecera, en el orden en que aparecen en la columna D. */
const HEADER_ROWS: Array<[number, (q: Quote) => string | number | null]> = [
  [3, (q) => q.header.cliente],
  [4, (q) => q.header.consultorVentas],
  [5, (q) => q.header.solutionsSpecialist],
  [6, (q) => q.header.fechaConfeccion],
  [7, (q) => q.header.version],
  [8, (q) => q.header.fechaActualizacion],
  [9, (q) => q.header.actualizadoPor],
  [10, (q) => q.header.plazo],
  [11, (q) => q.header.tipoContrato],
  [12, (q) => q.header.pricing],
  [13, (q) => q.header.tdvMono],
  [14, (q) => q.header.tdvColor],
  [15, (q) => q.header.approvalDate],
  [16, (q) => q.header.implementation],
  [17, (q) => q.header.proposalPresentation],
  [18, (q) => q.header.serviceRequiredMono],
  [19, (q) => q.header.serviceRequiredColor],
]

function buildItemRow(
  item: LineItem,
  scenario: ScenarioKey,
  params: Params,
  r: number,
  donorRow: TplRow | undefined,
  pnDonors: { numeric?: string; text?: string },
): string {
  const donor = (col: string) => donorRow?.cells.get(col)
  const row = computeItem(item, scenario, params)
  const isNumericPn = /^\d+$/.test(item.partNumber)

  const cells = new Map<string, string>([
    ['A', blankCell(`A${r}`, donor('A'))],
    ['B', blankCell(`B${r}`, donor('B'))],
    ['C', isNumericPn
      ? numberCell(`C${r}`, pnDonors.numeric, Number(item.partNumber))
      : textCell(`C${r}`, pnDonors.text, item.partNumber)],
    ['D', textCell(`D${r}`, donor('D'), item.description)],
    ['E', numberCell(`E${r}`, donor('E'), item.qty)],
    ['F', numberCell(`F${r}`, donor('F'), item.priceList)],
    ['G', formulaCell(`G${r}`, donor('G'), `F${r}-(F${r}*$H${r})`, row.precioConDescuento)],
    ['H', numberCell(`H${r}`, donor('H'), item.discount[scenario] ?? 0)],
    ['I', formulaCell(`I${r}`, donor('I'), `(G${r}*K${r}/L${r})*M${r}`, row.cargoFijoUnit)],
    ['J', formulaCell(`J${r}`, donor('J'), `I${r}*E${r}`, row.cfTotal)],
    ['K', formulaCell(`K${r}`, donor('K'), '$G$10', params.tipoCambio)],
    ['L', formulaCell(`L${r}`, donor('L'), '$G$9', params.uf)],
    ['M', formulaCell(`M${r}`, donor('M'), '$G$11', params.factor)],
    ['N', formulaCell(`N${r}`, donor('N'), `G${r}*E${r}`, row.totalUsd)],
    ['O', formulaCell(`O${r}`, donor('O'), `N${r}*$G$10`, row.totalClp)],
  ])
  return emitRow(r, donorRow?.attrs ?? '', cells)
}

function buildTcoSheet(xml: string, quote: Quote, scenario: ScenarioKey): string {
  const tpl = parseSheet(xml)
  const params = quote.params[scenario]
  const totals = computeScenario(quote, scenario)
  const n = quote.items.length
  const shift = n - TEMPLATE_ITEM_COUNT
  const lastItemRow = ITEM_START + n - 1
  const at = (templateRow: number) => templateRow + shift

  // Donantes de estilo: la fila 22 para las filas intermedias y la 24 para la
  // última, que es la que cierra la tabla con borde inferior.
  const midDonor = tpl.rows.get(22)
  const lastDonor = tpl.rows.get(24) ?? midDonor
  const pnDonors = {
    numeric: midDonor?.cells.get('C'),
    text: lastDonor?.cells.get('C'),
  }

  const out: string[] = []

  // --- Filas 1 a 21: cabecera, parámetros y encabezados de la tabla. ---
  for (let r = 1; r < ITEM_START; r++) {
    const tplRow = tpl.rows.get(r)
    if (!tplRow) continue
    const cells = new Map(tplRow.cells)

    const headerField = HEADER_ROWS.find(([row]) => row === r)
    if (headerField) {
      const value = headerField[1](quote)
      const donor = tplRow.cells.get('D')
      cells.set('D', typeof value === 'number'
        ? numberCell(`D${r}`, donor, value)
        : textCell(`D${r}`, donor, value == null ? '' : String(value)))
    }

    if (r === 9) cells.set('G', numberCell('G9', tplRow.cells.get('G'), params.uf))
    if (r === 10) cells.set('G', numberCell('G10', tplRow.cells.get('G'), params.tipoCambio))
    if (r === 11) cells.set('G', numberCell('G11', tplRow.cells.get('G'), params.factor))

    out.push(emitRow(r, tplRow.attrs, cells))
  }

  // --- Filas de ítems. ---
  quote.items.forEach((item, index) => {
    const isLast = index === n - 1
    out.push(buildItemRow(
      item,
      scenario,
      params,
      ITEM_START + index,
      isLast ? lastDonor : midDonor,
      pnDonors,
    ))
  })

  // --- Totales y cuadro resumen, desplazados según la cantidad de ítems. ---
  const sumOverItems = (col: string) =>
    n > 0 ? `SUM(${col}${ITEM_START}:${col}${lastItemRow})` : null

  for (let r = FIRST_TAIL_ROW; r <= LAST_ROW; r++) {
    const tplRow = tpl.rows.get(r)
    if (!tplRow) continue
    const target = at(r)
    const cells = new Map<string, string>()
    for (const [col, raw] of tplRow.cells) cells.set(col, retarget(raw, target))

    const set = (col: string, xml: string) => cells.set(col, xml)
    const donor = (col: string) => tplRow.cells.get(col)

    switch (r) {
      case 25: { // TOTAL UF
        const f = sumOverItems('J')
        set('J', f
          ? formulaCell(`J${target}`, donor('J'), f, totals.totalUf)
          : numberCell(`J${target}`, donor('J'), 0))
        break
      }
      case 26: // TOTAL CLP
        set('J', formulaCell(`J${target}`, donor('J'), `$J$${at(25)}*$G$9`, totals.totalClp))
        break
      case 27: // TOTAL DRS
        set('J', formulaCell(`J${target}`, donor('J'), `J${at(26)}/$G$10`, totals.totalDrs))
        break
      case 32: // Cargo Fijo
        set('H', formulaCell(`H${target}`, donor('H'), `J${at(25)}`, totals.totalUf))
        set('I', formulaCell(`I${target}`, donor('I'), `H${target}*$G$9`, totals.summary.cargoFijo.clp))
        set('J', formulaCell(`J${target}`, donor('J'), `I${target}/$G$10`, totals.summary.cargoFijo.usd))
        break
      case 33: // Variable M
        set('H', numberCell(`H${target}`, donor('H'), quote.variableUf[scenario].m))
        set('I', formulaCell(`I${target}`, donor('I'), `H${target}*$G$9`, totals.summary.variableM.clp))
        set('J', formulaCell(`J${target}`, donor('J'), `I${target}/$G$10`, totals.summary.variableM.usd))
        break
      case 34: // Variable C
        set('H', numberCell(`H${target}`, donor('H'), quote.variableUf[scenario].c))
        set('I', formulaCell(`I${target}`, donor('I'), `H${target}*$G$9`, totals.summary.variableC.clp))
        set('J', formulaCell(`J${target}`, donor('J'), `I${target}/$G$10`, totals.summary.variableC.usd))
        break
      case 35: // Total
        set('H', formulaCell(`H${target}`, donor('H'), `SUM(H${at(32)}:H${at(34)})`, totals.summary.total.uf))
        set('I', formulaCell(`I${target}`, donor('I'), `H${target}*$G$9`, totals.summary.total.clp))
        set('J', formulaCell(`J${target}`, donor('J'), `I${target}/$G$10`, totals.summary.total.usd))
        break
      case 37: { // VP
        const clp = sumOverItems('O')
        const usd = sumOverItems('N')
        set('I', clp
          ? formulaCell(`I${target}`, donor('I'), clp, totals.vp.clp)
          : numberCell(`I${target}`, donor('I'), 0))
        set('J', usd
          ? formulaCell(`J${target}`, donor('J'), usd, totals.vp.usd)
          : numberCell(`J${target}`, donor('J'), 0))
        break
      }
    }
    out.push(emitRow(target, tplRow.attrs, cells))
  }

  const head = tpl.head.replace(
    /<dimension ref="[^"]*"\/>/,
    `<dimension ref="A1:O${at(LAST_ROW)}"/>`,
  )
  return `${head}<sheetData>${out.join('')}</sheetData>${tpl.tail}`
}

function buildDatosSheet(xml: string, catalog: CatalogItem[]): string {
  const tpl = parseSheet(xml)
  const donorRow = tpl.rows.get(1)
  const donor = (col: string) => donorRow?.cells.get(col)
  const numericPnDonor = donor('A')
  const textPnDonor = tpl.rows.get(4)?.cells.get('A') ?? numericPnDonor

  const out = catalog.map((entry, index) => {
    const r = index + 1
    const cells = new Map<string, string>([
      ['A', /^\d+$/.test(entry.partNumber)
        ? numberCell(`A${r}`, numericPnDonor, Number(entry.partNumber))
        : textCell(`A${r}`, textPnDonor, entry.partNumber)],
      ['B', textCell(`B${r}`, donor('B'), entry.description)],
      ['C', numberCell(`C${r}`, donor('C'), entry.qty)],
      ['D', numberCell(`D${r}`, donor('D'), entry.priceList)],
      ['E', blankCell(`E${r}`, donor('E'))],
    ])
    return emitRow(r, donorRow?.attrs ?? '', cells)
  })

  const rows = Math.max(catalog.length, 1)
  const head = tpl.head.replace(
    /<dimension ref="[^"]*"\/>/,
    `<dimension ref="A1:E${rows}"/>`,
  )
  return `${head}<sheetData>${out.join('')}</sheetData>${tpl.tail}`
}

/**
 * Construye el .xlsx final a partir del zip de la plantilla.
 * Es una función pura para poder verificarla en los tests sin navegador.
 */
export function buildWorkbook(
  templateZip: Uint8Array,
  quote: Quote,
  catalog: CatalogItem[],
): Uint8Array {
  const files = unzipSync(templateZip)

  for (const scenario of ['inicial', 'final'] as ScenarioKey[]) {
    const path = SHEET_PATH[scenario]
    files[path] = strToU8(buildTcoSheet(strFromU8(files[path]), quote, scenario))
  }
  files[SHEET_PATH.datos] = strToU8(
    buildDatosSheet(strFromU8(files[SHEET_PATH.datos]), catalog),
  )

  return zipSync(files, { level: 6 })
}
