import { describe, expect, it, vi } from 'vitest'

vi.mock('../assets/plantilla.xlsx?url', () => ({ default: '/plantilla.xlsx' }))

const { nombreArchivo } = await import('./download')
const { emptyQuote } = await import('../data/quote')

describe('nombreArchivo', () => {
  it('usa el cliente y saca acentos y símbolos', () => {
    const q = emptyQuote('Borrador')
    q.header.cliente = 'Clínica Alemana & Cía.'
    expect(nombreArchivo(q)).toBe('TCO_Clinica_Alemana_Cia.xlsx')
  })

  it('cae al nombre de la cotización si no hay cliente', () => {
    expect(nombreArchivo(emptyQuote('Borrador 1'))).toBe('TCO_Borrador_1.xlsx')
  })
})
