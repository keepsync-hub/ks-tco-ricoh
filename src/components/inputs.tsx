import { useEffect, useState } from 'react'
import { edit, parseNumber } from '../lib/format'

/**
 * Campos de entrada compartidos.
 *
 * Los numéricos guardan el texto mientras se escribe y solo confirman el valor
 * al salir del campo o al presionar Enter: así se puede borrar y reescribir un
 * número sin que el estado salte a 0 en cada tecla.
 */

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  invalid?: boolean
}

export function TextField({ label, value, onChange, placeholder, required, invalid }: TextFieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="req" title="Obligatorio"> *</span>}
      </span>
      <input
        type="text"
        className={invalid ? 'invalid' : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

interface NumberFieldProps {
  label?: string
  value: number | null
  onChange: (value: number | null) => void
  /** Permite dejar el campo vacío (null) en vez de forzar 0. */
  nullable?: boolean
  min?: number
  max?: number
  suffix?: string
  ariaLabel?: string
}

export function NumberField({
  label, value, onChange, nullable, min, max, suffix, ariaLabel,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(() => (value == null ? '' : edit(value)))
  const [focused, setFocused] = useState(false)

  // Mientras el campo no esté enfocado, refleja el valor real del estado.
  useEffect(() => {
    if (!focused) setDraft(value == null ? '' : edit(value))
  }, [value, focused])

  function commit() {
    setFocused(false)
    const parsed = parseNumber(draft)
    if (parsed == null) {
      onChange(nullable ? null : 0)
      return
    }
    let next = parsed
    if (min != null) next = Math.max(min, next)
    if (max != null) next = Math.min(max, next)
    onChange(next)
  }

  const input = (
    <span className="numwrap">
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel ?? label}
        value={draft}
        onFocus={(e) => { setFocused(true); e.target.select() }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </span>
  )

  if (!label) return input
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {input}
    </label>
  )
}

/**
 * Descuento. Se muestra y se escribe en porcentaje (55) pero se guarda como
 * fracción (0.55), que es lo que espera la fórmula de la planilla. Esta
 * conversión es la que evita el error clásico de la hoja de cálculo.
 */
export function PercentField({
  value, onChange, ariaLabel,
}: {
  value: number
  onChange: (value: number) => void
  ariaLabel?: string
}) {
  return (
    <NumberField
      value={value * 100}
      onChange={(v) => onChange((v ?? 0) / 100)}
      min={0}
      max={100}
      suffix="%"
      ariaLabel={ariaLabel}
    />
  )
}
