import { NumberField } from './inputs'
import { clp, uf, usd } from '../lib/format'
import type { ScenarioTotals, VariableUf } from '../types'

/**
 * Cuadro resumen de la planilla (filas 25-37): totales de la tabla, apertura en
 * Cargo Fijo / Variable M / Variable C, y VP.
 */

interface Props {
  totals: ScenarioTotals
  variable: VariableUf
  onVariableChange: (patch: Partial<VariableUf>) => void
}

export function SummaryCard({ totals, variable, onVariableChange }: Props) {
  const { summary } = totals

  return (
    <section className="card">
      <h2>Resumen</h2>

      <div className="totals">
        <div className="total">
          <span className="total-label">TOTAL UF</span>
          <span className="total-value">{uf(totals.totalUf)}</span>
        </div>
        <div className="total">
          <span className="total-label">TOTAL CLP</span>
          <span className="total-value">{clp(totals.totalClp)}</span>
        </div>
        <div className="total">
          <span className="total-label">TOTAL DRS</span>
          <span className="total-value">{usd(totals.totalDrs)}</span>
        </div>
      </div>

      <div className="table-scroll">
        <table className="summary">
          <thead>
            <tr>
              <th />
              <th className="right">U.F.</th>
              <th className="right">CL$</th>
              <th className="right">USD</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Cargo Fijo</th>
              <td className="right calc">{uf(summary.cargoFijo.uf)}</td>
              <td className="right calc">{clp(summary.cargoFijo.clp)}</td>
              <td className="right calc">{usd(summary.cargoFijo.usd)}</td>
            </tr>
            <tr>
              <th scope="row">Variable M</th>
              <td className="right">
                <NumberField ariaLabel="Variable M en UF" value={variable.m} min={0}
                  onChange={(v) => onVariableChange({ m: v ?? 0 })} />
              </td>
              <td className="right calc">{clp(summary.variableM.clp)}</td>
              <td className="right calc">{usd(summary.variableM.usd)}</td>
            </tr>
            <tr>
              <th scope="row">Variable C</th>
              <td className="right">
                <NumberField ariaLabel="Variable C en UF" value={variable.c} min={0}
                  onChange={(v) => onVariableChange({ c: v ?? 0 })} />
              </td>
              <td className="right calc">{clp(summary.variableC.clp)}</td>
              <td className="right calc">{usd(summary.variableC.usd)}</td>
            </tr>
            <tr className="strong">
              <th scope="row">Total</th>
              <td className="right calc">{uf(summary.total.uf)}</td>
              <td className="right calc">{clp(summary.total.clp)}</td>
              <td className="right calc">{usd(summary.total.usd)}</td>
            </tr>
            <tr className="strong">
              <th scope="row">VP</th>
              <td className="right">—</td>
              <td className="right calc">{clp(totals.vp.clp)}</td>
              <td className="right calc">{usd(totals.vp.usd)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="hint">
        Cargo Fijo sale de la tabla de ítems. Variable M y Variable C se ingresan en UF,
        igual que en la planilla. VP es la suma de los totales de la tabla.
      </p>
    </section>
  )
}
