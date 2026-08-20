// Genera un .xlsx de muestra para verificarlo con herramientas externas.
//
//   npx vite-node scripts/emit-sample.mjs /ruta/muestra.xlsx
//
// Se usó para producir los valores esperados de src/lib/oracle.test.ts:
// el archivo resultante se recalcula con un motor de fórmulas de Excel
// (por ejemplo la librería `formulas` de Python) y esos números se fijan
// en el test. Si alguna vez cambian las fórmulas, hay que repetir el paso.
import { readFileSync, writeFileSync } from 'node:fs'
import { buildWorkbook } from '../src/export/xlsx.ts'
import { CATALOG_SEED } from '../src/data/catalog.seed.ts'
import { emptyQuote } from '../src/data/quote.ts'

const q = emptyQuote('Muestra')
q.header.cliente = 'CLIENTE'
q.header.consultorVentas = 'CRISTIAN MOLINA'
q.header.tdvMono = 2481
q.header.tdvColor = 784
q.items = [
  ['423509', 'IM 460F', 100, 1479, 0.55],
  ['423524', 'Unidad de interfaz IEEE 802.11a/b/g/n tipo M54', 9, 310, 0.4],
  ['1647/00', 'Cabinet', 100, 209, 0.2],
  ['RSS-2YR', 'software Smart Suite', 102, 63, 0.3],
  ['TS-SERVICE-HW', 'SDM', 36, 375, 0.1],
].map(([pn, d, qty, pl, disc], i) => ({
  id: 'i' + i, partNumber: pn, description: d, qty, priceList: pl,
  discount: { inicial: 0, final: disc },
}))
q.variableUf.final = { m: 12.5, c: 3.25 }

const tpl = new Uint8Array(readFileSync('src/assets/plantilla.xlsx'))
writeFileSync(process.argv[2], buildWorkbook(tpl, q, CATALOG_SEED))
console.log('escrito', process.argv[2])
