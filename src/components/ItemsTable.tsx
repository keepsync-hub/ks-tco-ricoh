import { useState } from 'react'
import { NumberField, PercentField } from './inputs'
import { clp, num, uf, usd } from '../lib/format'
import { discountForTargetCfTotal } from '../lib/solve'
import type { ComputedRow, LineItem, Params, ScenarioKey } from '../types'

/**
 * Tabla de ítems (columnas C a O de la planilla).
 *
 * Solo C, D, E, F y H son editables; el resto son columnas calculadas y se
 * muestran como texto. Al agregar una fila las fórmulas van incluidas por
 * construcción, así que no existe la fila "sin fórmula" de la planilla.
 */

interface Props {
  rows: ComputedRow[]
  scenario: ScenarioKey
  params: Params
  onChangeItem: (id: string, patch: Partial<LineItem>) => void
  onChangeDiscount: (id: string, discount: number) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
}

export function ItemsTable({
  rows, scenario, params, onChangeItem, onChangeDiscount, onRemove, onDuplicate, onMove,
}: Props) {
  const [solving, setSolving] = useState<string | null>(null)

  if (rows.length === 0) {
    return <p className="empty">Sin productos. Agrega uno desde el catálogo o crea una fila en blanco.</p>
  }

  return (
    <div className="table-scroll">
      <table className="items">
        <thead>
          <tr>
            <th className="col-actions" />
            <th>Part Number</th>
            <th>Description</th>
            <th className="right">Qty</th>
            <th className="right">Price List</th>
            <th className="right">Descuento</th>
            <th className="right calc">Precio c/ Descuento</th>
            <th className="right calc">Cargo Fijo Unit</th>
            <th className="right calc">CFTotal</th>
            <th className="right calc">Total en USD</th>
            <th className="right calc">Total en CL$</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const item = row.item
            return (
              <tr key={item.id}>
                <td className="col-actions">
                  <div className="row-actions">
                    <button type="button" className="icon" title="Subir" aria-label={`Subir ${item.partNumber}`}
                      disabled={index === 0} onClick={() => onMove(item.id, -1)}>↑</button>
                    <button type="button" className="icon" title="Bajar" aria-label={`Bajar ${item.partNumber}`}
                      disabled={index === rows.length - 1} onClick={() => onMove(item.id, 1)}>↓</button>
                    <button type="button" className="icon" title="Duplicar" aria-label={`Duplicar ${item.partNumber}`}
                      onClick={() => onDuplicate(item.id)}>⧉</button>
                    <button type="button" className="icon danger" title="Eliminar" aria-label={`Eliminar ${item.partNumber}`}
                      onClick={() => onRemove(item.id)}>×</button>
                  </div>
                </td>
                <td>
                  <input type="text" aria-label="Part Number" value={item.partNumber}
                    onChange={(e) => onChangeItem(item.id, { partNumber: e.target.value })} />
                </td>
                <td>
                  <input type="text" aria-label="Description" value={item.description}
                    onChange={(e) => onChangeItem(item.id, { description: e.target.value })} />
                </td>
                <td className="right">
                  <NumberField ariaLabel="Qty" value={item.qty} min={0}
                    onChange={(v) => onChangeItem(item.id, { qty: v ?? 0 })} />
                </td>
                <td className="right">
                  <NumberField ariaLabel="Price List" value={item.priceList} min={0}
                    onChange={(v) => onChangeItem(item.id, { priceList: v ?? 0 })} />
                </td>
                <td className="right">
                  <div className="discount-cell">
                    <PercentField ariaLabel="Descuento aplicado"
                      value={item.discount[scenario] ?? 0}
                      onChange={(v) => onChangeDiscount(item.id, v)} />
                    <button type="button" className="link" title="Calcular el descuento a partir de un CFTotal objetivo"
                      onClick={() => setSolving(solving === item.id ? null : item.id)}>
                      objetivo
                    </button>
                  </div>
                  {solving === item.id && (
                    <TargetSolver
                      item={item}
                      params={params}
                      onApply={(discount) => { onChangeDiscount(item.id, discount); setSolving(null) }}
                      onCancel={() => setSolving(null)}
                    />
                  )}
                </td>
                <td className="right calc">{usd(row.precioConDescuento)}</td>
                <td className="right calc">{uf(row.cargoFijoUnit)}</td>
                <td className="right calc">{uf(row.cfTotal)}</td>
                <td className="right calc">{usd(row.totalUsd)}</td>
                <td className="right calc">{clp(row.totalClp)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Resuelve qué descuento hace falta para llegar a un CFTotal objetivo en UF. */
function TargetSolver({
  item, params, onApply, onCancel,
}: {
  item: LineItem
  params: Params
  onApply: (discount: number) => void
  onCancel: () => void
}) {
  const [target, setTarget] = useState<number | null>(null)
  const solved = target == null
    ? null
    : discountForTargetCfTotal(target, item.priceList, item.qty, params)

  return (
    <div className="solver">
      <NumberField label="CFTotal objetivo (UF)" value={target} nullable onChange={setTarget} min={0} />
      {target != null && solved == null && (
        <p className="warn small">
          No hay un descuento entre 0 % y 100 % que llegue a ese CFTotal con esta cantidad
          y precio de lista.
        </p>
      )}
      {solved != null && (
        <p className="small">
          Descuento necesario: <strong>{num(solved * 100)} %</strong>
        </p>
      )}
      <div className="solver-actions">
        <button type="button" disabled={solved == null} onClick={() => solved != null && onApply(solved)}>
          Aplicar
        </button>
        <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}
