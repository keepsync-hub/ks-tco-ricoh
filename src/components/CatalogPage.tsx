import { NumberField } from './inputs'
import { CATALOG_SEED } from '../data/catalog.seed'
import { newId } from '../data/quote'
import type { CatalogItem } from '../types'

/**
 * Catálogo maestro (hoja DATOS). Es editable y se guarda en el navegador; el
 * botón de restaurar vuelve a los 16 productos que trae la planilla.
 */

interface Props {
  catalog: CatalogItem[]
  onChange: (next: CatalogItem[]) => void
}

export function CatalogPage({ catalog, onChange }: Props) {
  function patch(id: string, cambio: Partial<CatalogItem>) {
    onChange(catalog.map((entry) => (entry.id === id ? { ...entry, ...cambio } : entry)))
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Catálogo de productos</h2>
        <div className="card-actions">
          <button type="button" onClick={() => onChange([
            ...catalog,
            { id: newId(), partNumber: '', description: '', qty: 1, priceList: 0 },
          ])}>
            Agregar producto
          </button>
          <button type="button" className="ghost" onClick={() => {
            if (confirm('¿Restaurar el catálogo original de la planilla? Se pierden los cambios locales.')) {
              onChange(CATALOG_SEED.map((entry) => ({ ...entry })))
            }
          }}>
            Restaurar original
          </button>
        </div>
      </div>
      <p className="hint">
        Corresponde a la hoja DATOS. Qty es la cantidad sugerida que se precarga al agregar
        el producto a una cotización.
      </p>

      <div className="table-scroll">
        <table className="items">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Descripción</th>
              <th className="right">Qty sugerida</th>
              <th className="right">Price List (USD)</th>
              <th className="col-actions" />
            </tr>
          </thead>
          <tbody>
            {catalog.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <input type="text" aria-label="Part Number" value={entry.partNumber}
                    onChange={(e) => patch(entry.id, { partNumber: e.target.value })} />
                </td>
                <td>
                  <input type="text" aria-label="Descripción" value={entry.description}
                    onChange={(e) => patch(entry.id, { description: e.target.value })} />
                </td>
                <td className="right">
                  <NumberField ariaLabel="Qty sugerida" value={entry.qty} min={0}
                    onChange={(v) => patch(entry.id, { qty: v ?? 0 })} />
                </td>
                <td className="right">
                  <NumberField ariaLabel="Price List" value={entry.priceList} min={0}
                    onChange={(v) => patch(entry.id, { priceList: v ?? 0 })} />
                </td>
                <td className="col-actions">
                  <button type="button" className="icon danger" title="Eliminar"
                    aria-label={`Eliminar ${entry.partNumber}`}
                    onClick={() => onChange(catalog.filter((x) => x.id !== entry.id))}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
