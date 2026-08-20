import { NumberField, TextField } from './inputs'
import { PLACEHOLDER_TIPO_CAMBIO } from '../data/quote'
import type { Params, QuoteHeader, ScenarioKey } from '../types'

/**
 * Cabecera de la hoja (celdas C3:D19) y parámetros globales (G9, G10, G11).
 * La cabecera es común a los dos escenarios; los parámetros son por escenario.
 */

interface Props {
  header: QuoteHeader
  params: Params
  scenario: ScenarioKey
  onHeaderChange: (patch: Partial<QuoteHeader>) => void
  onParamsChange: (patch: Partial<Params>) => void
}

export function HeaderForm({ header, params, scenario, onHeaderChange, onParamsChange }: Props) {
  const set = <K extends keyof QuoteHeader>(key: K) =>
    (value: QuoteHeader[K]) => onHeaderChange({ [key]: value } as Partial<QuoteHeader>)

  return (
    <section className="card">
      <h2>Datos de la cotización</h2>
      <p className="hint">Comunes a los dos escenarios.</p>

      <div className="grid">
        <TextField
          label="Cliente" required value={header.cliente}
          onChange={set('cliente')} invalid={header.cliente.trim() === ''}
          placeholder="Nombre del cliente"
        />
        <TextField label="Consultor de Ventas" value={header.consultorVentas} onChange={set('consultorVentas')} />
        <TextField label="Solutions Specialist / Ing. de Soluciones" value={header.solutionsSpecialist} onChange={set('solutionsSpecialist')} />
        <TextField label="Fecha de confección" value={header.fechaConfeccion} onChange={set('fechaConfeccion')} placeholder="AAAA-MM-DD" />
        <TextField label="Versión actual" value={header.version} onChange={set('version')} />
        <TextField label="Fecha última actualización" value={header.fechaActualizacion} onChange={set('fechaActualizacion')} placeholder="AAAA-MM-DD" />
        <TextField label="Actualizado por" value={header.actualizadoPor} onChange={set('actualizadoPor')} />
        <TextField label="Plazo" value={header.plazo} onChange={set('plazo')} />
        <TextField label="Type of Contract" value={header.tipoContrato} onChange={set('tipoContrato')} />
        <TextField label="Pricing" value={header.pricing} onChange={set('pricing')} />
        <NumberField label="TDV Mensual (mínimo)/Máx. Mono" value={header.tdvMono} nullable onChange={(v) => onHeaderChange({ tdvMono: v })} />
        <NumberField label="TDV Mensual (mínimo)/Máx. Color" value={header.tdvColor} nullable onChange={(v) => onHeaderChange({ tdvColor: v })} />
        <TextField label="Approval Date" value={header.approvalDate} onChange={set('approvalDate')} />
        <TextField label="Implementation" value={header.implementation} onChange={set('implementation')} />
        <TextField label="Proposal Presentation" value={header.proposalPresentation} onChange={set('proposalPresentation')} />
        <TextField label="Service Required mono" value={header.serviceRequiredMono} onChange={set('serviceRequiredMono')} />
        <TextField label="Service Required Color" value={header.serviceRequiredColor} onChange={set('serviceRequiredColor')} />
      </div>

      <h2 className="mt">Parámetros de {scenario === 'inicial' ? 'TCO INICIAL' : 'TCO FINAL'}</h2>
      <p className="hint">Celdas G9, G10 y G11. Cada escenario tiene los suyos.</p>

      <div className="grid grid-3">
        <NumberField label="UF" value={params.uf} onChange={(v) => onParamsChange({ uf: v ?? 0 })} min={0} />
        <NumberField label="T/C (USD)" value={params.tipoCambio} onChange={(v) => onParamsChange({ tipoCambio: v ?? 0 })} min={0} />
        <NumberField label="Factor Financiamiento" value={params.factor} onChange={(v) => onParamsChange({ factor: v ?? 0 })} min={0} />
      </div>

      {params.tipoCambio === PLACEHOLDER_TIPO_CAMBIO && (
        <p className="warn">
          El T/C sigue en {PLACEHOLDER_TIPO_CAMBIO}, el valor de referencia que trae la
          plantilla. Como el cuadro resumen convierte a dólares dividiendo por este número,
          la columna USD no representa dólares reales hasta que lo reemplaces por el tipo de
          cambio vigente.
        </p>
      )}
      {params.uf <= 0 && <p className="warn">La UF debe ser mayor que cero: con UF en 0 el Cargo Fijo no se puede calcular.</p>}
    </section>
  )
}
