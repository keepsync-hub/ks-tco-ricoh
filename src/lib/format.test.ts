import { describe, expect, it } from 'vitest'
import { edit, parseNumber, pct, uf } from './format'

describe('parseNumber', () => {
  it('lee formato chileno', () => {
    expect(parseNumber('1.479')).toBe(1479)
    expect(parseNumber('1.479,50')).toBe(1479.5)
    expect(parseNumber('84.949.000')).toBe(84949000)
  })

  it('lee formato con punto decimal', () => {
    expect(parseNumber('0.55')).toBe(0.55)
    expect(parseNumber('1479.5')).toBe(1479.5)
    expect(parseNumber('1,479.5')).toBe(1479.5)
  })

  it('lee coma decimal', () => {
    expect(parseNumber('0,55')).toBe(0.55)
  })

  it('rechaza lo que no es número', () => {
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
  })
})

describe('formato de salida', () => {
  it('muestra el descuento como porcentaje', () => expect(pct(0.55)).toBe('55%'))
  it('muestra UF con cuatro decimales', () => expect(uf(70.3739939086294)).toContain('70,374'))
})

describe('ida y vuelta de los campos editables', () => {
  /**
   * Un campo numérico vuelve a leer el texto que muestra. Si el formateo pierde
   * decimales, abrir y cerrar el campo corrompe el dato en silencio: fue
   * exactamente lo que pasó con el Factor de Financiamiento (0,03264 -> 0,03).
   */
  it('conserva el valor tras formatear y volver a parsear', () => {
    for (const v of [0.03264, 39400, 1000, 1479, 0.55, 0.123456789, 70.3739939086294]) {
      expect(parseNumber(edit(v)), `valor ${v}`).toBe(v)
    }
  })
})
