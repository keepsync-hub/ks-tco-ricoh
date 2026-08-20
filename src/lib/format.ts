const LOCALE = 'es-CL'

function fmt(value: number, min: number, max: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(value)
}

/** Pesos chilenos, sin decimales. */
export const clp = (v: number) => `$ ${fmt(v, 0, 0)}`
/** Dólares, dos decimales. */
export const usd = (v: number) => `US$ ${fmt(v, 2, 2)}`
/** UF, cuatro decimales — la planilla arrastra montos muy pequeños por unidad. */
export const uf = (v: number) => `${fmt(v, 4, 4)} UF`
/** Fracción a porcentaje legible: 0.55 -> "55%". */
export const pct = (v: number) => `${fmt(v * 100, 0, 2)}%`
/** Número suelto, hasta 2 decimales. Solo para mostrar, nunca para editar. */
export const num = (v: number) => fmt(v, 0, 2)

/**
 * Valor para un campo editable. Conserva todos los decimales que permite Intl
 * porque el campo vuelve a leer lo que muestra: con 2 decimales, abrir y cerrar
 * el campo del Factor de Financiamiento convertía 0,03264 en 0,03.
 */
export const edit = (v: number) => fmt(v, 0, 20)

/**
 * Interpreta un número escrito por una persona en Chile.
 *
 * Acepta "1.479", "1.479,50", "1479.5" y "1479,5". La ambigüedad real es un
 * punto solo: se lee como separador de miles cuando lo siguen exactamente tres
 * dígitos ("1.479" -> 1479) y como decimal en cualquier otro caso ("0.55").
 * Devuelve `null` si no hay un número reconocible.
 */
export function parseNumber(input: string): number | null {
  const raw = input.trim().replace(/\s/g, '')
  if (raw === '') return null

  let normalized: string
  const hasComma = raw.includes(',')
  const hasDot = raw.includes('.')

  if (hasComma && hasDot) {
    // El separador decimal es el que aparece más a la derecha.
    normalized = raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '')
  } else if (hasComma) {
    normalized = raw.replace(/,/g, '.')
  } else if (hasDot) {
    const isThousands = /^-?\d{1,3}(\.\d{3})+$/.test(raw)
    normalized = isThousands ? raw.replace(/\./g, '') : raw
  } else {
    normalized = raw
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}
