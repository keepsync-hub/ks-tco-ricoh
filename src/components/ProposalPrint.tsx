import { clp, edit, pct, uf, usd } from '../lib/format'
import { SCENARIO_LABEL } from '../types'
import type { Quote, ScenarioKey, ScenarioTotals } from '../types'

/**
 * Propuesta imprimible. Es la fuente del PDF: el navegador la exporta con
 * "Guardar como PDF", así que lo que se ve en pantalla es exactamente lo que
 * sale impreso. Las reglas de @media print viven en src/print.css.
 */

interface Props {
  quote: Quote
  scenario: ScenarioKey
  totals: ScenarioTotals
}

export function ProposalPrint({ quote, scenario, totals }: Props) {
  const { header } = quote
  const campos: Array<[string, string]> = [
    ['Cliente', header.cliente || '—'],
    ['Consultor de Ventas', header.consultorVentas || '—'],
    ['Plazo', header.plazo || '—'],
    ['Type of Contract', header.tipoContrato || '—'],
    ['Versión', header.version || '—'],
    ['Fecha', header.fechaActualizacion || header.fechaConfeccion || '—'],
  ]

  return (
    <div className="proposal" id="proposal">
      <header className="proposal-head">
        <div>
          <h1>Propuesta Pricing &amp; TCO</h1>
          <p className="proposal-sub">Ricoh Chile — {SCENARIO_LABEL[scenario]}</p>
        </div>
        <dl className="proposal-meta">
          {campos.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <table className="proposal-table">
        <thead>
          <tr>
            <th>Part Number</th>
            <th>Descripción</th>
            <th className="right">Qty</th>
            <th className="right">Price List</th>
            <th className="right">Desc.</th>
            <th className="right">Precio final</th>
            <th className="right">Total USD</th>
            <th className="right">Total CL$</th>
          </tr>
        </thead>
        <tbody>
          {totals.rows.map((row) => (
            <tr key={row.item.id}>
              <td>{row.item.partNumber}</td>
              <td>{row.item.description}</td>
              <td className="right">{row.item.qty}</td>
              <td className="right">{usd(row.item.priceList)}</td>
              <td className="right">{pct(row.item.discount[scenario] ?? 0)}</td>
              <td className="right">{usd(row.precioConDescuento)}</td>
              <td className="right">{usd(row.totalUsd)}</td>
              <td className="right">{clp(row.totalClp)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={6} className="right">Valor Presupuesto (VP)</th>
            <th className="right">{usd(totals.vp.usd)}</th>
            <th className="right">{clp(totals.vp.clp)}</th>
          </tr>
        </tfoot>
      </table>

      <table className="proposal-table summary-print">
        <thead>
          <tr>
            <th>Resumen mensual</th>
            <th className="right">U.F.</th>
            <th className="right">CL$</th>
            <th className="right">USD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cargo Fijo</td>
            <td className="right">{uf(totals.summary.cargoFijo.uf)}</td>
            <td className="right">{clp(totals.summary.cargoFijo.clp)}</td>
            <td className="right">{usd(totals.summary.cargoFijo.usd)}</td>
          </tr>
          <tr>
            <td>Variable M</td>
            <td className="right">{uf(totals.summary.variableM.uf)}</td>
            <td className="right">{clp(totals.summary.variableM.clp)}</td>
            <td className="right">{usd(totals.summary.variableM.usd)}</td>
          </tr>
          <tr>
            <td>Variable C</td>
            <td className="right">{uf(totals.summary.variableC.uf)}</td>
            <td className="right">{clp(totals.summary.variableC.clp)}</td>
            <td className="right">{usd(totals.summary.variableC.usd)}</td>
          </tr>
          <tr className="strong">
            <td>Total</td>
            <td className="right">{uf(totals.summary.total.uf)}</td>
            <td className="right">{clp(totals.summary.total.clp)}</td>
            <td className="right">{usd(totals.summary.total.usd)}</td>
          </tr>
        </tbody>
      </table>

      <footer className="proposal-foot">
        <p>
          Valores calculados con UF {clp(quote.params[scenario].uf)}, T/C{' '}
          {clp(quote.params[scenario].tipoCambio)} y Factor de Financiamiento{' '}
          {edit(quote.params[scenario].factor)}.
        </p>
        <p>Documento generado desde la herramienta de Pricing &amp; TCO. Valores referenciales, sujetos a aprobación.</p>
      </footer>
    </div>
  )
}
