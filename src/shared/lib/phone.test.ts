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

  it('Kazakhstan: a local 7xx number without the country code', () => {
    expect(formatPhoneInput('7011234567', 'KZ')).toBe('+7 (701) 123-45-67')
    expect(formatPhoneInput('+7 701 123 45 67', 'KZ')).toBe('+7 (701) 123-45-67')
    expect(formatPhoneInput('87011234567', 'KZ')).toBe('+7 (701) 123-45-67')
  })

  it('Belarus: +375, 80… and a number without the code', () => {
    expect(formatPhoneInput('291234567', 'BY')).toBe('+375 (29) 123-45-67')
    expect(formatPhoneInput('80291234567', 'BY')).toBe('+375 (29) 123-45-67')
    expect(formatPhoneInput('+375 29 123 45 67', 'BY')).toBe('+375 (29) 123-45-67')
  })
})
