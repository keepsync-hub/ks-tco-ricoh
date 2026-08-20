import { computeScenario } from '../lib/calc'
import { clp, uf } from '../lib/format'
import type { Quote } from '../types'

interface Props {
  quotes: Quote[]
  onOpen: (id: string) => void
  onCreate: () => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
}

function fecha(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL')
}

export function QuoteList({ quotes, onOpen, onCreate, onDuplicate, onRemove }: Props) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>Cotizaciones</h2>
        <button type="button" onClick={onCreate}>Nueva cotización</button>
      </div>

      {quotes.length === 0 ? (
        <p className="empty">
          Todavía no hay cotizaciones. Crea la primera y agrégale productos desde el catálogo.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="items">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cliente</th>
                <th className="right">Ítems</th>
                <th className="right">TOTAL UF (final)</th>
                <th className="right">VP CL$ (final)</th>
                <th>Actualizada</th>
                <th className="col-actions" />
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const totals = computeScenario(quote, 'final')
                return (
                  <tr key={quote.id}>
                    <td>
                      <button type="button" className="link strong" onClick={() => onOpen(quote.id)}>
                        {quote.nombre || 'Sin nombre'}
                      </button>
                    </td>
                    <td>{quote.header.cliente || <span className="muted">Falta el cliente</span>}</td>
                    <td className="right">{quote.items.length}</td>
                    <td className="right calc">{uf(totals.totalUf)}</td>
                    <td className="right calc">{clp(totals.vp.clp)}</td>
                    <td>{fecha(quote.updatedAt)}</td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <button type="button" className="icon" title="Duplicar"
                          aria-label={`Duplicar ${quote.nombre}`}
                          onClick={() => onDuplicate(quote.id)}>⧉</button>
                        <button type="button" className="icon danger" title="Eliminar"
                          aria-label={`Eliminar ${quote.nombre}`}
                          onClick={() => {
                            if (confirm(`¿Eliminar “${quote.nombre}”? No se puede deshacer.`)) {
                              onRemove(quote.id)
                            }
                          }}>×</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
