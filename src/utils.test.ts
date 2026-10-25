import { describe, expect, it } from 'vitest'
import { add } from './utils'

describe('add', () => {
  it('sums two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('handles negative numbers', () => {
    expect(add(-1, 1)).toBe(0)
  })
})
