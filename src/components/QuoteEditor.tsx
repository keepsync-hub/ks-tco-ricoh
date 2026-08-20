import { useMemo, useState } from 'react'
import { HeaderForm } from './HeaderForm'
import { ItemsTable } from './ItemsTable'
import { SummaryCard } from './SummaryCard'
import { CatalogPicker } from './CatalogPicker'
import { ProposalPrint } from './ProposalPrint'
import { computeScenario } from '../lib/calc'
import { clp, uf, usd } from '../lib/format'
import { downloadQuoteXlsx } from '../export/download'
import { blankItem, itemFromCatalog, newId } from '../data/quote'
import { SCENARIOS, SCENARIO_LABEL } from '../types'
import type { CatalogItem, LineItem, Params, Quote, QuoteHeader, ScenarioKey, VariableUf } from '../types'

interface Props {
  quote: Quote
  catalog: CatalogItem[]
  onChange: (next: Quote) => void
  onBack: () => void
}

export function QuoteEditor({ quote, catalog, onChange, onBack }: Props) {
  const [scenario, setScenario] = useState<ScenarioKey>('final')
  const [picking, setPicking] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const totals = useMemo(() => computeScenario(quote, scenario), [quote, scenario])

  /** Toda edición pasa por acá, para no olvidar `updatedAt`. */
  function update(patch: Partial<Quote>) {
    onChange({ ...quote, ...patch, updatedAt: new Date().toISOString() })
  }

  function updateItems(next: LineItem[]) {
    update({ items: next })
  }

  const clienteFaltante = quote.header.cliente.trim() === ''

  async function exportXlsx() {
    setExportError(null)
    setExporting(true)
    try {
      await downloadQuoteXlsx(quote, catalog)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'No se pudo generar el archivo.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="editor">
      <div className="screen-only">
        <header className="toolbar">
          <button type="button" className="ghost" onClick={onBack}>← Cotizaciones</button>
          <input
            className="quote-name"
            aria-label="Nombre de la cotización"
            value={quote.nombre}
            onChange={(e) => update({ nombre: e.target.value })}
          />
          <div className="spacer" />
          <button type="button" onClick={exportXlsx} disabled={clienteFaltante || exporting}>
            {exporting ? 'Generando…' : 'Exportar Excel'}
          </button>
          <button type="button" onClick={() => window.print()} disabled={clienteFaltante}>
            Propuesta PDF
          </button>
        </header>

        {clienteFaltante && (
          <p className="warn">
            Falta el nombre del cliente. Es obligatorio en la planilla, así que las
            exportaciones quedan bloqueadas hasta completarlo.
          </p>
        )}
        {exportError && <p className="warn">{exportError}</p>}

        <nav className="tabs" aria-label="Escenario">
          {SCENARIOS.map((key) => (
            <button
              key={key}
              type="button"
              className={key === scenario ? 'tab active' : 'tab'}
              aria-current={key === scenario}
              onClick={() => setScenario(key)}
            >
              {SCENARIO_LABEL[key]}
            </button>
          ))}
        </nav>

        <HeaderForm
          header={quote.header}
          params={quote.params[scenario]}
          scenario={scenario}
          onHeaderChange={(patch: Partial<QuoteHeader>) =>
            update({ header: { ...quote.header, ...patch } })}
          onParamsChange={(patch: Partial<Params>) =>
            update({ params: { ...quote.params, [scenario]: { ...quote.params[scenario], ...patch } } })}
        />

        <section className="card">
          <div className="card-head">
            <h2>Productos</h2>
            <div className="card-actions">
              <button type="button" onClick={() => setPicking(true)}>Agregar del catálogo</button>
              <button type="button" className="ghost" onClick={() => updateItems([...quote.items, blankItem()])}>
                Fila en blanco
              </button>
            </div>
          </div>
          <p className="hint">
            Los descuentos son propios de cada escenario; el resto de los datos se comparte
            entre TCO INICIAL y TCO FINAL.
          </p>

          <ItemsTable
            rows={totals.rows}
            scenario={scenario}
            params={quote.params[scenario]}
            onChangeItem={(id, patch) =>
              updateItems(quote.items.map((it) => (it.id === id ? { ...it, ...patch } : it)))}
            onChangeDiscount={(id, discount) =>
              updateItems(quote.items.map((it) =>
                it.id === id ? { ...it, discount: { ...it.discount, [scenario]: discount } } : it))}
            onRemove={(id) => updateItems(quote.items.filter((it) => it.id !== id))}
            onDuplicate={(id) => {
              const index = quote.items.findIndex((it) => it.id === id)
              if (index < 0) return
              const copia: LineItem = {
                ...quote.items[index],
                id: newId(),
                discount: { ...quote.items[index].discount },
              }
              const next = [...quote.items]
              next.splice(index + 1, 0, copia)
              updateItems(next)
            }}
            onMove={(id, direction) => {
              const index = quote.items.findIndex((it) => it.id === id)
              const target = index + direction
              if (index < 0 || target < 0 || target >= quote.items.length) return
              const next = [...quote.items]
              ;[next[index], next[target]] = [next[target], next[index]]
              updateItems(next)
            }}
          />
        </section>

        <SummaryCard
          totals={totals}
          variable={quote.variableUf[scenario]}
          onVariableChange={(patch: Partial<VariableUf>) =>
            update({
              variableUf: {
                ...quote.variableUf,
                [scenario]: { ...quote.variableUf[scenario], ...patch },
              },
            })}
        />

        <div className="sticky-totals" role="status" aria-live="polite">
          <span><strong>{SCENARIO_LABEL[scenario]}</strong></span>
          <span>TOTAL UF <strong>{uf(totals.totalUf)}</strong></span>
          <span>TOTAL CLP <strong>{clp(totals.totalClp)}</strong></span>
          <span>TOTAL DRS <strong>{usd(totals.totalDrs)}</strong></span>
          <span>VP <strong>{clp(totals.vp.clp)}</strong></span>
        </div>

        {picking && (
          <CatalogPicker
            catalog={catalog}
            onClose={() => setPicking(false)}
            onPick={(entry) => {
              updateItems([...quote.items, itemFromCatalog(entry)])
              setPicking(false)
            }}
          />
        )}
      </div>

      <ProposalPrint quote={quote} scenario={scenario} totals={totals} />
    </div>
  )
}
