import { useState } from 'react'
import { QuoteList } from './components/QuoteList'
import { QuoteEditor } from './components/QuoteEditor'
import { CatalogPage } from './components/CatalogPage'
import { usePersistedState } from './hooks/usePersistedState'
import { CATALOG_SEED } from './data/catalog.seed'
import { emptyQuote, newId } from './data/quote'
import type { CatalogItem, Quote } from './types'

type Vista = 'cotizaciones' | 'catalogo'

export function App() {
  const [quotes, setQuotes] = usePersistedState<Quote[]>('quotes', [])
  const [catalog, setCatalog] = usePersistedState<CatalogItem[]>('catalog', CATALOG_SEED)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista>('cotizaciones')

  const quote = quotes.find((q) => q.id === abierta) ?? null

  function crear() {
    const nueva = emptyQuote(`Cotización ${quotes.length + 1}`)
    setQuotes([nueva, ...quotes])
    setAbierta(nueva.id)
  }

  function duplicar(id: string) {
    const origen = quotes.find((q) => q.id === id)
    if (!origen) return
    const ahora = new Date().toISOString()
    const copia: Quote = {
      ...structuredClone(origen),
      id: newId(),
      nombre: `${origen.nombre} (copia)`,
      createdAt: ahora,
      updatedAt: ahora,
    }
    copia.items = copia.items.map((item) => ({ ...item, id: newId() }))
    setQuotes([copia, ...quotes])
  }

  if (quote) {
    return (
      <main className="app">
        <QuoteEditor
          quote={quote}
          catalog={catalog}
          onBack={() => setAbierta(null)}
          onChange={(next) => setQuotes(quotes.map((q) => (q.id === next.id ? next : q)))}
        />
      </main>
    )
  }

  return (
    <main className="app screen-only">
      <header className="app-head">
        <div>
          <h1>Pricing &amp; TCO — Ricoh Chile</h1>
          <p className="app-sub">
            Cotizador basado en la planilla TCO. Los datos se guardan solo en este navegador.
          </p>
        </div>
        <nav className="tabs" aria-label="Sección">
          <button type="button" className={vista === 'cotizaciones' ? 'tab active' : 'tab'}
            aria-current={vista === 'cotizaciones'} onClick={() => setVista('cotizaciones')}>
            Cotizaciones
          </button>
          <button type="button" className={vista === 'catalogo' ? 'tab active' : 'tab'}
            aria-current={vista === 'catalogo'} onClick={() => setVista('catalogo')}>
            Catálogo
          </button>
        </nav>
      </header>

      {vista === 'cotizaciones' ? (
        <QuoteList
          quotes={quotes}
          onOpen={setAbierta}
          onCreate={crear}
          onDuplicate={duplicar}
          onRemove={(id) => setQuotes(quotes.filter((q) => q.id !== id))}
        />
      ) : (
        <CatalogPage catalog={catalog} onChange={setCatalog} />
      )}
    </main>
  )
}
