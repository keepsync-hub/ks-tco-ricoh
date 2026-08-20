import { useMemo, useState } from 'react'
import { usd } from '../lib/format'
import type { CatalogItem } from '../types'

/**
 * Buscador del catálogo (hoja DATOS). Se agrega el producto desde acá en vez de
 * tipear el part number a mano, que es la otra fuente habitual de errores.
 */

interface Props {
  catalog: CatalogItem[]
  onPick: (entry: CatalogItem) => void
  onClose: () => void
}

export function CatalogPicker({ catalog, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((entry) =>
      entry.partNumber.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q))
  }, [catalog, query])

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Agregar producto del catálogo"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>Agregar del catálogo</h2>
          <button type="button" className="icon" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <input
          autoFocus
          type="search"
          className="search"
          placeholder="Buscar por part number o descripción…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'Enter' && results.length > 0) onPick(results[0])
          }}
        />

        <div className="modal-body">
          {results.length === 0 && <p className="empty">Sin resultados para “{query}”.</p>}
          <ul className="picker-list">
            {results.map((entry) => (
              <li key={entry.id}>
                <button type="button" onClick={() => onPick(entry)}>
                  <span className="pn">{entry.partNumber}</span>
                  <span className="desc">{entry.description}</span>
                  <span className="price">{usd(entry.priceList)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="hint">Enter agrega el primer resultado. Esc cierra.</p>
      </div>
    </div>
  )
}
