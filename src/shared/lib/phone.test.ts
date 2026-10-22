import { describe, expect, it } from 'vitest'
import { formatPhoneInput } from './phone'

describe('formatPhoneInput', () => {
  it('formats as the user types and accepts 8 / 7 / 9 starts', () => {
    expect(formatPhoneInput('8')).toBe('+7')
    expect(formatPhoneInput('8999')).toBe('+7 (999)')
    expect(formatPhoneInput('89991234567')).toBe('+7 (999) 123-45-67')
    expect(formatPhoneInput('+7 999 123 45 67')).toBe('+7 (999) 123-45-67')
    expect(formatPhoneInput('9991234567')).toBe('+7 (999) 123-45-67')
    expect(formatPhoneInput('+7 (999) 123-45-6789')).toBe('+7 (999) 123-45-67')
    expect(formatPhoneInput('')).toBe('')
  })
})
